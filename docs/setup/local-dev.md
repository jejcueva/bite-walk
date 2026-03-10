# Local Development Setup

## Prerequisites

- **Node.js** 20 or later
- **npm** (comes with Node)
- **Expo CLI** (optional; `npx expo` works without global install)
- **Supabase CLI** (optional, for local Supabase development)

## Clone and Install

```bash
git clone <repo-url>
cd mti
npm install
```

`npm install` at the root installs dependencies for all workspaces (`packages/*`, `apps/*`). The root `package.json` defines the Expo app and workspace layout.

## Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in Supabase credentials:
   - `EXPO_PUBLIC_SUPABASE_URL` – your Supabase project URL (e.g. `https://your-project-ref.supabase.co`)
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` – your project's public anon key

These are read by the app at build/runtime. Do not commit `.env` with real keys.

## Running the App

| Command | Description |
|---------|-------------|
| `npx expo start` | Start Expo dev server |
| `npm run android` | Start with Android emulator/device |
| `npm run ios` | Start with iOS simulator |
| `npm run web` | Start web build |

Use the Expo dev tools to scan the QR code or choose a platform.

## Supabase Local Development

To run Supabase locally:

1. Install Supabase CLI: `npm install -g supabase`
2. From the project root: `supabase start`
3. Apply migrations: `supabase db push` or run `supabase/migrations/*.sql` in order
4. Use the local URL and anon key in `.env` (Supabase CLI prints these after `supabase start`)

Local Supabase is optional; you can also use a hosted project.

## Testing

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:legacy` | Run legacy CommonJS points test |

## Linting and Type Checking

| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint (Expo config) |
| `npm run typecheck` | Run `tsc --noEmit` |

The CI pipeline runs `npm run ci`, which executes lint, typecheck, and tests.
