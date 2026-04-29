import { ensureSchema, getSql } from "./db";
import {
  canDeletePin,
  calculateOnlineParticipants,
  canMutateRoom,
  normalizeAuthorName,
  normalizeClientId,
  normalizeComment,
  normalizePinUpdate,
  normalizePlace,
  normalizeRoomName,
  type PlaceInput,
  type PinUpdateInput,
} from "./domain";
import { badRequest, forbidden, notFound } from "./errors";
import { createPublicId } from "./ids";
import type { Participant, Pin, PinComment, RoomAccessMode, RoomEvent, RoomState, RoomSummary } from "./types";

type Row = Record<string, unknown>;
type CreatedRoom = RoomSummary & { editKey: string; readKey: string };
type RoomAccess = { room: Row; accessMode: RoomAccessMode };

export async function createRoom(rawName: unknown): Promise<CreatedRoom> {
  await ensureSchema();

  const id = createPublicId("room");
  const name = normalizeRoomName(rawName);
  const editKey = createPublicId("edit");
  const readKey = createPublicId("read");
  const [room] = await getSql()`
    INSERT INTO rooms (id, name, edit_key, read_key, expires_at)
    VALUES (${id}, ${name}, ${editKey}, ${readKey}, NOW() + INTERVAL '30 days')
    RETURNING id, name, created_at, expires_at
  `;

  return { ...mapRoom(room), editKey, readKey };
}

export async function getRoomState(
  roomId: string,
  viewerClientIdInput?: string | null,
  editKeyInput?: string | null,
  readKeyInput?: string | null,
): Promise<RoomState> {
  await ensureSchema();
  const viewerClientId = typeof viewerClientIdInput === "string" ? viewerClientIdInput.trim() : "";
  const { room, accessMode } = await getRoomAccess(roomId, editKeyInput, readKeyInput);

  const pins = await getSql()`
    SELECT id, kakao_place_id, name, address, lat, lng, category, status, note, price_level, created_by_client_id, created_at, deleted_at
    FROM pins
    WHERE room_id = ${roomId}
      AND deleted_at IS NULL
    ORDER BY created_at DESC
  `;

  const comments = await getSql()`
    SELECT comments.id, comments.pin_id, comments.client_id, comments.author_name, comments.content, comments.created_at
    FROM comments
    INNER JOIN pins ON pins.id = comments.pin_id
    WHERE pins.room_id = ${roomId}
      AND pins.deleted_at IS NULL
    ORDER BY comments.created_at ASC
  `;

  const likes = await getSql()`
    SELECT pin_likes.pin_id, pin_likes.client_id
    FROM pin_likes
    INNER JOIN pins ON pins.id = pin_likes.pin_id
    WHERE pins.room_id = ${roomId}
      AND pins.deleted_at IS NULL
  `;

  const participants = await getSql()`
    SELECT client_id, author_name, color, last_seen_at
    FROM room_participants
    WHERE room_id = ${roomId}
    ORDER BY last_seen_at DESC
  `;

  const events = await getSql()`
    SELECT id, type, pin_id, actor_name, created_at
    FROM room_events
    WHERE room_id = ${roomId}
    ORDER BY id DESC
    LIMIT 12
  `;

  const mappedParticipants = participants.map(mapParticipant);

  return {
    room: mapRoom(room),
    accessMode,
    readOnly: !canMutateRoom(accessMode),
    pins: pins.map((pin) => mapPin(pin, comments, likes, viewerClientId)),
    participants: mappedParticipants,
    onlineParticipants: calculateOnlineParticipants(mappedParticipants),
    events: events.map(mapEvent).sort((a, b) => a.id - b.id),
  };
}

