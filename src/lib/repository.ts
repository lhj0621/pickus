import { ensureSchema, getSql } from "./db";
import {
  canDeletePin,
  normalizeAuthorName,
  normalizeClientId,
  normalizeComment,
  normalizePlace,
  normalizeRoomName,
  type PlaceInput,
} from "./domain";
import { forbidden, notFound } from "./errors";
import { createPublicId } from "./ids";
import type { Pin, PinComment, RoomState, RoomSummary } from "./types";

type Row = Record<string, unknown>;

export async function createRoom(rawName: unknown): Promise<RoomSummary> {
  await ensureSchema();

  const id = createPublicId("room");
  const name = normalizeRoomName(rawName);
  const [room] = await getSql()`
    INSERT INTO rooms (id, name)
    VALUES (${id}, ${name})
    RETURNING id, name, created_at
  `;

  return mapRoom(room);
}

export async function getRoomState(roomId: string, viewerClientIdInput?: string | null): Promise<RoomState> {
  await ensureSchema();
  const viewerClientId = typeof viewerClientIdInput === "string" ? viewerClientIdInput.trim() : "";

  const [room] = await getSql()`
    SELECT id, name, created_at
    FROM rooms
    WHERE id = ${roomId}
  `;

  if (!room) {
    throw notFound("지도 방을 찾을 수 없습니다.");
  }

  const pins = await getSql()`
    SELECT id, kakao_place_id, name, address, lat, lng, category, created_by_client_id, created_at
    FROM pins
    WHERE room_id = ${roomId}
    ORDER BY created_at DESC
  `;

  const comments = await getSql()`
    SELECT comments.id, comments.pin_id, comments.client_id, comments.author_name, comments.content, comments.created_at
    FROM comments
    INNER JOIN pins ON pins.id = comments.pin_id
    WHERE pins.room_id = ${roomId}
    ORDER BY comments.created_at ASC
  `;

  const likes = await getSql()`
    SELECT pin_likes.pin_id, pin_likes.client_id
    FROM pin_likes
    INNER JOIN pins ON pins.id = pin_likes.pin_id
    WHERE pins.room_id = ${roomId}
  `;

  return {
    room: mapRoom(room),
    pins: pins.map((pin) => mapPin(pin, comments, likes, viewerClientId)),
  };
}

export async function addPin(roomId: string, clientIdInput: unknown, placeInput: PlaceInput): Promise<Pin> {
  await ensureSchema();
  await assertRoomExists(roomId);

  const id = createPublicId("pin");
  const clientId = normalizeClientId(clientIdInput);
  const place = normalizePlace(placeInput);
  const [pin] = await getSql()`
    INSERT INTO pins (id, room_id, kakao_place_id, name, address, lat, lng, category, created_by_client_id)
    VALUES (${id}, ${roomId}, ${place.kakaoPlaceId}, ${place.name}, ${place.address}, ${place.lat}, ${place.lng}, ${place.category}, ${clientId})
    RETURNING id, kakao_place_id, name, address, lat, lng, category, created_by_client_id, created_at
  `;

  return mapPin(pin, [], [], clientId);
}

export async function deletePin(roomId: string, pinId: string, clientIdInput: unknown): Promise<void> {
  await ensureSchema();

  const clientId = normalizeClientId(clientIdInput);
  const [pin] = await getSql()`
    SELECT created_by_client_id
    FROM pins
    WHERE id = ${pinId} AND room_id = ${roomId}
  `;

  if (!pin) {
    throw notFound("핀을 찾을 수 없습니다.");
  }

  if (!canDeletePin(String(pin.created_by_client_id), clientId)) {
    throw forbidden("직접 추가한 핀만 삭제할 수 있습니다.");
  }

  await getSql()`DELETE FROM pins WHERE id = ${pinId} AND room_id = ${roomId}`;
}

export async function addComment(
  roomId: string,
  pinId: string,
  clientIdInput: unknown,
  authorNameInput: unknown,
  contentInput: unknown,
): Promise<PinComment> {
  await ensureSchema();
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

  return mapComment(comment);
}

export async function togglePinLike(roomId: string, pinId: string, clientIdInput: unknown): Promise<{ liked: boolean }> {
  await ensureSchema();
  await assertPinExists(roomId, pinId);

  const clientId = normalizeClientId(clientIdInput);
  const deleted = await getSql()`
    DELETE FROM pin_likes
    WHERE pin_id = ${pinId} AND client_id = ${clientId}
    RETURNING pin_id
  `;

  if (deleted.length > 0) {
    return { liked: false };
  }

  await getSql()`
    INSERT INTO pin_likes (pin_id, client_id)
    VALUES (${pinId}, ${clientId})
    ON CONFLICT (pin_id, client_id) DO NOTHING
  `;

  return { liked: true };
}

async function assertRoomExists(roomId: string): Promise<void> {
  const [room] = await getSql()`SELECT id FROM rooms WHERE id = ${roomId}`;
  if (!room) {
    throw notFound("지도 방을 찾을 수 없습니다.");
  }
}

async function assertPinExists(roomId: string, pinId: string): Promise<void> {
  const [pin] = await getSql()`SELECT id FROM pins WHERE id = ${pinId} AND room_id = ${roomId}`;
  if (!pin) {
    throw notFound("핀을 찾을 수 없습니다.");
  }
}

function mapRoom(row: Row): RoomSummary {
  return {
    id: String(row.id),
    name: String(row.name),
    createdAt: toDateString(row.created_at),
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
    createdAt: toDateString(row.created_at),
    likeCount: likedBy.length,
    liked: viewerClientId ? likedBy.includes(viewerClientId) : false,
    canDelete: viewerClientId ? canDeletePin(ownerClientId, viewerClientId) : false,
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
