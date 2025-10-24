# @audius/sdk

## 6.0.11

### Patch Changes

- Updated dependencies [a6d5e9d]
- Updated dependencies [8b3380f]
- Updated dependencies [c3ffa17]
- Updated dependencies [284302b]
- Updated dependencies [86198ae]
  - @audius/sdk@11.1.0
  - @audius/spl@2.1.0

## 6.0.10

### Patch Changes

- Updated dependencies [1c969f6]
  - @audius/sdk@11.0.1

## 6.0.9

### Patch Changes

- Updated dependencies [4a21db9]
- Updated dependencies [51b2a0f]
- Updated dependencies [9c3ede0]
- Updated dependencies [4a21db9]
- Updated dependencies [1443320]
- Updated dependencies [f5b304c]
- Updated dependencies [f5e607a]
  - @audius/sdk@11.0.0

## 6.0.8

### Patch Changes

- Updated dependencies [93f4cf2]
- Updated dependencies [dc2f3de]
- Updated dependencies [9dadb38]
- Updated dependencies [8868474]
- Updated dependencies [7dcf0ae]
- Updated dependencies [0d7abfb]
- Updated dependencies [1f70f0b]
- Updated dependencies [308a773]
- Updated dependencies [8d7a624]
- Updated dependencies [8bcfb33]
- Updated dependencies [1026ce1]
- Updated dependencies [7b6695f]
- Updated dependencies [111beb0]
- Updated dependencies [d4ceab9]
- Updated dependencies [3011b29]
- Updated dependencies [235d434]
  - @audius/sdk@10.0.0
  - @audius/fixed-decimal@0.2.0

## 6.0.7

### Patch Changes

- Updated dependencies [f9efab9]
- Updated dependencies [2fb34d2]
- Updated dependencies [1870048]
- Updated dependencies [68d4a85]
- Updated dependencies [69e076b]
- Updated dependencies [80f84a0]
- Updated dependencies [2fb34d2]
- Updated dependencies [3f9bedf]
- Updated dependencies [4bd9fe8]
- Updated dependencies [af6158f]
- Updated dependencies [a5a5304]
- Updated dependencies [1b79555]
  - @audius/sdk@9.1.0
  - @audius/spl@2.0.2

## 6.0.6

### Patch Changes

- Updated dependencies [138921a]
- Updated dependencies [7d9dfb2]
- Updated dependencies [fbb4f34]
- Updated dependencies [fb32b3d]
- Updated dependencies [1ec2871]
- Updated dependencies [c8a0e06]
- Updated dependencies [09c6315]
- Updated dependencies [53fdcf9]
- Updated dependencies [cd0e6c0]
- Updated dependencies [1056ad1]
- Updated dependencies [3e4099c]
- Updated dependencies [a5a1ea4]
- Updated dependencies [b19692d]
- Updated dependencies [fcb5221]
- Updated dependencies [7aefb4c]
- Updated dependencies [202f0b3]
- Updated dependencies [0d08a9f]
- Updated dependencies [8bc0a7f]
- Updated dependencies [50ed5e1]
- Updated dependencies [e1db903]
- Updated dependencies [2edda3f]
  - @audius/sdk@9.0.0

## 6.0.5

### Patch Changes

- Updated dependencies [bb81005]
- Updated dependencies [b5f90c3]
- Updated dependencies [1452686]
- Updated dependencies [7e0f238]
  - @audius/sdk@8.0.1

## 6.0.4

### Patch Changes

- 0fc1fbe: Handle empty response in uploadFile
- Updated dependencies [a68bfef]
- Updated dependencies [993c856]
- Updated dependencies [0aed18e]
- Updated dependencies [4c89718]
- Updated dependencies [9453590]
- Updated dependencies [b8d09ab]
- Updated dependencies [b8d09ab]
- Updated dependencies [9402210]
- Updated dependencies [ea4205f]
- Updated dependencies [b2b8eb7]
- Updated dependencies [b7b38ba]
- Updated dependencies [65fd971]
- Updated dependencies [6322f3e]
- Updated dependencies [66fe1b0]
- Updated dependencies [b0ac142]
- Updated dependencies [0fc1fbe]
- Updated dependencies [a93a826]
- Updated dependencies [bec2090]
- Updated dependencies [9c8cc61]
- Updated dependencies [b3d902b]
- Updated dependencies [b0ac142]
- Updated dependencies [ba20259]
- Updated dependencies [b8d09ab]
- Updated dependencies [5303fb7]
- Updated dependencies [e872cbf]
- Updated dependencies [998e1f7]
- Updated dependencies [7a31de8]
  - @audius/sdk@8.0.0
  - @audius/spl@2.0.1

