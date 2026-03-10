# Push Notifications

Push notifications keep users engaged with daily goal reminders and streak-at-risk alerts.

## Key Files

| File | Purpose |
|------|---------|
| `lib/push-notifications.ts` | Core notification module |
| `app/onboarding/health-permissions.tsx` | Asks for notification permission during onboarding |
| `supabase/migrations/20260309040000_push_tokens.sql` | Adds `push_token` column to profiles |

## How It Works

### Registration

`registerForPushNotifications()` handles the full registration flow:

1. Checks that the code is running on a physical device (push tokens are unavailable in
   simulators).
2. Requests notification permission from the OS. If already granted, skips the prompt.
3. Retrieves an Expo push token via `Notifications.getExpoPushTokenAsync()`.
4. Persists the token to the authenticated user's `profiles.push_token` column in Supabase.

This function is called during onboarding (after health permissions) and can be called again
later if the token needs refreshing.

### Notification Handler

The module registers a global notification handler at import time:

```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
```

On Android, a high-importance notification channel named "BiteWalk" is created with the app's
primary green accent color.

### Local Notifications

| Function | Schedule | Message |
|----------|----------|---------|
| `scheduleDailyGoalReminder()` | Every day at 7:00 PM | "Don't forget your daily walk goal!" |
| `scheduleStreakAtRiskReminder()` | 2 hours from invocation | "Your streak is at risk! Walk today to keep it alive." |

Both include a `data.screen` payload so tapping the notification navigates to the correct tab.

### Tap Handling

`handleNotificationResponse(response, navigate)` reads the `screen` field from the
notification's data payload and calls the provided navigation function to route the user
to the relevant screen.

## Database Changes

```sql
alter table public.profiles add column if not exists push_token text;
```

The `push_token` column stores the Expo push token string for each user. It is updated
on registration and can be used by server-side logic to send targeted push notifications
via the Expo Push API.

## Onboarding Flow

The health-permissions onboarding screen now has two steps:

1. **Step 1 -- Health**: Same as before (connect to Apple Health / Health Connect).
2. **Step 2 -- Notifications**: New screen asking users to enable push notifications.

Both steps have a "Skip for now" option. After both steps complete, the user is routed to
the main tab navigator.
