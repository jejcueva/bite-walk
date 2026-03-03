# BiteWalk Sprint Plans

Technical sprint scope documents derived from the BiteWalk Release Plan (Supabase Edition).

## Release Structure

| Release | Sprints | Weeks | Focus |
|---------|---------|-------|-------|
| **1.0 (MVP)** | 1-5 | 1-10 | Core walk-to-earn-to-redeem loop |
| **2.0 (Growth)** | 6-9 | 11-18 | Monetization, gamification, social |
| **3.0 (Scale)** | 10-12 | 19-24 | Sponsored deals, multi-city, performance |

## Sprint Index

- [Sprint 01 - Project Setup & Supabase Auth](./sprint-01-setup-auth.md)
- [Sprint 02 - Step Tracking & Points Engine](./sprint-02-step-tracking-points.md)
- [Sprint 03 - Business Partnerships & Discounts](./sprint-03-business-discounts.md)
- [Sprint 04 - Maps, Notifications & Polish](./sprint-04-maps-notifications.md)
- [Sprint 05 - Beta Testing & MVP Launch](./sprint-05-beta-launch.md)
- [Sprint 06 - Premium Subscription Tier](./sprint-06-premium-subscriptions.md)
- [Sprint 07 - Gamification & Streaks](./sprint-07-gamification-streaks.md)
- [Sprint 08 - Social Features & Leaderboards](./sprint-08-social-leaderboards.md)
- [Sprint 09 - Business Dashboard & Release 2.0 Launch](./sprint-09-business-dashboard.md)
- [Sprint 10 - Sponsored Deals & Ad Platform](./sprint-10-sponsored-deals.md)
- [Sprint 11 - Multi-City Expansion & Analytics](./sprint-11-multi-city-analytics.md)
- [Sprint 12 - Performance, Security & 3.0 Launch](./sprint-12-performance-security.md)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native + TypeScript (Expo) |
| Navigation | React Navigation |
| State | Redux Toolkit / Zustand |
| Backend | Supabase (PostgreSQL + Edge Functions + Realtime) |
| Auth | Supabase Auth (email, Google, Apple Sign-In) |
| Database | Supabase PostgreSQL + RLS |
| Step Tracking | Apple HealthKit (iOS) / Google Fit API (Android) |
| Maps | Google Maps SDK / React Native Maps |
| Payments | Stripe + Apple IAP / Google Play Billing |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Storage | Supabase Storage (S3-compatible) |
| CI/CD | EAS Build (Expo) + GitHub Actions |
| Analytics | Mixpanel / PostHog |
| Error Monitoring | Sentry |
