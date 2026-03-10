# BiteWalk

BiteWalk is a walk-to-earn rewards app where users earn points by walking and redeem them for deals at local restaurants and businesses. Think Sweatcoin but focused on local dining.

The project is a monorepo containing:

- **Mobile app** (Expo / React Native) -- the main consumer-facing app
- **Business dashboard** (Next.js) -- a web app for restaurant owners to manage deals and track redemptions

## Features

- Walk tracking via Apple HealthKit (iOS) and Health Connect (Android)
- Points engine: 100 points per mile (2x for premium subscribers)
- Daily step goals with progress ring and streak tracking
- Local restaurant deals marketplace with nearby search (PostGIS)
- Favorites, search, and restaurant-focused category filters
- QR code voucher redemption with 30-minute expiry
- Map view of nearby deals with category-colored pins
- Leaderboards (weekly, monthly, all-time) with friends support
- Push notifications (daily goal reminders, streak-at-risk alerts)
- Premium tier with 2x points multiplier
- Offline-first: walks queued locally when offline, synced automatically
- Background step sync every 15 minutes
- OAuth (Google, Apple) + email/password auth
- Business dashboard: deal management, voucher tracking, analytics

## Tech Stack

- Expo SDK 54 / React Native 0.81 (mobile app)
- Next.js 16 / Tailwind CSS v4 (business dashboard)
- TypeScript throughout
- Supabase (Auth, Postgres, Edge Functions, Storage, Realtime)
- PostGIS for location queries
- Vitest for testing (136 tests)
- npm workspaces monorepo
- EAS Build for native app builds

## Project Structure

```
bite-walk/
  app/                          # Expo Router pages and layouts
  apps/
    business-dashboard/         # Next.js business dashboard
  components/                   # Mobile UI components
  hooks/                        # React hooks (auth, step tracker, daily goal, etc.)
  lib/                          # Business logic, Supabase client, step tracking
  packages/
    shared/                     # Shared types, points engine, deals logic, premium logic
  supabase/
    migrations/                 # Database migrations (run sequentially)
    functions/                  # Supabase Edge Functions
    schema.sql                  # Consolidated schema (single source of truth)
  docs/                         # Code documentation + sprint plans
  tests/                        # Test helpers
```

---

## Prerequisites

