import { vi } from 'vitest';

export function mockPlatform(os: 'ios' | 'android' | 'web') {
  vi.mock('react-native', () => ({
    Platform: {
      OS: os,
      select: (specifics: Record<string, unknown>) => specifics[os] ?? specifics.default,
    },
  }));
}

export function mockAsyncStorage() {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      store.clear();
      return Promise.resolve();
    }),
    getAllKeys: vi.fn(() => Promise.resolve(Array.from(store.keys()))),
    _store: store,
  };
}