export async function addPin(
  roomId: string,
  clientIdInput: unknown,
  placeInput: PlaceInput,
  editKeyInput?: unknown,
  authorNameInput?: unknown,
): Promise<Pin> {
  await ensureSchema();
  await assertCanEditRoom(roomId, editKeyInput);

  const id = createPublicId("pin");
  const clientId = normalizeClientId(clientIdInput);
  const authorName = normalizeAuthorName(authorNameInput);
  const place = normalizePlace(placeInput);
  if (place.kakaoPlaceId) {
    const [duplicate] = await getSql()`
      SELECT id
      FROM pins
      WHERE room_id = ${roomId}
        AND kakao_place_id = ${place.kakaoPlaceId}
        AND deleted_at IS NULL
    `;
    if (duplicate) {
      throw forbidden("이미 후보에 추가된 장소입니다.");
    }
  }

  let pin: Row | undefined;
  try {
    [pin] = await getSql()`
      INSERT INTO pins (id, room_id, kakao_place_id, name, address, lat, lng, category, created_by_client_id)
      VALUES (${id}, ${roomId}, ${place.kakaoPlaceId}, ${place.name}, ${place.address}, ${place.lat}, ${place.lng}, ${place.category}, ${clientId})
      RETURNING id, kakao_place_id, name, address, lat, lng, category, status, note, price_level, created_by_client_id, created_at, deleted_at
    `;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw badRequest("이미 후보에 추가된 장소입니다.");
    }

    throw error;
  }
  if (!pin) {
    throw badRequest("핀을 추가하지 못했습니다.");
  }
  await createRoomEvent(roomId, id, "pin_added", authorName);

  return mapPin(pin, [], [], clientId);
}

export async function deletePin(
  roomId: string,
  pinId: string,
  clientIdInput: unknown,
  editKeyInput?: unknown,
  authorNameInput?: unknown,
): Promise<void> {
  await ensureSchema();
  await assertCanEditRoom(roomId, editKeyInput);

  const clientId = normalizeClientId(clientIdInput);
  const authorName = normalizeAuthorName(authorNameInput);
  const [pin] = await getSql()`
    SELECT created_by_client_id
    FROM pins
    WHERE id = ${pinId} AND room_id = ${roomId} AND deleted_at IS NULL
  `;

  if (!pin) {
    throw notFound("핀을 찾을 수 없습니다.");
  }

  if (!canDeletePin(String(pin.created_by_client_id), clientId)) {
    throw forbidden("직접 추가한 핀만 삭제할 수 있습니다.");
  }

  await getSql()`
    UPDATE pins
    SET deleted_at = NOW(), deleted_by_client_id = ${clientId}
    WHERE id = ${pinId} AND room_id = ${roomId}
  `;
  await createRoomEvent(roomId, pinId, "pin_deleted", authorName);
}

export async function restorePin(
  roomId: string,
  pinId: string,
  clientIdInput: unknown,
  editKeyInput?: unknown,
  authorNameInput?: unknown,
): Promise<void> {
  await ensureSchema();
  await assertCanEditRoom(roomId, editKeyInput);

  const clientId = normalizeClientId(clientIdInput);
  const authorName = normalizeAuthorName(authorNameInput);
  let restored: Row[] = [];
  try {
    restored = await getSql()`
      UPDATE pins
      SET deleted_at = NULL, deleted_by_client_id = NULL
      WHERE id = ${pinId}
        AND room_id = ${roomId}
        AND deleted_by_client_id = ${clientId}
        AND deleted_at >= NOW() - INTERVAL '10 seconds'
        AND (
          kakao_place_id IS NULL OR NOT EXISTS (
            SELECT 1
            FROM pins active_pin
            WHERE active_pin.room_id = pins.room_id
              AND active_pin.kakao_place_id = pins.kakao_place_id
              AND active_pin.deleted_at IS NULL
              AND active_pin.id <> pins.id
          )
        )
      RETURNING id
    `;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw badRequest("이미 다시 추가된 장소라 되돌릴 수 없습니다.");
    }

    throw error;
  }

  if (restored.length === 0) {
    throw forbidden("되돌릴 수 있는 삭제 후보가 없습니다.");
  }

  await createRoomEvent(roomId, pinId, "pin_restored", authorName);
}

export async function updatePin(
  roomId: string,
  pinId: string,
  clientIdInput: unknown,
  updateInput: PinUpdateInput,
  editKeyInput?: unknown,
  authorNameInput?: unknown,
): Promise<Pin> {
  await ensureSchema();
  await assertCanEditRoom(roomId, editKeyInput);

  const clientId = normalizeClientId(clientIdInput);
  const authorName = normalizeAuthorName(authorNameInput);
  const update = normalizePinUpdate(updateInput);
  const [pin] = await getSql()`
    UPDATE pins
    SET status = ${update.status}, note = ${update.note}, price_level = ${update.priceLevel}
    WHERE id = ${pinId}
      AND room_id = ${roomId}
      AND deleted_at IS NULL
    RETURNING id, kakao_place_id, name, address, lat, lng, category, status, note, price_level, created_by_client_id, created_at, deleted_at
  `;

  if (!pin) {
    throw notFound("핀을 찾을 수 없습니다.");
  }

  await createRoomEvent(roomId, pinId, "pin_updated", authorName);
  return mapPin(pin, [], [], clientId);
}

