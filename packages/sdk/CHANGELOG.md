# @audius/sdk

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
