# Dead Party Media Mobile

`apps/mobile` is the Expo Router mobile client for Dead Party Media.

It is built on:

- [Expo](https://docs.expo.dev/)
- [React Native Reusables](https://reactnativereusables.com)
- [Clerk Expo](https://clerk.com/docs/references/expo/overview)
- [TanStack Query](https://tanstack.com/query/latest)

## Scope

The app is intended to mirror the mobile web experience as closely as practical while staying native-first where React Native needs different patterns.

Phase 1 includes:

- Home, Music, Events, Merch, and Artists tabs
- article, event, artist, and merch detail screens
- sign-in, sign-up, verify-email, forgot-password, and reset-password
- fan onboarding, saved stories, reading history, comments, settings, and stats
- artist dashboard routes for profile, articles, and events
- in-app cart management with Fourthwall checkout handoff

Phase 2 adds native admin parity.

## Local setup

1. Create the env file:

   ```bash
   cp .env.example .env
   ```

2. Fill in:
   - `EXPO_PUBLIC_API_URL`
   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `EXPO_PUBLIC_FW_CHECKOUT`

3. Install dependencies from the repo root:

   ```bash
   pnpm install
   ```

4. Start Expo:

   ```bash
   pnpm --filter mobile dev
   ```

Useful commands:

```bash
pnpm --filter mobile ios
pnpm --filter mobile android
pnpm --filter mobile web
pnpm --filter mobile check-types
pnpm --filter mobile lint
```

## Architecture notes

- Mobile uses `apps/web` as its backend/BFF through JSON API routes.
- Shared DTOs live in `packages/contracts`.
- Cart state persists a `cartId` locally and talks to `apps/web/src/app/api/cart`.
- Final merch checkout still happens on Fourthwall.

## Current caveats

- The nested `apps/mobile/mobile` template copy is not part of the intended app structure.
- Full runtime verification still depends on installing the Expo/Clerk/Reusables dependencies in the workspace.
