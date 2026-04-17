# @audius/sdk

## 15.2.0

### Minor Changes

- 6c4c717: Add token expiry tracking to OAuth token stores and improve session reliability. `isAuthenticated()` now checks token expiry and attempts silent refresh when needed. `getUser()` retries with a fresh token on 401 instead of immediately throwing.

### Patch Changes

- 4b53e87: Add Authorization header and API identification to relay calls to support proper rate limiting

## 15.1.0

### Minor Changes

- 500dccb: Add artist coin solana connection flow

### Patch Changes

- d0f653d: Fix duplicate Bearer header prefix

## 15.0.1

### Patch Changes

- 56dea87: Fix PKCE OAuth access token not being sent with Bearer prefix, and fix `getUser()` calling the wrong endpoint (`/oauth/me` → `/me`)

## 15.0.0

### Major Changes

- 4f924fe: Consolidate Ethereum contract services into a single `EthereumService`

  The individual Ethereum contract client classes (`GovernanceClient`,
  `ClaimsManagerClient`, `ServiceProviderFactoryClient`,
  `EthRewardsManagerClient`, `ServiceTypeManagerClient`,
  `TrustedNotifierManagerClient`, `StakingClient`, `DelegateManagerClient`,
  `AudiusTokenClient`, `AudiusWormholeClient`, `RegistryClient`) have been
  removed from the SDK's `ServicesContainer`. They are replaced by a single
  `EthereumService` instance exposed at `sdk.services.ethereum`, which wraps
  each contract as a typed viem contract instance.

  **Before:**

  ```ts
  await sdk.services.governanceClient.getVotingPeriod();
  await sdk.services.claimsManagerClient.getPendingClaim(wallet);
  ```

  **After:**

  ```ts
  await sdk.services.ethereum.governance.read.getVotingPeriod([]);
  await sdk.services.ethereum.claimsManager.read.getPendingClaim([wallet]);
  ```

  Contract instances expose the full viem contract interface (`.read.*`,
  `.simulate.*`, `.write.*`, `.watchEvent.*`). ABIs and addresses are sourced
  from `@audius/eth` with optional per-environment overrides via
  `EthereumServiceConfig`.

