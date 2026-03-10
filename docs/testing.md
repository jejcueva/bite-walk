# BiteWalk Testing

## Test Runner

Vitest v4 is the primary test runner. It runs in Node with `environment: 'node'` and supports path aliases for React Native and shared package imports.

## Configuration

`vitest.config.ts` at the project root defines:

- **Path aliases**:
  - `@/` → project root
  - `@bitewalk/shared` → `packages/shared/src/index.ts`
  - `react-native` → `lib/__mocks__/react-native.ts` (Platform mock)
- **Include patterns**:
  - `packages/**/src/**/*.test.ts`
  - `lib/**/*.test.ts`
  - `hooks/**/*.test.ts`
  - `tests/**/*.test.ts`
- **Coverage**: v8 provider, reports `text`, `json-summary`, `html`. Covers `packages/shared/src`, `lib`, `hooks`; excludes `*.test.ts`, `*.d.ts`, `index.ts`.

## Running Tests

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once (`vitest run`) |
| `npm run test:watch` | Watch mode (`vitest`) |
| `npm run test:coverage` | Run with coverage report |
| `npm run test:legacy` | Run legacy CommonJS points test |

## Test Structure

- **Co-located tests**: Tests live next to source files as `*.test.ts` (e.g. `lib/step-tracker.test.ts`, `packages/shared/src/points.test.ts`).
- **Shared package**: Tests in `packages/shared/src/` for points logic and types.
- **Test helpers**: Shared utilities in `tests/helpers/`:
  - `tests/helpers/index.ts` – re-exports
  - `tests/helpers/supabase-mock.ts` – Supabase client mock
  - `tests/helpers/platform-mock.ts` – Platform and AsyncStorage mocks

## Test Helpers

### createMockSupabaseClient()

Located in `tests/helpers/supabase-mock.ts`. Returns a chainable mock Supabase client with:

- `from()` – query builder with `select`, `insert`, `update`, `delete`, `eq`, `single`, etc.
- `auth` – `getSession`, `signInWithPassword`, `signOut`, `onAuthStateChange`, etc.
- `rpc`, `storage`, `functions`, `channel` – stubbed for RPC, storage, Edge Functions, Realtime

Use when testing code that depends on Supabase without hitting the real backend.

### mockPlatform(os)

Located in `tests/helpers/platform-mock.ts`. Mocks `react-native`'s `Platform` for a given OS (`'ios' | 'android' | 'web'`). Use in tests that branch on `Platform.OS` (e.g. step tracker factory).

### mockAsyncStorage()

Returns an in-memory AsyncStorage-like object with `getItem`, `setItem`, `removeItem`, `clear`, `getAllKeys`. The internal `_store` Map can be inspected. Use when testing code that persists to AsyncStorage.

## Conventions

- **TDD**: Prefer writing tests before or alongside new features.
- **Describe blocks**: One `describe` per function or module; nested `describe` for logical groupings.
- **No narrating comments**: Avoid comments that restate what the test does; use clear `it` descriptions.
- **Mock native modules**: Use `vi.mock()` for `react-native`, `expo-sqlite`, `react-native-health`, `react-native-health-connect`, etc. The `react-native` alias in vitest config points to a Platform mock.

## CI

GitHub Actions runs on every pull request and push to `main`:

1. Checkout
2. Setup Node.js 20 with npm cache
3. `npm ci`
4. `npm run lint`
5. `npm run typecheck`
6. `npm test`
7. `npm run test:legacy`

Workflow file: `.github/workflows/ci.yml`. Job timeout: 15 minutes.
