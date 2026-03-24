# Auth / Sign-in Example

Two ways to do **authentication** with Audius:

1. **Main app (Hedgehog)**: Email/password sign-in, sign-up flow, Hedgehog-based wallet/identity (see Source of truth below).
2. **Runnable Expo app (OAuth)**: Simple OAuth sign-in at audius.co; after sign-in you get the user’s profile and can use the SDK for authenticated GETs in your code. This folder contains the example.

## Runnable OAuth example (this directory)

Expo app: **Sign in with Audius** using the SDK’s OAuth (PKCE). Tokens are stored in AsyncStorage and the SDK automatically adds authorization headers to subsequent requests. No WebView or manual redirect handling.

### Requirements

- **API key** from [audius.co/settings](https://audius.co/settings) → Developer Apps
- **Redirect URI** registered for this example: `audiusauth://oauth/callback`

### How to run

From the **apps repo root**:

```bash
npm install
npm run build -w @audius/sdk
cd packages/mobile/examples/auth-sign-in
cp .env.example .env
# Edit .env: set EXPO_PUBLIC_AUDIUS_API_KEY to your API key
npm install
npx expo start
```

Press `i` (iOS) or `a` (Android). Tap **Sign in with Audius** → complete login in the system browser (expo-web-browser) → you’ll see your profile and feed, and **Sign out**.

Or from repo root: `npm run mobile:example:auth-sign-in` (after `npm install` in the example dir once).

### Source

| File | Purpose |
|------|--------|
| `src/sdk.ts` | `getSDK()` — single SDK instance with `apiKey` and `redirectUri`; OAuth tokens stored via AsyncStorage. |
| `App.tsx` | `oauth.login()`, `oauth.getUser()`, `oauth.isAuthenticated()`, `oauth.logout()`; feed and playback. |

Flow: `oauth.login({ scope: 'read' })` opens the consent screen (expo-web-browser), completes PKCE, and stores tokens. Use `getSDK()` for all requests; the SDK adds auth headers when the user is signed in. See [Log in with Audius](https://docs.audius.co/developers/guides/log-in-with-audius).

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