export async function addComment(
  roomId: string,
  pinId: string,
  clientIdInput: unknown,
  authorNameInput: unknown,
  contentInput: unknown,
  editKeyInput?: unknown,
): Promise<PinComment> {
  await ensureSchema();
  await assertCanEditRoom(roomId, editKeyInput);
  await assertPinExists(roomId, pinId);

  const id = createPublicId("comment");
  const clientId = normalizeClientId(clientIdInput);
  const authorName = normalizeAuthorName(authorNameInput);
  const content = normalizeComment(contentInput);
  const [comment] = await getSql()`
    INSERT INTO comments (id, pin_id, client_id, author_name, content)
    VALUES (${id}, ${pinId}, ${clientId}, ${authorName}, ${content})
    RETURNING id, pin_id, client_id, author_name, content, created_at
  `;
  await createRoomEvent(roomId, pinId, "comment_added", authorName);

  return mapComment(comment);
}

export async function togglePinLike(
  roomId: string,
  pinId: string,
  clientIdInput: unknown,
  editKeyInput?: unknown,
  authorNameInput?: unknown,
): Promise<{ liked: boolean }> {
  await ensureSchema();
  await assertCanEditRoom(roomId, editKeyInput);
  await assertPinExists(roomId, pinId);

  const clientId = normalizeClientId(clientIdInput);
  const authorName = normalizeAuthorName(authorNameInput);
  const deleted = await getSql()`
    DELETE FROM pin_likes
    WHERE pin_id = ${pinId} AND client_id = ${clientId}
    RETURNING pin_id
  `;

  if (deleted.length > 0) {
    await createRoomEvent(roomId, pinId, "like_changed", authorName);
    return { liked: false };
  }

  await getSql()`
    INSERT INTO pin_likes (pin_id, client_id)
    VALUES (${pinId}, ${clientId})
    ON CONFLICT (pin_id, client_id) DO NOTHING
  `;
  await createRoomEvent(roomId, pinId, "like_changed", authorName);

  return { liked: true };
}

export async function trackPresence(
  roomId: string,
  clientIdInput: unknown,
  authorNameInput: unknown,
  editKeyInput?: unknown,
  readKeyInput?: unknown,
): Promise<Participant> {
  await ensureSchema();
  await getRoomAccess(roomId, editKeyInput, readKeyInput);

  const clientId = normalizeClientId(clientIdInput);
  const authorName = normalizeAuthorName(authorNameInput);
  const color = participantColor(clientId);
  const [participant] = await getSql()`
    INSERT INTO room_participants (room_id, client_id, author_name, color, last_seen_at)
    VALUES (${roomId}, ${clientId}, ${authorName}, ${color}, NOW())
    ON CONFLICT (room_id, client_id)
    DO UPDATE SET author_name = ${authorName}, color = ${color}, last_seen_at = NOW()
    RETURNING client_id, author_name, color, last_seen_at
  `;

  return mapParticipant(participant);
}

export async function getRoomShare(roomId: string, editKeyInput?: unknown): Promise<{ editKey: string; readKey: string; expiresAt: string }> {
  await ensureSchema();
  const { room } = await getRoomAccess(roomId, editKeyInput, null);

  const editKey = nullableString(room.edit_key) ?? createPublicId("edit");
  const readKey = nullableString(room.read_key) ?? createPublicId("read");
  if (!room.edit_key || !room.read_key) {
    await getSql()`
      UPDATE rooms
      SET edit_key = ${editKey}, read_key = ${readKey}
      WHERE id = ${roomId}
    `;
  }

  return {
    editKey,
    readKey,
    expiresAt: toDateString(room.expires_at),
  };
}

