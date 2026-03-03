# CI/CD Setup

This project uses GitHub Actions for CI and EAS Build for CD.

## What Runs Automatically

- Pull requests and `main` pushes run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
- Push to `main` triggers EAS `preview` build (`android + ios`).
- Push tag matching `v*` (example: `v1.0.0`) triggers EAS `production` build (`android + ios`).
- Manual EAS builds are available from the **Actions** tab using the `EAS Build` workflow.

## Required GitHub Secrets

Add these in `Settings -> Secrets and variables -> Actions`:

- `EXPO_TOKEN`: Expo personal access token
- `EXPO_PROJECT_ID`: EAS project id (UUID)

## One-Time Expo Setup

1. Log in and link/create the EAS project locally:
   - `npm run eas:init`
2. Get your EAS project ID:
   - Expo dashboard: Project -> Settings -> Project ID
   - Or from config after init (look for `extra.eas.projectId`)
3. Create an Expo access token:
   - Expo dashboard -> Account Settings -> Access Tokens
4. Save both values as GitHub repo secrets (`EXPO_TOKEN`, `EXPO_PROJECT_ID`).

## Branch Protection (Recommended)

In GitHub branch protection for `main`:

- Require status checks to pass before merging.
- Require check: `Lint, Typecheck, Test`.

## Local Validation

Run the same checks as CI:

```bash
npm run ci
```

Useful build commands:

```bash
npm run eas:build:preview
npm run eas:build:production
```