## 6.0.3

### Patch Changes

- Updated dependencies [5d76821]
  - @audius/sdk@7.1.0

## 6.0.2

### Patch Changes

- Updated dependencies [db3f11a]
- Updated dependencies [10668ce]
- Updated dependencies [3f7424e]
- Updated dependencies [41b62a5]
- Updated dependencies [3ad4d63]
- Updated dependencies [956a9ba]
- Updated dependencies [5c5bdd3]
- Updated dependencies [a2803dd]
  - @audius/sdk@7.0.0

## 6.0.1

### Patch Changes

- 969fd1f: add title to remixed tracks return
- Updated dependencies [0a2fe3d]
  - @audius/fixed-decimal@0.1.1

## 6.0.0

### Major Changes

- e28b82b: Fixed bug where RewardsProgram only handled 3 total attestations in the account.
  Changed IDs and specifiers for rewards claiming to be shorter so they can fit in a single Solana transaction.

  To update: Update usages of `decodeAttestationsAccountData` to include `maxAttestations`, which should be `minVotes + 1` from `rewardManagerStateData`.

### Patch Changes

- 9b58792: Breaking change to <user-id>/tracks/remixed endpoint. Patch bump because it's unused
- 9694ea4: Fix purchase flows with external wallets
- 6ee5f42: Fix for claiming rewards when all attestations were already submitted
- 0c3f791: Support cloudflare worker deployments
- Updated dependencies [e28b82b]
  - @audius/spl@2.0.0

## 5.1.0

### Minor Changes

- 1c2edae: Separate legacy "libs" exports into a different bundle. Legacy code can import libs via @audius/sdk/dist/libs

## 5.0.0

### Major Changes

- 1b494ff: Updates target, module, and lib to ES2022 to access new features such as Error.cause, updates @solana/web3.js, and updates SolanaRelay service to throw SendTransactionError on failure
- 92d4d81: Change AntiAbuseAttestionError to AntiAbuseOracleAttestationError
- 363af71: Change Solana program clients to use composition over inheritance

### Minor Changes

- 5fe7681: Add read/write methods for Comments
- 1c61e0b: fixes a number of model definitions used in /reposts
- 906f90a: Updates the track streaming endpoint to support no-redirect mode
- 1ba94b8: Add notifications API
- 847c075: Add splits to Purchase model when retrieving Sales/Purchases
- b957a52: Fix issue with confirming reward claims.
- fbb4256: added challenges APIs

### Patch Changes

- c83ca67: Chat blast RPC handler
- f75b571: fix stale signatures when auth address changes
- 2c1679a: Upgrade chat blasts to real chats internally
- 661cca7: Added SalesAggregate endpoint
- 11bf6e3: Don't decrypt plaintext chat.last_message
- 9a50c42: Fix instanceof check for version mismatches of @solana/web3.js and skip preflight on evaluateAttestations
- 0902048: Add stems support
- 17904fb: Add ComputeBudget unit price instructions (priority fees) to Solana transactions
- 75ab270: getChat + getMessages working for chat blasts
- 893ed42: Fix error handling and logger prefixes
- c382e82: Support plaintext messages
- f30a637: Adds endpoints for remixers and remixers count
- c34cd83: Adds method to record downloads to entity manager
- a17b30e: Updates to chats messageBlast function
- fdc7cf3: Fix purchases without network split
- 4bbfeff: Get purchasers endpoint
- 78897c4: Fix resolve support for playlists and users
- 1072f5a: Updates the Solana clients that take a mint to allow for PublicKey arguments in addition to token names, and renames the type from Mint to TokenName.
- ffd2ad3: add filtering support for manager endpoints
- f9e4525: Add chat blast method to sdk
- 826d3ae: Fix blast sender ID
- 842a762: Chat blast audienceContentType = track if remixer audience
- 0e6b44e: Rename getComments to getCommentReplies
- 58bdb34: Only spend payExtra amount on users, not on the network take rate.
- 1ccfcd4: Allow purchase/sale filtering by track or album ID
- 975b630: Improve error messages from Claimable Tokens program
- 7f17c95: Remove pagination from remixers count endpoint
- Updated dependencies [ebf9040]
- Updated dependencies [9a50c42]
- Updated dependencies [04f810a]
- Updated dependencies [975b630]
- Updated dependencies [f365f01]
  - @audius/fixed-decimal@0.1.0
  - @audius/spl@1.0.1

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