async function getRoomAccess(roomId: string, editKeyInput?: unknown, readKeyInput?: unknown): Promise<RoomAccess> {
  const editKey = typeof editKeyInput === "string" ? editKeyInput.trim() : "";
  const readKey = typeof readKeyInput === "string" ? readKeyInput.trim() : "";
  const [room] = await getSql()`
    SELECT id, name, edit_key, read_key, created_at, expires_at
    FROM rooms
    WHERE id = ${roomId}
  `;

  if (!room) {
    throw notFound("지도 방을 찾을 수 없습니다.");
  }

  if (new Date(toDateString(room.expires_at)).getTime() < Date.now()) {
    throw notFound("만료된 지도 방입니다.");
  }

  const storedEditKey = nullableString(room.edit_key);
  const storedReadKey = nullableString(room.read_key);
  if (storedEditKey && editKey && editKey === storedEditKey) {
    return { room, accessMode: "edit" };
  }

  if (storedReadKey && readKey && readKey === storedReadKey) {
    return { room, accessMode: "read" };
  }

  throw forbidden("편집 또는 읽기 링크가 필요합니다.");
}

async function assertCanEditRoom(roomId: string, editKeyInput?: unknown): Promise<void> {
  const { accessMode } = await getRoomAccess(roomId, editKeyInput, null);
  if (!canMutateRoom(accessMode)) {
    throw forbidden("읽기 전용 링크에서는 변경할 수 없습니다.");
  }
}

async function assertPinExists(roomId: string, pinId: string): Promise<void> {
  const [pin] = await getSql()`SELECT id FROM pins WHERE id = ${pinId} AND room_id = ${roomId} AND deleted_at IS NULL`;
  if (!pin) {
    throw notFound("핀을 찾을 수 없습니다.");
  }
}

function mapRoom(row: Row): RoomSummary {
  return {
    id: String(row.id),
    name: String(row.name),
    createdAt: toDateString(row.created_at),
    expiresAt: toDateString(row.expires_at),
  };
}

function mapPin(row: Row, comments: Row[], likes: Row[], viewerClientId: string): Pin {
  const pinId = String(row.id);
  const likedBy = likes.filter((like) => String(like.pin_id) === pinId).map((like) => String(like.client_id));
  const ownerClientId = String(row.created_by_client_id);

  return {
    id: pinId,
    kakaoPlaceId: nullableString(row.kakao_place_id),
    name: String(row.name),
    address: String(row.address),
    lat: Number(row.lat),
    lng: Number(row.lng),
    category: nullableString(row.category),
    status: normalizePinStatusFromRow(row.status),
    note: String(row.note ?? ""),
    priceLevel: normalizePriceLevelFromRow(row.price_level),
    createdAt: toDateString(row.created_at),
    likeCount: likedBy.length,
    liked: viewerClientId ? likedBy.includes(viewerClientId) : false,
    isMine: viewerClientId ? canDeletePin(ownerClientId, viewerClientId) : false,
    canDelete: viewerClientId ? canDeletePin(ownerClientId, viewerClientId) : false,
    deletedAt: row.deleted_at ? toDateString(row.deleted_at) : null,
    comments: comments.filter((comment) => String(comment.pin_id) === pinId).map(mapComment),
  };
}

function mapComment(row: Row): PinComment {
  return {
    id: String(row.id),
    pinId: String(row.pin_id),
    authorName: String(row.author_name),
    content: String(row.content),
    createdAt: toDateString(row.created_at),
  };
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function toDateString(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapParticipant(row: Row): Participant {
  return {
    clientId: String(row.client_id),
    authorName: String(row.author_name),
    color: String(row.color),
    lastSeenAt: toDateString(row.last_seen_at),
  };
}

function mapEvent(row: Row): RoomEvent {
  return {
    id: Number(row.id),
    type: String(row.type) as RoomEvent["type"],
    pinId: nullableString(row.pin_id),
    actorName: String(row.actor_name),
    createdAt: toDateString(row.created_at),
  };
}

async function createRoomEvent(roomId: string, pinId: string | null, type: RoomEvent["type"], actorName: string): Promise<void> {
  await getSql()`
    INSERT INTO room_events (room_id, pin_id, type, actor_name)
    VALUES (${roomId}, ${pinId}, ${type}, ${actorName})
  `;
}

function normalizePinStatusFromRow(value: unknown): Pin["status"] {
  if (value === "hold" || value === "rejected" || value === "confirmed") {
    return value;
  }

  return "want";
}

function normalizePriceLevelFromRow(value: unknown): Pin["priceLevel"] {
  if (value === "cheap" || value === "moderate" || value === "expensive") {
    return value;
  }

  return null;
}

function participantColor(clientId: string): string {
  const colors = ["#23634c", "#df6f56", "#80601f", "#4b6f9f", "#7c5a9f", "#48786f"];
  const total = Array.from(clientId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[total % colors.length];
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
