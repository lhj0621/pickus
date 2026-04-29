import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import { createPublicId } from "./ids";

type Sql = NeonQueryFunction<false, false>;

let sql: Sql | null = null;
let schemaPromise: Promise<void> | null = null;

export function getSql(): Sql {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL 환경 변수가 필요합니다.");
  }

  sql ??= neon(process.env.DATABASE_URL);
  return sql;
}

export async function ensureSchema(): Promise<void> {
  schemaPromise ??= createSchema().catch((error: unknown) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

async function createSchema(): Promise<void> {
  const db = getSql();

  await db`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS edit_key TEXT`;
  await db`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS read_key TEXT`;
  await db`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')`;
  await backfillRoomKeys(db);

  await db`
    CREATE TABLE IF NOT EXISTS pins (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      kakao_place_id TEXT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      category TEXT,
      created_by_client_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`ALTER TABLE pins ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'want'`;
  await db`ALTER TABLE pins ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT ''`;
  await db`ALTER TABLE pins ADD COLUMN IF NOT EXISTS price_level TEXT`;
  await db`ALTER TABLE pins ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
  await db`ALTER TABLE pins ADD COLUMN IF NOT EXISTS deleted_by_client_id TEXT`;

  await db`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      pin_id TEXT NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS pin_likes (
      pin_id TEXT NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (pin_id, client_id)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS room_participants (
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      color TEXT NOT NULL,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (room_id, client_id)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS room_events (
      id BIGSERIAL PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      pin_id TEXT,
      type TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`CREATE INDEX IF NOT EXISTS pins_room_id_created_at_idx ON pins(room_id, created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS comments_pin_id_created_at_idx ON comments(pin_id, created_at ASC)`;
  await db`CREATE INDEX IF NOT EXISTS pins_room_id_status_idx ON pins(room_id, status)`;
  await db`CREATE INDEX IF NOT EXISTS pins_room_id_deleted_at_idx ON pins(room_id, deleted_at)`;
  await db`CREATE INDEX IF NOT EXISTS room_participants_room_id_seen_idx ON room_participants(room_id, last_seen_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS room_events_room_id_id_idx ON room_events(room_id, id DESC)`;
  await db`CREATE UNIQUE INDEX IF NOT EXISTS rooms_edit_key_unique_idx ON rooms(edit_key) WHERE edit_key IS NOT NULL`;
  await db`CREATE UNIQUE INDEX IF NOT EXISTS rooms_read_key_unique_idx ON rooms(read_key) WHERE read_key IS NOT NULL`;
  await softDeleteDuplicateActivePins(db);
  await db`
    CREATE UNIQUE INDEX IF NOT EXISTS pins_room_kakao_place_active_unique_idx
    ON pins(room_id, kakao_place_id)
    WHERE kakao_place_id IS NOT NULL AND deleted_at IS NULL
  `;
}

async function backfillRoomKeys(db: Sql): Promise<void> {
  const rooms = await db`
    SELECT id, edit_key, read_key
    FROM rooms
    WHERE edit_key IS NULL OR read_key IS NULL
  `;

  for (const room of rooms) {
    await db`
      UPDATE rooms
      SET edit_key = COALESCE(edit_key, ${createPublicId("edit")}),
          read_key = COALESCE(read_key, ${createPublicId("read")})
      WHERE id = ${String(room.id)}
    `;
  }
}

async function softDeleteDuplicateActivePins(db: Sql): Promise<void> {
  await db`
    WITH duplicate_pins AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY room_id, kakao_place_id
               ORDER BY created_at ASC, id ASC
             ) AS duplicate_rank
      FROM pins
      WHERE kakao_place_id IS NOT NULL AND deleted_at IS NULL
    )
    UPDATE pins
    SET deleted_at = NOW(),
        deleted_by_client_id = COALESCE(deleted_by_client_id, 'system')
    FROM duplicate_pins
    WHERE pins.id = duplicate_pins.id
      AND duplicate_pins.duplicate_rank > 1
  `;
}