- **Node.js 20+** and npm
- **Expo CLI**: `npm install -g expo-cli` (or use `npx expo`)
- **Supabase project** at [supabase.com](https://supabase.com) (free tier works)
- **EAS CLI** (for native builds): `npm install -g eas-cli`
- **Supabase CLI** (optional, for local Supabase): `npm install -g supabase`

---

## Running Locally

### 1. Install dependencies

From the repo root:

```bash
npm install
```

This installs dependencies for the mobile app, the business dashboard, and the shared package via npm workspaces.

### 2. Set up environment variables

**Mobile app** (root `.env`):

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

**Business dashboard** (`apps/business-dashboard/.env.local`):

```bash
cp apps/business-dashboard/.env.local.example apps/business-dashboard/.env.local
```

Edit `.env.local` and fill in the same Supabase URL and anon key:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Both apps share the same Supabase backend.

### 3. Set up the database

In the Supabase dashboard SQL Editor, paste and run `supabase/schema.sql`. This creates all tables, functions, RLS policies, and seed data in one go.

Alternatively, if using the Supabase CLI locally:

```bash
supabase start
supabase db push
```

### 4. Run the mobile app

```bash
npx expo start
```

This opens the Expo dev tools. From there:

- Press `i` to open in iOS Simulator
- Press `a` to open in Android Emulator
- Press `w` to open in web browser
- Scan the QR code with the Expo Go app on your phone

For a development build (needed for native modules like HealthKit, Health Connect, maps):

```bash
npx expo run:ios
npx expo run:android
```

### 5. Run the business dashboard

```bash
cd apps/business-dashboard
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000). Sign up as a business owner, create a business profile, and start managing deals.

### 6. Run both simultaneously

In two terminal windows:

```bash
# Terminal 1: Mobile app
npx expo start

# Terminal 2: Business dashboard
npm run dev --workspace=business-dashboard
```

---

## Testing

```bash
npm test                # Run all 136 tests (Vitest)
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
npm run test:legacy     # Run legacy CJS points test
npm run ci              # Full CI: lint + typecheck + test
```

---

## Deployment

### Mobile App (EAS Build)

BiteWalk uses [EAS Build](https://docs.expo.dev/build/introduction/) for native iOS and Android builds.

**First time setup:**

```bash
npx eas-cli login
npx eas-cli project:init
```

**Preview build** (for internal testing via TestFlight / internal distribution):

```bash
npm run eas:build:preview
# or: npx eas-cli build --platform all --profile preview
```

**Production build** (for App Store / Google Play submission):

```bash
npm run eas:build:production
# or: npx eas-cli build --platform all --profile production
```

**Submit to stores:**

```bash
npx eas-cli submit --platform ios
npx eas-cli submit --platform android
```

**Build profiles** (defined in `eas.json`):

| Profile | Distribution | Use case |
|---------|-------------|----------|
| `development` | Internal | Dev client with hot reload |
| `preview` | Internal | Testing builds shared via link |
| `production` | Store | App Store and Google Play submissions |

**Required secrets** (set in EAS or GitHub Actions):

- `EXPO_TOKEN` -- Expo access token for CI builds
- `EXPO_PROJECT_ID` -- Your EAS project ID

**CI/CD**: Pushes to `main` and tags matching `v*` trigger EAS builds automatically via `.github/workflows/eas-build.yml`.

### Business Dashboard (Vercel)

The recommended way to deploy the Next.js dashboard is [Vercel](https://vercel.com).

**Deploy to Vercel:**

1. Push your repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Set the **Root Directory** to `apps/business-dashboard`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click Deploy

**Or deploy via CLI:**

```bash
npm install -g vercel
cd apps/business-dashboard
vercel
```

Follow the prompts. Set environment variables when asked or add them in the Vercel dashboard under Settings > Environment Variables.

**Alternative: any Node.js host** (Railway, Render, Fly.io, AWS, etc.):

```bash
cd apps/business-dashboard
npm run build       # Creates production build in .next/
npm run start       # Starts production server on port 3000
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables on your host.

**Custom domain**: Configure in your hosting provider's dashboard and update Supabase Auth settings (Authentication > URL Configuration) to add the dashboard URL as a redirect URL.

### Supabase

Your Supabase project at [supabase.com](https://supabase.com) handles auth, database, edge functions, and storage for both apps. No separate backend deployment is needed.

**Edge Functions** (if you modify them):

```bash
supabase functions deploy redeem-deal
supabase functions deploy validate-voucher
```

**Database migrations** (if you add new ones):

```bash
supabase db push
```

Or paste migration SQL directly in the Supabase dashboard SQL Editor.

---

## Documentation

- [Architecture](docs/architecture.md) -- System overview, data flow, patterns
- [Testing](docs/testing.md) -- Test strategy, helpers, conventions
- [Local Dev Setup](docs/setup/local-dev.md) -- Environment setup guide
- [Database](docs/setup/database.md) -- Schema, migrations, RLS guide
- [CI/CD](docs/setup/ci-cd.md) -- GitHub Actions and EAS config

### Feature Docs

- [Auth](docs/features/auth.md)
- [Step Tracking](docs/features/step-tracking.md)
- [Points Engine](docs/features/points-engine.md)
- [Deals Marketplace](docs/features/deals-marketplace.md)
- [Voucher Redemption](docs/features/voucher-redemption.md)
- [Offline Support](docs/features/offline-support.md)
- [Background Sync](docs/features/background-sync.md)
- [Daily Goals](docs/features/daily-goals.md)
- [Streaks](docs/features/streaks.md)
- [Business Dashboard](docs/features/business-dashboard.md)
- [Maps](docs/features/maps.md)
- [Notifications](docs/features/notifications.md)
- [Leaderboards](docs/features/leaderboards.md)
- [Premium](docs/features/premium.md)

## License

MIT
