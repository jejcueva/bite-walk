import type { SupabaseClient } from '@supabase/supabase-js';
import * as SQLite from 'expo-sqlite';

type QueueRow = {
  local_id: number;
  walk_id: string;
  user_id: string;
  distance_meters: number;
  points_earned: number;
  source: string;
  client_created_at: string;
  attempt_count: number;
  last_attempt_at: string | null;
  last_error: string | null;
};

export type EnqueueWalkInput = {
  walkId?: string;
  userId: string;
  distanceMeters: number;
  pointsEarned: number;
  source: 'auto' | 'manual' | string;
  clientCreatedAt?: string;
};

export type SyncQueuedWalksOptions = {
  supabase: SupabaseClient;
  userId: string;
  limit?: number;
};

const DB_NAME = 'bitewalk.db';
const TABLE = 'offline_walk_queue';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function db() {
  dbPromise ??= SQLite.openDatabaseAsync(DB_NAME);
  return dbPromise;
}

export function createWalkId(): string {
  const g: any = globalThis as any;
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();

  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((n) => n.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20)}`;
}

export async function initOfflineWalkQueue(): Promise<void> {
  const d = await db();
  await d.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS ${TABLE} (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      walk_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      distance_meters REAL NOT NULL,
      points_earned INTEGER NOT NULL,
      source TEXT NOT NULL,
      client_created_at TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TEXT,
      last_error TEXT
    );

    CREATE INDEX IF NOT EXISTS ${TABLE}_user_created_idx
      ON ${TABLE}(user_id, client_created_at);
  `);
}

export async function enqueueWalk(input: EnqueueWalkInput): Promise<{ walkId: string }> {
  await initOfflineWalkQueue();
  const d = await db();

  const walkId = input.walkId ?? createWalkId();
  const clientCreatedAt = input.clientCreatedAt ?? new Date().toISOString();

  await d.runAsync(
    `
    INSERT OR IGNORE INTO ${TABLE}
      (walk_id, user_id, distance_meters, points_earned, source, client_created_at)
    VALUES
      (?, ?, ?, ?, ?, ?)
    `,
    [
      walkId,
      input.userId,
      input.distanceMeters,
      input.pointsEarned,
      input.source,
      clientCreatedAt,
    ],
  );

  return { walkId };
}

function isDuplicateKeyOnId(error: any): boolean {
  return error?.code === '23505' || String(error?.message ?? '').toLowerCase().includes('duplicate');
}

function looksLikeNetworkError(error: any): boolean {
  const msg = String(error?.message ?? '').toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('timeout') ||
    msg.includes('socket') ||
    msg.includes('offline')
  );
}

export async function syncQueuedWalks(
  opts: SyncQueuedWalksOptions,
): Promise<{ attempted: number; synced: number; remaining: number }> {
  await initOfflineWalkQueue();
  const d = await db();

  const limit = opts.limit ?? 50;

  const pending = await d.getAllAsync<QueueRow>(
    `
    SELECT local_id, walk_id, user_id, distance_meters, points_earned, source,
           client_created_at, attempt_count, last_attempt_at, last_error
    FROM ${TABLE}
    WHERE user_id = ?
    ORDER BY client_created_at ASC, local_id ASC
    LIMIT ?
    `,
    [opts.userId, limit],
  );

  let attempted = 0;
  let synced = 0;

  for (const row of pending) {
    attempted += 1;

    const payload: any = {
      id: row.walk_id,
      user_id: row.user_id,
      distance_meters: row.distance_meters,
      points_earned: row.points_earned,
      source: row.source,
    };

    const { error } = await opts.supabase.from('walks').insert(payload);

    if (!error || isDuplicateKeyOnId(error)) {
      await d.runAsync(`DELETE FROM ${TABLE} WHERE local_id = ?`, [row.local_id]);
      synced += 1;
      continue;
    }

    await d.runAsync(
      `
      UPDATE ${TABLE}
      SET attempt_count = attempt_count + 1,
          last_attempt_at = ?,
          last_error = ?
      WHERE local_id = ?
      `,
      [new Date().toISOString(), String(error.message ?? error), row.local_id],
    );

    if (looksLikeNetworkError(error)) break;
  }

  const remainingRow = await d.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${TABLE} WHERE user_id = ?`,
    [opts.userId],
  );

  return { attempted, synced, remaining: Number(remainingRow?.count ?? 0) };
}

export async function getQueuedWalkCount(userId: string): Promise<number> {
  await initOfflineWalkQueue();
  const d = await db();
  const row = await d.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${TABLE} WHERE user_id = ?`,
    [userId],
  );
  return Number(row?.count ?? 0);
}

