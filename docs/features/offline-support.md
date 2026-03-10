# Offline Support

When the network is unavailable, walks are queued locally in SQLite and synced when connectivity returns.

## SQLite Queue

**File**: `lib/offline-walk-queue.ts`  
**Storage**: expo-sqlite (`bitewalk.db`)

## Queue Table: offline_walk_queue

| Column | Purpose |
|--------|---------|
| `local_id` | Auto-increment primary key |
| `walk_id` | UUID (client-generated) |
| `user_id` | Supabase user ID |
| `distance_meters` | Walk distance |
| `points_earned` | Points for the walk |
| `source` | `'auto' | 'manual'` |
| `client_created_at` | ISO timestamp |
| `attempt_count` | Sync attempt counter |
| `last_attempt_at` | Last sync attempt time |
| `last_error` | Last error message |

Index on `(user_id, client_created_at)` for ordered sync.

## Enqueue

When a Supabase insert into `walks` fails, the walk is enqueued via `enqueueWalk()`:

```typescript
await enqueueWalk({
  userId,
  distanceMeters,
  pointsEarned,
  source: 'auto' | 'manual',
  walkId?,  // optional; createWalkId() used if omitted
  clientCreatedAt?,
});
```

`createWalkId()` generates a UUID (crypto.randomUUID or fallback).

## Sync

`syncQueuedWalks({ supabase, userId, limit? })`:

1. Reads pending rows for `user_id` ordered by `client_created_at`, up to `limit` (default 50)
2. For each row: inserts into `walks` via Supabase
3. On success or duplicate key (23505): deletes row from queue
4. On other error: increments `attempt_count`, sets `last_attempt_at`, `last_error`
5. On network-like error: stops the loop (avoids retrying while offline)
6. Returns `{ attempted, synced, remaining }`

## Error Handling

| Condition | Action |
|-----------|--------|
| Duplicate key (23505) | Treat as success, delete from queue |
| Network error (e.g. "network request failed", "fetch failed", "timeout") | Stop sync loop |
| Other errors | Increment `attempt_count`, update `last_error`, continue |

## Web Stub

**File**: `lib/offline-walk-queue.web.ts`

expo-sqlite is not available on web. All operations are no-ops:

- `enqueueWalk`: logs warning, returns `{ walkId }` without persisting
- `syncQueuedWalks`: returns `{ attempted: 0, synced: 0, remaining: 0 }`
- `getQueuedWalkCount`: returns `0`
- `initOfflineWalkQueue`: no-op
