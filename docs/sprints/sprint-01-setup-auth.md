# Sprint 1: Project Setup & Supabase Auth

**Release:** 1.0 (MVP)
**Duration:** Weeks 1-2
**Sprint Points:** 26
**Goal:** Establish the project foundation with Supabase backend and deliver working login/signup flows on both iOS and Android.

---

## Scope

### 1. Authentication & Onboarding (13 pts)

**User Story:** As a new user, I want to create an account so I can start using BiteWalk.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 1.1 | Initialize React Native project | `npx create-expo-app` with TypeScript template; configure `tsconfig.json`, ESLint, Prettier |
| 1.2 | Create Supabase project & configure Auth providers | Enable email/password, Google OAuth, Apple Sign-In in Supabase dashboard; configure redirect URIs for both platforms |
| 1.3 | Install & configure Supabase client | `@supabase/supabase-js`; create `lib/supabase.ts` singleton with `SUPABASE_URL` and `SUPABASE_ANON_KEY` from env |
| 1.4 | Build signup screen | Form fields: `name`, `email`, `password`; call `supabase.auth.signUp()`; insert profile row on signup via DB trigger |
| 1.5 | Build login screen with forgot-password | `supabase.auth.signInWithPassword()`; `supabase.auth.resetPasswordForEmail()`; deep link handling for password reset |
| 1.6 | Add social auth UI controls | Add "Continue with Google" and "Continue with Apple" buttons on login/signup screens; hide Apple button on unsupported platforms |
| 1.7 | Implement OAuth initiation with Supabase | Use `supabase.auth.signInWithOAuth()` for `google` and `apple`; configure `redirectTo` with app deep link; launch auth via in-app browser session |
| 1.8 | Handle OAuth callback and session exchange | Parse deep link callback URL, extract auth code/params, and call `supabase.auth.exchangeCodeForSession()` (PKCE) or `setSession()` fallback; handle cancel/error states |
| 1.9 | Implement secure session management | Use `supabase.auth.onAuthStateChange()` listener; persist session via `expo-secure-store`; auto-refresh JWT tokens |
| 1.10 | Set up navigation structure | Auth stack (Login, Signup, ForgotPassword) vs. Main tab navigator; conditional rendering based on auth state |
| 1.11 | Configure CI/CD pipeline | EAS Build profiles (`development`, `preview`, `production`); GitHub Actions workflow for PR checks (lint, typecheck, test) |

#### Task 1.8 Implementation Guide (CI/CD)

1. Add project scripts:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run ci` (runs all three checks)
2. Add GitHub Actions:
   - `.github/workflows/ci.yml` for PR checks
   - `.github/workflows/eas-build.yml` for manual EAS builds
3. Add `eas.json` with three profiles:
   - `development` (internal dev client builds)
   - `preview` (internal QA builds)
   - `production` (store-ready builds with auto-increment)
4. Initialize EAS project locally (one time, required before CI builds):
   - `npx eas-cli login`
   - `npx eas-cli project:init`
5. Configure GitHub secret:
   - Create `EXPO_TOKEN` in `Settings -> Secrets and variables -> Actions`
   - Create `EXPO_PROJECT_ID` in `Settings -> Secrets and variables -> Actions`
   - Generate a personal access token in Expo dashboard (`Account Settings -> Access Tokens`)
6. Protect branch checks:
   - In branch protection, require the CI job from `.github/workflows/ci.yml` before merge.
7. CD behavior:
   - Push to `main` triggers EAS `preview` build
   - Push tags like `v1.0.0` trigger EAS `production` build

#### Acceptance Criteria
- User can sign up with email/password and receive verification email
- User can log in with email/password, Google, or Apple using dedicated social auth buttons
- OAuth callback deep link returns to app and successfully exchanges auth code for a valid Supabase session
- Auth state persists across app restarts
- Unauthenticated users cannot access main app screens
- CI pipeline runs lint + typecheck on every PR

---

### 2. Database Foundation (8 pts)

**User Story:** As a developer, I want a scalable database so we can support core features.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 2.1 | Design PostgreSQL schema | Tables: `users`, `profiles` (username, avatar_url, created_at), `activity` (user_id, steps, distance_miles, date, synced_at), `points_ledger` (user_id, amount, type ENUM['credit','debit'], reason, reference_id, created_at) |
| 2.2 | Write Supabase DB migrations | Use Supabase CLI `supabase migration new`; version-controlled SQL files in `supabase/migrations/` |
| 2.3 | Configure RLS policies | `profiles`: users can SELECT/UPDATE own row; `activity`: users can INSERT/SELECT own rows; `points_ledger`: users can SELECT own rows, INSERT restricted to service role |
| 2.4 | Create DB functions for points | `calculate_points(distance_miles FLOAT)` returns INTEGER; `credit_points(user_id UUID, amount INT, reason TEXT)` with transaction safety |
| 2.5 | Set up Edge Functions project | `supabase functions new`; configure Deno runtime; create shared utility modules for auth validation |
| 2.6 | Configure Supabase Realtime | Enable Realtime on `points_ledger` and `activity` tables; set up publication filters |

#### Schema: `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
```

#### Schema: `points_ledger`
```sql
CREATE TABLE points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT CHECK (type IN ('credit', 'debit')) NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_points_ledger_user ON points_ledger(user_id);
CREATE INDEX idx_points_ledger_created ON points_ledger(user_id, created_at DESC);
```

---

### 3. Design System & Branding (5 pts)

**User Story:** As a user, I want the app to match the BiteWalk brand so it feels polished.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 3.1 | Implement design system | `constants/theme.ts`: BiteWalk green palette (`#4CAF50` primary, `#2E7D32` dark, `#81C784` light), typography scale (Inter/SF Pro), spacing tokens (4px grid) |
| 3.2 | Build reusable UI components | `<Button>` (primary, secondary, outline variants), `<TextInput>` (with validation states), `<Card>`, `<Avatar>`, `<Badge>` |
| 3.3 | Create splash screen & app icon | Configure `expo-splash-screen`; generate icon assets for iOS (1024x1024) and Android (adaptive icon with foreground/background layers) |

---

## Dependencies

- Supabase project provisioned with API keys
- Apple Developer account for Apple Sign-In
- Google Cloud project for Google OAuth
- EAS account configured

## Definition of Done

- [ ] All auth flows functional on iOS simulator and Android emulator
- [ ] Database migrations applied and RLS policies verified via Supabase test suite
- [ ] CI/CD pipeline green on main branch
- [ ] Design system components rendered in a dev storybook screen
- [ ] No TypeScript errors; ESLint clean
