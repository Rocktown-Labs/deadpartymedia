# Better Auth UI integration

The auth registry is pinned to [Better Auth UI v1.7.32](https://github.com/better-auth-ui/better-auth-ui/tree/v1.7.32). Runtime packages `@better-auth-ui/core` and `@better-auth-ui/react` are pinned to 1.7.32; Better Auth and its adapter/Expo plugins remain 1.7.12. The UI's package exports and this release's source are the API authority.

The upstream `examples/start-shadcn-example/registry.metadata.json` items `auth`, `auth-provider`, and `email-otp` and their imported dependencies were inspected. Their dependency closure supplies local files under `src/components/auth`, `src/lib/auth`, and missing `src/components/ui` primitives. Media uses the Base UI example and `@/` aliases; Arts uses the Radix example and `#/` aliases. Existing local primitives were preserved, including Media's mixed Radix select/checkbox components. Media's copied additional-field select omits the Base UI-only `items` prop, and its submit-button props are narrowed to native buttons. The copied form root also uses POST and a disabled fieldset until TanStack hydration, preventing native GET submission of credentials. No previously copied auth files were removed or renamed. The custom `components/auth.tsx` entrypoints retain the existing dialog and account-menu interfaces.

React/React DOM 19.2.6, Tailwind CSS/Vite plugin 4.3.2, Zod >=4.4.3, and TanStack Form 1.33.5 satisfy this release's peers and registry APIs. Both apps use their existing request-scoped QueryClient and Sonner toaster. Optional passkey/API-key peers are pinned to Better Auth 1.7.12; neither feature is enabled.

Password, Google (when credentials are configured), and email-code sign-in are supported. Signup requires email verification using a six-digit code. Codes are hashed at rest and expire after five minutes. Password reset and change-email retain the existing verified-link behavior. Email-code sign-in cannot create accounts implicitly. Existing bcrypt credentials, Google provider account IDs, scoped memberships, invitation return paths, and disabled accounts remain supported.

## Different root domains

`deadpartymedia.com` and `deadpartyarts.com` cannot share a parent-domain cookie. The shared API owns the central session and Google callback. Both frontends use its service binding and same-origin API proxy. Each frontend renders its own branded Better Auth UI: Arts has a modal and standalone pages, while Media uses standalone pages. Both pages have Back links. Provider availability is loaded with the root server loader so Google and its logo render on the first page load. No fourth Worker is needed.

The browser first visits the API at top level. If its central session is valid, a short-lived transfer establishes the originating site's host-only session cookie. Otherwise the API returns the browser to its originating frontend, preserving Arts modal/page presentation. Password/email-code sign-in uses that frontend's same-origin proxy, then an HttpOnly browser proof and hashed, single-use token establish the API session. This works without cross-site fetch cookies. API and frontend handoffs each bind their token to the browser, flow, exact destination, and expiry; callbacks use `no-store` and `no-referrer`. Public one-time-token plugin endpoints remain disabled. App memberships remain independent, and signing out revokes the shared session. Accounts without a membership in the originating app go to onboarding; invitation URLs remain the return destination so acceptance can attach the approved role.

Google sign-in takes a top-level hop to the API **before** generating the provider authorization URL. Better Auth creates and validates its OAuth state cookie on that API host; Google's authorization code is exchanged there through the normal provider callback. The resulting API session is transferred back to the originating frontend using its original browser proof. Better Auth retains its normal OAuth state-cookie checks. Passwords and raw session tokens stay out of URLs.

Google authorized redirect URIs:

```text
https://deadparty-api-pr-167.rocktown-labs.workers.dev/api/auth/callback/google
https://api.deadpartymedia.com/api/auth/callback/google
```

Both apps' preview/production origins can be listed as authorized JavaScript origins; production uses `deadpartyarts.com`, `deadpartymedia.com`, and the existing `www.deadpartymedia.com` canonical host. In Google's branding settings, authorized domains are the two owned root domains. Keep the existing Clerk callbacks until the old production apps are cut over. Client secrets belong in the ignored infrastructure `.env`, never a frontend environment or git.

Production domain attachment remains gated by `BIND_DOMAINS`. Move the `deadpartymedia.com` DNS zone to Cloudflare, preserving its mail and other records, before enabling it. Alchemy then configures `arts.deadpartymedia.com` to permanently redirect to `deadpartyarts.com`, preserving the path and query. Registrar transfer is not required for Cloudflare DNS/Workers hosting. The redirect is configured for cutover; preview deployment does not alter live DNS.

## Clerk migration

The production CSV and read-only Clerk snapshot are stored outside git. The reviewed preview plan imports 42 identities, 23 bcrypt credentials, 19 Google links, and 35 explicit app-role memberships. The owner receives `super_admin` in each app; Arts administrators do not acquire Media privileges. Ten accounts without app membership/role evidence receive no membership. Original Clerk IDs preserve domain profile links. All 42 exported primary-email verification flags agree with the API snapshot. No production Clerk user or production database was modified.

The second super administrator has an existing WordPress profile but no Clerk identity or claimable invitation. An explicit private `--reserved-identities` JSON file preserves that original profile ID and the approved super_admin membership in both apps. The planner creates an **unverified** identity with no fabricated password or Google link. The user can prove ownership by Google or an email code and enter the existing account without an invitation. The preview totals are 42 migrated Clerk users plus one reserved existing profile, 23 password credentials, 19 imported Google links, and 37 memberships; the synthetic browser-test account is separate.

The planner now rejects explicit membership maps that omit existing Clerk roles, as well as reserved identities colliding with imported IDs or email addresses. The live preview role audit found all 35 original Clerk role assignments, including both signed-up Arts administrators and their artmaker roles. A workerd test signs a reserved administrator in by code and verifies the original ID and access to both panels.

Browser checks cover Google/logo visibility on both sign-in and signup pages, Back links, Arts modal signup-to-verification, original editor access, and shared-session sign-out. Workerd tests cover verified signup handoffs, new-account onboarding and invitation return paths, API-owned Google state/callbacks from both frontends, and signup verification, password and email-code sign-in/replay, legacy bcrypt, disabled accounts, scoped roles, cross-domain callback proof/destination/token mismatches, expiry, replay, private token endpoints, safe return URLs, and shared-session revocation. Google consent and real outbound mail require configured external credentials/domain verification and user testing.