- 383db12: OAuth: rewrite with PKCE, async login, and React Native support

  The OAuth service has been fully reworked. It now uses the OAuth 2.0
  Authorization Code Flow with PKCE. The implicit flow (Ethereum-signed JWT)
  has been removed. Tokens are persisted across sessions by default.

  `sdk.oauth` is now always defined — no null check or `!` assertion needed.

  React Native / Expo is now supported out of the box. See the [React Native / Expo](#react-native--expo) section below.

  ## Breaking changes

  ### Removed APIs

  | Removed                                          | Replacement                                        |
  | ------------------------------------------------ | -------------------------------------------------- |
  | `oauth.init({ successCallback, errorCallback })` | No replacement — call `login()` directly           |
  | `oauth.renderButton(element, options)`           | No replacement — build your own sign-in button     |
  | `LoginSuccessCallback` type                      | Use `login().then()` or `await login()`            |
  | `LoginErrorCallback` type                        | Use `login().catch()` or try/catch `await login()` |
  | `ButtonOptions` type                             | —                                                  |
  | `LoginResult` type                               | Call `oauth.getUser()` after login instead         |
  | `write_once` scope                               | Use `write` scope instead                          |
  | `WriteOnceParams` type                           | —                                                  |

  ### Changed APIs

  | API               | Before                            | After                                                                         |
  | ----------------- | --------------------------------- | ----------------------------------------------------------------------------- |
  | `login()`         | fire-and-forget, no `redirectUri` | `async`, returns `Promise<void>`; `redirectUri` optional if set in SDK config |
  | `hasRefreshToken` | synchronous getter (`boolean`)    | `async` method returning `Promise<boolean>`                                   |

  ### Added APIs

  | Added                          | Description                                                                                        |
  | ------------------------------ | -------------------------------------------------------------------------------------------------- |
  | `handleRedirect(url?: string)` | Completes the OAuth flow from the redirect page. On mobile, called automatically inside `login()`. |
  | `isAuthenticated()`            | `async` method returning `Promise<boolean>` — true if an access token is stored.                   |
  | `getUser()`                    | Fetches the authenticated user's profile using the stored access token.                            |

  ### `redirectUri`

  Set `redirectUri` once in the SDK config and it applies to every `login()` call. You can still pass it per-call to override the config value.

  ```ts
  // Set once:
  const sdk = audiusSdk({
    appName: "My App",
    apiKey: "YOUR_API_KEY",
    redirectUri: "https://yourapp.com/callback",
  });

  // Override per-call if needed:
  await sdk.oauth.login({
    scope: "write",
    redirectUri: "https://yourapp.com/other-callback",
  });
  ```

  A `redirectUri` must be available from one of these sources or `login()` will throw.

  ## Migration guide

  ### Before

  ```ts
  // Once on mount:
  sdk.oauth!.init({
    successCallback: (profile) => setUser(profile),
    errorCallback: (error) => setError(error.message),
  });

  // On sign-in button click:
  sdk.oauth!.login({ scope: "write", display: "popup" });
  ```

  ### After

  ```ts
  // Once at initialization:
  const sdk = audiusSdk({
    appName: "My App",
    apiKey: "YOUR_API_KEY",
    redirectUri: "https://yourapp.com/callback",
  });

  // On sign-in button click:
  try {
    await sdk.oauth.login({ scope: "write" });
    setUser(await sdk.oauth.getUser());
  } catch (error) {
    setError(error.message);
  }
  ```

  ### `write_once` scope

  Replace `write_once` with `write`.

  ### Callback page (`handleRedirect`)

  On your callback page, call `handleRedirect()`. In a popup it forwards the
  code to the parent window and closes itself; in a full-page redirect it
  performs the token exchange locally:

  ```ts
  await sdk.oauth.handleRedirect();
  // Popup: closes automatically and resolves the parent login() promise
  // Full-page redirect: token exchange complete — call getUser() next
  ```

  On **mobile** (React Native / Expo), the redirect is handled automatically
  inside `login()` — no call to `handleRedirect()` is needed.

  ## Registering a redirect URI

  Register your redirect URI(s) at [audius.co/settings](https://audius.co/settings) → Developer Apps.

  **Mobile** — use a custom URL scheme (e.g. `myapp://oauth/callback`) and register
  the scheme as an intent filter in your app's native config.

  **Local development** — register `http://localhost:PORT/callback` for your dev environment.

  ## React Native / Expo

  Import from `@audius/sdk` on React Native — the native entry point automatically:

  - Uses `AsyncStorage` for token persistence across app restarts
  - Uses `expo-web-browser` (`openAuthSessionAsync`) for the OAuth browser session, bypassing universal link interception

  No extra configuration is needed. `login()` resolves after the browser closes and
  the token exchange completes:

  ```ts
  const sdk = audiusSdk({
    appName: "My App",
    apiKey: "YOUR_API_KEY",
    redirectUri: "myapp://oauth/callback",
  });

  await sdk.oauth.login({ scope: "write" });
  const user = await sdk.oauth.getUser();
  ```

- e0e1ecb: Create SDK without services by default in all cases

  Updates the `sdk()` constructor to create the SDK without the old services and API structure regardless of config. This will align all configurations to have the same API surface that matches existing docs and examples.

  To maintain compatibility, older legacy apps can use `createSdkWithServices()` instead of `sdk()` when initting the SDK. This is not advised for third-party apps.

- 671fa83: Remove CommonJS build outputs from the SDK. The SDK now only ships ESM (`index.esm.js` and `index.browser.esm.js`). The `main` field in `package.json` now points to the ESM output. Consumers that relied on `require('@audius/sdk')` will need to switch to ESM imports.

### Minor Changes

- f79f7df: Generated API updates: track download counts, /me endpoint

  - Added `TracksApi.getTrackDownloadCount()` and `getTrackDownloadCounts()` from swagger
  - Added `UsersApi.getMe()` for the authenticated user endpoint
  - Fixed generator script (`gen.js` → `gen.cjs`) for ESM compatibility — the SDK package uses `"type": "module"` which caused Node to treat `.js` files as ESM, breaking the `require()`-based generator

### Patch Changes

- fc87e67: Fix preview in publishTrack if no previewCid present
- 7c775fc: Filter storage nodes to `*.audius.co` endpoints to improve upload success rates.
- 0866c3b: Minor fix to allow playlist uploads with album fields in the old entity manager schemas
- Updated dependencies [a744274]
  - @audius/eth@1.0.0

## 14.1.0

### Minor Changes

- 0cbaf44: Add support for OAuth2.0 PKCE access/refresh tokens
- 8fc2f10: Add accessAuthorities to track model

### Patch Changes

- e9ffc03: Support redirect_uri in entity manager writes
- bd1ed10: Fix creation of legacy playlists
- 7dfa92a: Update SDK with latest types

## 14.0.1

### Patch Changes

- e44d789: Do not coerce access authorities to undefined

## 14.0.0

### Major Changes

- d864806: Remove getPlaylistByHandleAndSlug in favor of getBulkPlaylists

  - Removes `sdk.playlists.getPlaylistByHandleAndSlug()` in favor of calling `sdk.playlists.getBulkPlaylists({ permalink: ['/handle/playlist/playlist-name-slug'] })`
  - Changes return values of `CommentsAPI` to match other APIs, removing `success` param.

### Minor Changes

- 71bb31b: Add programmable distribution config to stream_conditions

### Patch Changes

- 71bb31b: Fix missing bearer token for PUT /users
- a7a9e17: Fix create/upload/update playlist in legacy path

  - `publishTracks` returns string track IDs, which were being incorrectly parsed as though they were numbers that needed converting. This was changed behavior from recent SDK changes made to match the POST endpoints as this was working previously
  - `createPlaylist` wasn't equipped to handle using a preset `playlistId` like our client expects, rejecting calls that had `playlistId` already set in the metadata (which would happen on our creation of playlists from scratch).
  - `createPlaylistInternal` was being passed parsed parameters in the `createPlaylist` case, and unparsed in the `uploadPlaylist` case, and used types that made it hard to squeeze both callsites in. This was resulting in incorrectly setting some IDs to hash IDs (eg in `playlistContents`) and was uncovered when fixing the playlistId bug above
  - `updatePlaylist` had incorrect schema still referencing `coverArtCid` instead of `playlistImageSizesMultihash`, blocking any playlist updates that included an image update

- 8f12bb7: Fix cover art CID metadata properties for playlists and tracks.
- 6cb4b6f: Fix UploadsApi to make start() a function

## 13.1.0

### Minor Changes

- fdd1e54: Add register dev app key endpoint
- ad2d058: Added UploadsApi

## 13.0.1

### Patch Changes

- 7265a2e: Fix tests, fix return types of entity manager variation of APIs

## 13.0.0

### Major Changes

- 0129871: Rewrite write endpoints

  Write endpoints have gone an entire overhaul, and now will call the API conditionally to handle writes on behalf of apps if the EntityManager service is not initialized. In order to support this, and moving towards having this be the default path moving forward, the signatures for the writes have all changed to align with the autogenerated code from the API schema of the API write endpoints.

  Non-exhaustive list of changes (see updated dev docs post release for complete breakdown of methods):

  - Creating albums and playlists no longer lets you pass in track IDs separately. They must be part of the `playlistContents`
  - No more `advancedOptions` in order to match the required schema for the write endpoints in API. For now there's no replacement. Reach out if you desire these abilities again.
  - Most write method parameters now have top level `userId` and (if applicable) entity id (eg. `playlistId` for `updatePlaylist`) and a `metadata` field, to mirror the autogenerated code which separates the request path/query params and body. CommentsAPI for example has been affected greatly by this.
  - `updateUserProfile` is now `updateUser`
  - `addTrackToPlaylist`, `removeTrackToPlaylist` etc should _not_ be used going forward.
  - `updateCoinRequest` is now `metadata` in `updateCoin` method parameters.
  - USDC access gates for stream/download conditions now have splits formatted as a list with elements `user_id` and `percentage`
  - Authentication can now be done via a Bearer token when using the API routes

### Minor Changes

- 825a39d: Support bearer token initialization

### Patch Changes

- e376ade: Add/update user should use CID for photo/cover art

## 12.0.1

### Patch Changes

- 5233e16: Fix test

## 12.0.0

### Major Changes

- aa4e32c: Update track file uploads to use TUS protocol

  - `sdk.tracks.uploadTrack()`, `sdk.tracks.updateTrack()`, `sdk.playlists.uploadPlaylist()`, `sdk.playlists.updatePlaylist()`, `sdk.albums.uploadAlbum()`, `sdk.albums.updateAlbum()`, parameters have changed:
    - `trackFile`/`trackFiles` is now `audioFile`/`audioFiles`
    - `coverArtFile` is now `imageFile`
    - `onProgress` for tracks, playlists, and albums uploads/updates now has the form `(progress: number, event: { key: 'audio' | 'image' | number, loaded?: number, total?: number, transcode?: number }) => void`, where `progress` is a number between 0 and 1 showing the overall progress, `key` is a reference to what's being uploaded (where numbers are the index of the audio file in the case of albums/playlists), `loaded`/`total` are the number of bytes uploaded and total bytes, respectively, and `transcode` is a number between 0-1 of the transcode progress, if applicable.

  Audio file uploads will now autoretry three times on failure/network disconnect, and resume if there were pending uploads in local storage.

## 11.3.0

### Minor Changes

- 2059715: Add prize endpoint to SDK

## 11.2.0

### Minor Changes

- e7bcadf: adds coin reward code API methods

## 11.1.2

### Patch Changes

- 98da331: Claim vested coins
- Updated dependencies [0aef321]
  - @audius/fixed-decimal@0.2.1

## 11.1.1

### Patch Changes

- 40e5b07: Update hompeage URL

## 11.1.0

### Minor Changes

- 8b3380f: Add all time coin stats to coins api responses

### Patch Changes

- a6d5e9d: Add validator type and regen bootstrap list
- c3ffa17: remove dbc_pool from createCoin
- 86198ae: add coin_flair_mint field to user response
- Updated dependencies [284302b]
  - @audius/spl@2.1.0

## 11.0.1

### Patch Changes

- 1c969f6: fix comms requests failing due to extra /v1 prefix

## 11.0.0

### Major Changes

- 51b2a0f: Remove DiscoveryNodeSelector and related functionality
- f5e607a: removes unsupported nft-gated-signatures endpoint

### Minor Changes

- 4a21db9: Add RewardsAPI
- 1443320: add insights to coins endpoints

### Patch Changes

- 4a21db9: Remove membersChange24hrPercent
- 9c3ede0: Add token gate functionality with TokenGate, ExtendedTokenGate, and updated coin creation API
- f5b304c: Fix oauth login when no discovery node

## 10.0.0

### Major Changes

- d4ceab9: Replace getUserIDFromWallet with getUserIdsByAddresses

  Replaces `sdk.users.getUserIDFromWallet` with new endpoint `sdk.users.getUserIdsByAddresses`. The old SDK version method will continue to work but is deprecated and should be replaced with the new method. The new method not only looks for associated wallets but also the user's account wallet and any claimable token accounts (user banks).

  Also adds support for artist coins insights and updates the existing artist coins methods to match the backend.

### Minor Changes

- dc2f3de: Adds history, recently commented, and feeling lucky endpoints to non-full API
- 8868474: Add support for artist coin endpoints
- 7dcf0ae: add recently listed premium tracks API
- 8bcfb33: Adds explore/best_selling endpoint
- 7b6695f: Adds the getMostSharedTracks function to tracks API
- 111beb0: Adds user recommended tracks endpoint to SDK
- 3011b29: adds Share entity manager action

### Patch Changes

- 93f4cf2: Update Solana program clients to require `bigint` amounts

  Instead of relying on a mapping to preconfigured mints and using
  `@audius/fixed-decimal`, the Solana program clients are updated to support
  arbitrary mints.

- 9dadb38: Remix contest winner challenge
- 0d7abfb: Fix artist coins names
- 1f70f0b: Remix contest winners selected notification
- 308a773: Fix setting USDC payout wallet
- 8d7a624: Chat blast coin holders audience
- 1026ce1: Remove BN.js dependency
- 235d434: fix early consumption of request body in EM when request has an error
- Updated dependencies [1026ce1]
  - @audius/fixed-decimal@0.2.0

## 9.1.0

### Minor Changes

- 4bd9fe8: Add eventType to events endpoint
- af6158f: Adds missing pagination parameters for trending APIs

### Patch Changes

- f9efab9: Remix contest ended notification
- 2fb34d2: Export SolanaClient
- 1870048: export MAX_DESCRIPTION_LENGTH
- 68d4a85: Artist remix contest ending soon notification
- 69e076b: Add pinned comment challenge to valid challenge enums
- 80f84a0: Artist remix contest ended notification
- 3f9bedf: Add 'fan' prefix to remix contest notifs
- a5a5304: Add alpha version of challengesApi.claimAllRewards
- 1b79555: Remix contest submission milestone notification
- Updated dependencies [2fb34d2]
  - @audius/spl@2.0.2

## 9.0.0

### Major Changes

- 138921a: Update comment methods with 'get' prefix

### Minor Changes

- 7d9dfb2: Add archiver service
- fb32b3d: Update add/remove wallet to use new transaction types
- c8a0e06: Add support for fetching collectibles
- 1056ad1: Adds support for updating user collectibles preferences
- 3e4099c: Remove metadata_multihash from user responses
- b19692d: Skip adding signature headers if they are passed in RequestInit
- 0d08a9f: Add events endpoint
- 8bc0a7f: Use AAO discovery plugin
- 50ed5e1: Use static endpoint for apis except for challenges
- 2edda3f: Pass playlist_contents in updated format

### Patch Changes

- fbb4f34: key fix for UpdateProfile
- 1ec2871: remove unused notification data fields
- 09c6315: Add c challenge
- 53fdcf9: Add priority fees to Challenge Rewards Claiming
- cd0e6c0: Add tastemaker challenge
- a5a1ea4: Remove old listen streak challenge
- fcb5221: Add new listen streak challenge to allow list
- 7aefb4c: get event by entity ID endpoint
- 202f0b3: Add support for setting compute budget limit, add multiplier for priority fee percentile.
- e1db903: Added play count milestones to challenge types

## 8.0.1

### Patch Changes

- bb81005: Add decorator of AudiusWalletClient to exports, increase signature header expiry
- b5f90c3: Make CreateAlbumSchema coverArt optional
- 1452686: Add support for allowAiAttribution when creating a user
- 7e0f238: Update bootstrap config

## 8.0.0

### Major Changes

- b7b38ba: Rewrite authentication service to be a Viem-like AudiusWalletClient instead, and restructure the ethereum contract clients to leverage Viem more effectively.

### Minor Changes

- 993c856: getUserMonthlyTrackListens in Users API
- b8d09ab: Add uploadTrackFiles, writeTrackToChain, and generateTrackId to TracksApi
- b8d09ab: Update onProgress type to ProgressHandler
- 6322f3e: Add user/<id>/playlists and user/<id>/albums
- b0ac142: Add generatePreview and delete editFile in Storage
- a93a826: Update track upload/update metadata schema to expect numeric ids in AccessConditions
- 9c8cc61: Update full playlist.tracks response type
- b3d902b: Mutual follows method
- b0ac142: Rename `transcodePreview` -> `generatePreview` in the updateTrack params
- ba20259: Add support for new stream, download, and preview fields on tracks with mirrors
- b8d09ab: Fix signing of uploadTrack and editTrack requests

### Patch Changes

- a68bfef: Replace deprecated sign with signMessage
- 0aed18e: Move plays health back to where it was for now
- 4c89718: expose addRequestSignatureMiddleware
- 9453590: Expand accepted audio mimemtypes to audio/\*
- 9402210: move solana/web3.js to peer deps
- ea4205f: Allow 0 to be passed as previewStartSeconds
- b2b8eb7: Allow releaseDate in the future. Update zod schemas to no longer be functions
- 65fd971: Fixes for UserAuth and missing crypto method in Node environments
- 66fe1b0: Update createAppWalletClient to be object args and allow non-0x prefixed values
- 0fc1fbe: Handle empty response in uploadFile
- bec2090: deprecate Playlist.addedTimestamps
- 5303fb7: Fix concurrent getOrCreateUserBank requests
- e872cbf: Fix Wormhole Client to match typo in solidity contract (artbiter)
- 998e1f7: Fix getOrCreateUserBank failures due to low priority fees
- 7a31de8: Support different @solana/web3.js versions and add maximumMicroLamports to priority
- Updated dependencies [9402210]
- Updated dependencies [b7b38ba]
- Updated dependencies [e872cbf]
- Updated dependencies [aef5021]
  - @audius/spl@2.0.1
  - @audius/eth@0.1.0

## 7.1.0

### Minor Changes

- 5d76821: Better support for premium albums

## 7.0.0

### Major Changes

- db3f11a: BREAKING CHANGE: Removes legacy SDK ('libs') from this package.
- a2803dd: Update sdk.challenges.generateSpecifier signature

### Patch Changes

- 10668ce: Add location util
- 3f7424e: Improvements to blast upgrade flow
- 41b62a5: fix concurrency issue with addRequestSignatureMiddleware
- 3ad4d63: Chat permissions accepts permit_list
- 956a9ba: Updated services bootstrap
- 5c5bdd3: Fix purchasing tracks and albums with external wallet

## 4.2.0

### Minor Changes

- ca9fbd6: Support stem file upload in sdk

### Patch Changes

- fa19828: Update social verification
- 667037e: updates stream and download endpoints to allow specifying current user
- 3ef78ea: Remove unused user_id parameter from track history endpoint

## 4.1.0

### Minor Changes

- 15a34b3: Add getUsers and getPlaylists methods

## 4.0.0

### Major Changes

- ae044c0: Resurface aao error code when claiming audio rewards
- f005b25: Allow configuration by environment, remove config barrel file
- d9420a9: Change type filter on getUSDCTransactions to be an array rather than a single enum, to allow for multiple filters.
- 3072759: Improve AAO error handling when claiming rewards

### Minor Changes

- 276f714: Add sdk.albums.purchase()
- df0349a: added endpoints for fetching user management relationships
- 75169cf: Update to use PaymentRouterProgram in @audius/spl and enable track purchase in SDK
- 3e83e02: renames GetSupportings to GetSupportedUsers and fixes types

### Patch Changes

- 4503cc7: Using discovery relay for ACDC is not the default behavior.
- 342d610: Add ownerWallet to discovery node services, and fix getUniquelyOwnedEndpoints to use that instead of delegateOwnerWallet.
- Updated dependencies [b65db45]
- Updated dependencies [b65db45]
- Updated dependencies [deb3f2a]
- Updated dependencies [75169cf]
  - @audius/spl@1.0.0
