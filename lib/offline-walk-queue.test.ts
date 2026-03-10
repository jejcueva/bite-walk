import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createWalkId,
  initOfflineWalkQueue,
  enqueueWalk,
  syncQueuedWalks,
  getQueuedWalkCount,
} from './offline-walk-queue';

const { mockExecAsync, mockRunAsync, mockGetAllAsync, mockGetFirstAsync } =
  vi.hoisted(() => ({
    mockExecAsync: vi.fn(),
    mockRunAsync: vi.fn(),
    mockGetAllAsync: vi.fn(),
    mockGetFirstAsync: vi.fn(),
  }));

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn().mockResolvedValue({
    execAsync: mockExecAsync,
    runAsync: mockRunAsync,
    getAllAsync: mockGetAllAsync,
    getFirstAsync: mockGetFirstAsync,
  }),
}));

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('createWalkId', () => {
  it('generates valid UUID v4 format', () => {
    const id = createWalkId();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(createWalkId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('initOfflineWalkQueue', () => {
  beforeEach(() => {
    mockExecAsync.mockResolvedValue(undefined);
  });

  it('calls execAsync with PRAGMA and CREATE TABLE', async () => {
    await initOfflineWalkQueue();
    expect(mockExecAsync).toHaveBeenCalledTimes(1);
    const sql = mockExecAsync.mock.calls[0][0];
    expect(sql).toContain('PRAGMA journal_mode = WAL');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS offline_walk_queue');
    expect(sql).toContain('walk_id TEXT NOT NULL UNIQUE');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS offline_walk_queue_user_created_idx');
  });
});

describe('enqueueWalk', () => {
  beforeEach(() => {
    mockExecAsync.mockResolvedValue(undefined);
    mockRunAsync.mockResolvedValue(undefined);
  });

  it('enqueues walk with provided walkId', async () => {
    const result = await enqueueWalk({
      walkId: 'custom-walk-id',
      userId: 'user-1',
      distanceMeters: 1500,
      pointsEarned: 93,
      source: 'manual',
    });
    expect(result.walkId).toBe('custom-walk-id');
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE'),
      ['custom-walk-id', 'user-1', 1500, 93, 'manual', expect.any(String)],
    );
  });

  it('generates walkId when not provided', async () => {
    const result = await enqueueWalk({
      userId: 'user-2',
      distanceMeters: 800,
      pointsEarned: 50,
      source: 'auto',
    });
    expect(result.walkId).toMatch(UUID_V4_REGEX);
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE'),
      [result.walkId, 'user-2', 800, 50, 'auto', expect.any(String)],
    );
  });

  it('uses provided clientCreatedAt', async () => {
    const timestamp = '2025-03-09T12:00:00.000Z';
    await enqueueWalk({
      walkId: 'walk-ts',
      userId: 'user-3',
      distanceMeters: 1000,
      pointsEarned: 62,
      source: 'manual',
      clientCreatedAt: timestamp,
    });
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.any(String),
      ['walk-ts', 'user-3', 1000, 62, 'manual', timestamp],
    );
  });

  it('uses current ISO string when clientCreatedAt not provided', async () => {
    await enqueueWalk({
      walkId: 'walk-now',
      userId: 'user-4',
      distanceMeters: 500,
      pointsEarned: 31,
      source: 'auto',
    });
    const [, args] = mockRunAsync.mock.calls[0];
    const clientCreatedAt = args[5];
    expect(clientCreatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(Number.isNaN(new Date(clientCreatedAt).getTime())).toBe(false);
  });
});

describe('syncQueuedWalks', () => {
  const createSupabase = (error: { code?: string; message?: string } | null) => ({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error }),
    }),
  });

  beforeEach(() => {
    mockExecAsync.mockResolvedValue(undefined);
    mockRunAsync.mockResolvedValue(undefined);
    mockGetAllAsync.mockResolvedValue([]);
    mockGetFirstAsync.mockResolvedValue({ count: 0 });
  });

  it('syncs pending walks successfully', async () => {
    mockGetAllAsync.mockResolvedValueOnce([
      {
        local_id: 1,
        walk_id: 'walk-1',
        user_id: 'user-1',
        distance_meters: 1000,
        points_earned: 62,
        source: 'manual',
        client_created_at: '2025-03-09T10:00:00Z',
        attempt_count: 0,
        last_attempt_at: null,
        last_error: null,
      },
    ]);
    const supabase = createSupabase(null);
    const result = await syncQueuedWalks({ supabase: supabase as any, userId: 'user-1' });
    expect(result).toEqual({ attempted: 1, synced: 1, remaining: 0 });
    expect(supabase.from).toHaveBeenCalledWith('walks');
    expect(supabase.from('walks').insert).toHaveBeenCalledWith({
      id: 'walk-1',
      user_id: 'user-1',
      distance_meters: 1000,
      points_earned: 62,
      source: 'manual',
    });
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM'),
      [1],
    );
  });

  it('treats duplicate key error as success and deletes row', async () => {
    mockGetAllAsync.mockResolvedValueOnce([
      {
        local_id: 2,
        walk_id: 'walk-dup',
        user_id: 'user-1',
        distance_meters: 500,
        points_earned: 31,
        source: 'auto',
        client_created_at: '2025-03-09T11:00:00Z',
        attempt_count: 0,
        last_attempt_at: null,
        last_error: null,
      },
    ]);
    const supabase = createSupabase({ code: '23505', message: 'duplicate key' });
    const result = await syncQueuedWalks({ supabase: supabase as any, userId: 'user-1' });
    expect(result).toEqual({ attempted: 1, synced: 1, remaining: 0 });
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM'),
      [2],
    );
  });

  it('stops syncing on network error', async () => {
    mockGetAllAsync.mockResolvedValueOnce([
      {
        local_id: 3,
        walk_id: 'walk-net-1',
        user_id: 'user-1',
        distance_meters: 1000,
        points_earned: 62,
        source: 'manual',
        client_created_at: '2025-03-09T09:00:00Z',
        attempt_count: 0,
        last_attempt_at: null,
        last_error: null,
      },
      {
        local_id: 4,
        walk_id: 'walk-net-2',
        user_id: 'user-1',
        distance_meters: 500,
        points_earned: 31,
        source: 'auto',
        client_created_at: '2025-03-09T10:00:00Z',
        attempt_count: 0,
        last_attempt_at: null,
        last_error: null,
      },
    ]);
    const insertMock = vi.fn();
    insertMock
      .mockResolvedValueOnce({ error: { message: 'network request failed' } })
      .mockResolvedValueOnce({ error: null });
    const supabase = {
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    };
    mockGetFirstAsync.mockResolvedValue({ count: 2 });
    const result = await syncQueuedWalks({ supabase: supabase as any, userId: 'user-1' });
    expect(result).toEqual({ attempted: 1, synced: 0, remaining: 2 });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE'),
      expect.arrayContaining([3]),
    );
  });

  it('increments attempt count on other errors', async () => {
    mockGetAllAsync.mockResolvedValueOnce([
      {
        local_id: 5,
        walk_id: 'walk-err',
        user_id: 'user-1',
        distance_meters: 1000,
        points_earned: 62,
        source: 'manual',
        client_created_at: '2025-03-09T08:00:00Z',
        attempt_count: 2,
        last_attempt_at: null,
        last_error: null,
      },
    ]);
    const supabase = createSupabase({ message: 'some other database error' });
    mockGetFirstAsync.mockResolvedValue({ count: 1 });
    const result = await syncQueuedWalks({ supabase: supabase as any, userId: 'user-1' });
    expect(result).toEqual({ attempted: 1, synced: 0, remaining: 1 });
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE'),
      expect.arrayContaining([
        expect.any(String),
        'some other database error',
        5,
      ]),
    );
    const updateCall = mockRunAsync.mock.calls.find((c) =>
      c[0].includes('attempt_count = attempt_count + 1'),
    );
    expect(updateCall).toBeDefined();
  });

  it('respects limit option', async () => {
    mockGetAllAsync.mockResolvedValueOnce([]);
    await syncQueuedWalks({ supabase: createSupabase(null) as any, userId: 'user-1', limit: 10 });
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.any(String),
      ['user-1', 10],
    );
  });
});

describe('getQueuedWalkCount', () => {
  beforeEach(() => {
    mockExecAsync.mockResolvedValue(undefined);
    mockGetFirstAsync.mockResolvedValue({ count: 0 });
  });

  it('returns count from SQLite', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ count: 5 });
    const count = await getQueuedWalkCount('user-1');
    expect(count).toBe(5);
    expect(mockGetFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('COUNT(*)'),
      ['user-1'],
    );
  });

  it('returns 0 when no rows', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ count: 0 });
    const count = await getQueuedWalkCount('user-2');
    expect(count).toBe(0);
  });

  it('returns 0 when row is null', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);
    const count = await getQueuedWalkCount('user-3');
    expect(count).toBe(0);
  });
});
