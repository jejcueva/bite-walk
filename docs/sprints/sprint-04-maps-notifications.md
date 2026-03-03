# Sprint 4: Maps, Notifications & Polish

**Release:** 1.0 (MVP)
**Duration:** Weeks 7-8
**Sprint Points:** 21
**Goal:** Add location-based map features and push notifications to drive daily engagement. Polish cross-platform UI inconsistencies.

---

## Scope

### 1. Map-Based Deal Discovery (8 pts)

**User Story:** As a user, I want to see nearby deals on a map so I can walk toward rewards.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 1.1 | Integrate Google Maps SDK | `react-native-maps` with Google provider; configure API key for both platforms; request `ACCESS_FINE_LOCATION` permission |
| 1.2 | Display business pins with deal previews | Custom map markers with business logo; `onPress` opens bottom sheet with deal summary, points cost, distance |
| 1.3 | PostGIS spatial queries for "deals near me" | `SELECT b.*, d.*, ST_Distance(b.location, ST_MakePoint($lng, $lat)::geography) AS distance_m FROM businesses b JOIN deals d ON b.id = d.business_id WHERE d.is_active = true AND ST_DWithin(b.location, ST_MakePoint($lng, $lat)::geography, 5000) ORDER BY distance_m` |
| 1.4 | Show walking route to deals | Use Google Directions API (walking mode); render polyline on map; display estimated walk time and distance; show projected points earned |

---

### 2. Push Notifications via FCM (8 pts)

**User Story:** As a user, I want notifications about deals and milestones so I stay motivated.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 2.1 | Set up FCM on both platforms | `@react-native-firebase/messaging`; configure `google-services.json` (Android) and `GoogleService-Info.plist` (iOS); handle APNs token registration |
| 2.2 | Store FCM device tokens | Add `fcm_token` column to `profiles` table; update on app launch and token refresh via `messaging().onTokenRefresh()` |
| 2.3 | Build notification trigger Edge Functions | Three Edge Functions triggered by DB events or cron: `notify-nearby-deal` (geo-proximity), `notify-milestone` (points threshold), `notify-inactivity` (no activity in 3 days) |
| 2.4 | Create notification preferences screen | Toggle controls: deal alerts, milestone alerts, inactivity reminders; store in `profiles.notification_prefs` JSONB column |
| 2.5 | Implement deep linking | `expo-linking` config; notification tap routes to relevant screen (deal detail, achievements, distance tab); handle both cold and warm start |

#### Notification Edge Function Pattern
```typescript
// supabase/functions/notify-milestone/index.ts
// Triggered by cron schedule: every hour

const { data: milestoneUsers } = await supabase
  .from('points_ledger')
  .select('user_id, SUM(amount) as total')
  .eq('type', 'credit')
  .group('user_id')
  .in('total', [1000, 5000, 10000]); // milestone thresholds

for (const user of milestoneUsers) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('fcm_token, notification_prefs')
    .eq('id', user.user_id)
    .single();

  if (profile?.fcm_token && profile.notification_prefs?.milestones !== false) {
    await sendFCM(profile.fcm_token, {
      title: 'Milestone Reached!',
      body: `You've earned ${user.total} points!`,
      data: { screen: 'distance' }
    });
  }
}
```

---

### 3. Cross-Platform Polish (5 pts)

**User Story:** As a user, I want a smooth, bug-free experience on my phone.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 3.1 | Fix platform-specific UI issues | Safe area insets (iOS notch/dynamic island), Android status bar color, keyboard avoidance behavior, haptic feedback (iOS only) |
| 3.2 | Optimize app startup & image loading | `expo-splash-screen` keep visible until data loaded; Supabase Storage CDN URLs with `?width=` transform param for responsive images |
| 3.3 | Implement error boundaries & Sentry | `react-native-sentry`; wrap root component in ErrorBoundary; capture unhandled JS exceptions + native crashes; source map upload in CI |
| 3.4 | Add loading states & skeleton screens | Skeleton components for deal cards, distance screen, leaderboard; `react-native-skeleton-placeholder`; consistent loading spinners |

---

## Dependencies

- Sprint 3 complete (businesses, deals, redemption)
- Google Maps API key with Directions API enabled
- Firebase project created with FCM configured
- Sentry project + DSN configured

## Definition of Done

- [ ] Map displays nearby business pins within 5km radius
- [ ] Tapping a pin shows deal preview; tapping preview navigates to deal detail
- [ ] Walking route renders with estimated time and points
- [ ] Push notifications delivered on both iOS and Android
- [ ] Notification preferences persist and are respected
- [ ] Deep links from notifications navigate to correct screens
- [ ] No visible UI inconsistencies between iOS and Android
- [ ] Sentry captures errors with source maps
