# Sprint 1 Scope (Locked)

Locked date: March 3, 2026
Sprint length: 1 week
Project: BiteWalk

## Sprint goal

Ship a usable MVP slice where a user can authenticate, log walking distance, see reward points, and view available discounts.

## In scope (must-have)

1. Sign up and login
2. Log walk distance
3. See points
4. See discounts

## Nice-to-have (only after must-have is complete)

1. Premium upsell screen
2. Chart polish on distance/points screen

## Out of scope (Sprint 1)

1. Real-time GPS background tracking
2. Payment/subscription checkout flow
3. Push notifications
4. Admin dashboard
5. Complex analytics beyond basic totals

## Definition of done

1. A new user can sign up and log in successfully.
2. A logged-in user can submit a walk distance entry.
3. Points are visible and correctly reflect submitted distance.
4. Discounts are loaded from Supabase and displayed in-app.
5. User session persists after app restart.
6. Critical path has no blocking runtime errors on at least one platform (iOS simulator, Android emulator, or Expo Go).

## Acceptance criteria by feature

### Sign up and login

1. User can create an account with email + password.
2. User can log in and log out.
3. Invalid auth actions show user-facing error text.

### Log walk distance

1. User can input distance in miles and save.
2. Saved entry is linked to the authenticated user.
3. Invalid inputs are rejected (empty, zero, negative).

### See points

1. User sees current points total on the home/dashboard screen.
2. Points update after a new walk entry is saved.
3. Conversion rule is fixed for Sprint 1: `1.0 mile = 100 points`.

### See discounts

1. Discounts list renders from Supabase records (not hardcoded only).
2. Each discount item includes business name + offer text.
3. Empty state is handled gracefully if no discounts exist.

## Sprint 1 execution checklist

- [ ] Create/verify Supabase tables and RLS for profiles, walks, and discounts.
- [ ] Implement auth UI and Supabase auth calls.
- [ ] Build walk entry form and persist entries.
- [ ] Implement points calculation and display.
- [ ] Build discounts list screen backed by Supabase.
- [ ] Add loading and error states for all data-dependent screens.
- [ ] Run lint and smoke test core flow.

## Priority order

1. Auth
2. Walk logging
3. Points
4. Discounts
5. Nice-to-have polish
