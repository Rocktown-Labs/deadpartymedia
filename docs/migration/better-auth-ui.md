# Better Auth UI integration

The auth registry is pinned to [Better Auth UI v1.7.32](https://github.com/better-auth-ui/better-auth-ui/tree/v1.7.32). Runtime packages `@better-auth-ui/core` and `@better-auth-ui/react` are pinned to 1.7.32; Better Auth and its adapter/Expo plugins remain 1.7.12. The UI's package exports and this release's source are the API authority.

The upstream `examples/start-shadcn-example/registry.metadata.json` items `auth`, `auth-provider`, and `email-otp` and their imported dependencies were inspected. Their dependency closure supplies local files under `src/components/auth`, `src/lib/auth`, and missing `src/components/ui` primitives. Media uses the Base UI example and `@/` aliases; Arts uses the Radix example and `#/` aliases. Existing local primitives were preserved, including Media's mixed Radix select/checkbox components. Media's copied additional-field select omits the Base UI-only `items` prop, and its submit-button props are narrowed to native buttons. The copied form root also uses POST and a disabled fieldset until TanStack hydration, preventing native GET submission of credentials. No previously copied auth files were removed or renamed. The custom `components/auth.tsx` entrypoints retain the existing dialog and account-menu interfaces.

React/React DOM 19.2.6, Tailwind CSS/Vite plugin 4.3.2, Zod >=4.4.3, and TanStack Form 1.33.5 satisfy this release's peers and registry APIs. Both apps use their existing request-scoped QueryClient and Sonner toaster. Optional passkey/API-key peers are pinned to Better Auth 1.7.12; neither feature is enabled.

Password, Google (when credentials are configured), and email-code sign-in are supported. Signup requires email verification using a six-digit code. Codes are hashed at rest and expire after five minutes. Password reset and change-email retain the existing verified-link behavior. Email-code sign-in cannot create accounts implicitly. Existing bcrypt credentials, Google provider account IDs, scoped memberships, invitation return paths, and disabled accounts remain supported.

## Different root domains

`deadpartymedia.com` and `deadpartyarts.com` cannot share a parent-domain cookie. Arts hosts the central auth pages on its existing frontend Worker. Media's sign-in/signup routes start a top-level redirect there; the page shows Media's logo for a Media-originated flow. Arts-originated flows show Arts' logo. No fourth Worker is needed. The shared Hono Worker serves at `api.deadpartymedia.com`; each frontend uses its service binding and same-origin API proxy.

The handoff uses Better Auth's server-only one-time-token plugin, hashed tokens, a five-minute state record, and an HttpOnly browser verifier cookie. A token is bound to its state and exact destination, expires after one minute, and can only be consumed once. The callback forwards session cookies without returning session data. Transfer endpoints use `no-store` and `no-referrer`. Public one-time-token endpoints are disabled. Each host keeps its own host-only cookie pointing to the same session; sign-out revokes that session for both sites. App memberships remain independent.

Google's authorized callback is `<ARTS_APP_URL>/api/auth/callback/google`, including the preview origin while testing. Production is `https://deadpartyarts.com/api/auth/callback/google`. Client secrets belong in the ignored infrastructure `.env`, never a frontend environment or git.

Production domain attachment remains gated by `BIND_DOMAINS`. Move the `deadpartymedia.com` DNS zone to Cloudflare, preserving its mail and other records, before enabling it. Registrar transfer is not required for Cloudflare DNS/Workers hosting.

## Clerk migration

The production CSV and read-only Clerk snapshot are stored outside git. The reviewed preview plan imports 42 identities, 23 bcrypt credentials, 19 Google links, and 35 explicit app-role memberships. The owner receives `super_admin` in each app; Arts administrators do not acquire Media privileges. Ten accounts without app membership/role evidence receive no membership. Original Clerk IDs preserve domain profile links. All 42 exported primary-email verification flags agree with the API snapshot. No production Clerk user or production database was modified.

Tests cover real workerd/D1 pre-hydration form safety, signup verification, password and email-code sign-in/replay, legacy bcrypt, disabled accounts, scoped roles, cross-domain callback proof/destination/token mismatches, expiry, replay, private token endpoints, safe return URLs, and shared-session revocation. Google consent and real outbound mail require configured external credentials/domain verification and user testing.
