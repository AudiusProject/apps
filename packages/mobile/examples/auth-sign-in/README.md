# Auth / Sign-in Example

Two ways to do **authentication** with Audius:

1. **Main app (Hedgehog)**: Email/password sign-in, sign-up flow, Hedgehog-based wallet/identity (see Source of truth below).
2. **Runnable Expo app (OAuth)**: Simple OAuth sign-in at audius.co; after sign-in you get the user’s profile and can use the SDK for authenticated GETs in your code. This folder contains the example.

## Runnable OAuth example (this directory)

Expo app: **Sign in with Audius** (OAuth) → see your handle and name → Sign out. No API key or .env required. Uses a WebView and localhost redirect so the OAuth callback is intercepted in-app.

### How to run

From the **apps repo root**:

```bash
npm install
npm run build -w @audius/sdk
cd packages/mobile/examples/auth-sign-in
npm install
npx expo start
```

Press `i` (iOS) or `a` (Android). Tap **Sign in with Audius** → complete login in the WebView → you’ll see your profile and **Sign out**.

Or from repo root: `npm run mobile:example:auth-sign-in` (after `npm install` in the example dir once).

### Source

| File | Purpose |
|------|--------|
| `src/sdk.ts` | `getSDK()`, `getAuthenticatedSDK(token)` — SDK for OAuth, verify, feed. |
| `src/oauth/buildOAuthUrl.ts` | Builds the Audius OAuth URL (SDK’s oauth is browser-only). |
| `App.tsx` | Sign-in → WebView → intercept redirect → verify token → show profile. |

Flow: open OAuth URL → user signs in at audius.co → redirect to localhost with token → verify token → show profile. Use `getCurrentAuthenticatedSDK()` in code to run authenticated GETs. See [Audius OAuth docs](https://docs.audius.org/developers/guides/log-in-with-audius).

---

## Keywords (for search / AI)

Authentication, sign-in, login, sign-on, OAuth, authenticated gets, Hedgehog, identity service, `authService`, `createAuthService`, `signIn`, `signOut`, recovery.

## How to run (main app)

1. From repo root: `npm install` then `npm run ios:dev` or `npm run android:dev`.
2. Open the app; the first screen is the **sign-on** flow (sign in or create account).
3. To test sign-out: sign in, then use **Settings** (or profile) → Sign out.

No extra setup; the app uses staging identity by default (see `packages/mobile/.env.dev`).

## Source of truth (implementation)

| Concern | Location |
|--------|----------|
| Auth service (mobile) | `packages/mobile/src/services/sdk/auth.ts` – creates `authService` via `createAuthService`, wires `localStorage`, identity endpoint, key creation; exports `authService`, `getAudiusWalletClient`, `solanaWalletService`. |
| Sign-on UI (screens, stack) | `packages/mobile/src/screens/sign-on-screen/` – `SignOnStack.tsx`, `SignOnScreen`, `CreatePasswordScreen`, `PickHandleScreen`, `FinishProfileScreen`, `ConfirmEmailScreen`, etc. |
| Auth service (shared API) | `packages/common/src/services/auth/authService.ts` – `createAuthService`, `signIn(email, password, visitorId?, otp?)`, `signOut`, `resetPassword`, `getWallet`, `confirmCredentials`, `changeCredentials`. |
| Hedgehog / identity | `packages/common/src/services/auth/hedgehog.ts`, `identity.ts` – low-level Hedgehog instance and identity service integration. |
| Sign-in validation | `packages/common/src/schemas/sign-on/signInSchema.ts` – Zod schema for sign-in form. |

## Flow summary

- **Sign-in**: User enters email/password → `authService.signIn()` → Hedgehog `login()` → identity service → wallet stored; app navigates to main shell.
- **Sign-up**: Multi-step flow (sign on → confirm email → create password → pick handle → finish profile / genres / artists) driven by `SignOnStack` and sign-on redux/sagas.
- **Sign-out**: `authService.signOut()` (Hedgehog `logout()`); UI returns to sign-on.

Auth is **not** third-party OAuth (e.g. Google/Meta); it is email/password + Hedgehog-managed wallet against the Audius identity service.
