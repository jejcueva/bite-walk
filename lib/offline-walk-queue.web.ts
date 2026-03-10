/**
 * Web stub for offline-walk-queue.
 * expo-sqlite is not supported on web, so all operations are no-ops.
 */

export type EnqueueWalkInput = {
  walkId?: string;
  userId: string;
  distanceMeters: number;
  pointsEarned: number;
  source: 'auto' | 'manual' | string;
  clientCreatedAt?: string;
};

export type SyncQueuedWalksOptions = {
  supabase: unknown;
  userId: string;
  limit?: number;
};

export function createWalkId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function initOfflineWalkQueue(): Promise<void> {}

export async function enqueueWalk(
  input: EnqueueWalkInput,
): Promise<{ walkId: string }> {
  console.warn('[offline-walk-queue.web] enqueueWalk is a no-op on web');
  const walkId = input.walkId ?? createWalkId();
  return { walkId };
}

export async function syncQueuedWalks(
  _opts: SyncQueuedWalksOptions,
): Promise<{ attempted: number; synced: number; remaining: number }> {
  return { attempted: 0, synced: 0, remaining: 0 };
}

export async function getQueuedWalkCount(_userId: string): Promise<number> {
  return 0;
}
