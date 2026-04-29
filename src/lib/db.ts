import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

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

  await db`CREATE INDEX IF NOT EXISTS pins_room_id_created_at_idx ON pins(room_id, created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS comments_pin_id_created_at_idx ON comments(pin_id, created_at ASC)`;
}
