import { vi } from 'vitest';

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  filter: ReturnType<typeof vi.fn>;
}

function createChainableMock(): MockQueryBuilder {
  const builder: Partial<MockQueryBuilder> = {};

  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'order', 'limit', 'single', 'maybeSingle', 'range', 'filter',
  ] as const;

  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  return builder as MockQueryBuilder;
}

export function createMockSupabaseClient() {
  const queryBuilder = createChainableMock();

  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: '' }, error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  };

  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

  const storage = {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: '' }, error: null }),
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };

  const functions = {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const channel = vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  });

  return {
    from: vi.fn().mockReturnValue(queryBuilder),
    auth,
    rpc,
    storage,
    functions,
    channel,
    removeChannel: vi.fn(),
    _queryBuilder: queryBuilder,
  };
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
