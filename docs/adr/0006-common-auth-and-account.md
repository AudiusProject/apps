# 0006. Auth and account in common

- Status: Accepted
- Date: 2026-11-21

## Context

Sign-in, Hedgehog wallet compatibility, account state and manager mode. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `adapters/user.ts`

- accountFromSDK in adapters/user.ts spreads account metadata outside the user object too so those values can be cached separately. ([L172](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/adapters/user.ts#L172))

### `api/tan-query/tracks/useTrackByPermalink.ts`

- useTrackByPermalink waits for account status SUCCESS or ERROR before querying so the request is made with the correct current user id. ([L68](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/tracks/useTrackByPermalink.ts#L68))

### `api/tan-query/users/account/useAccountStatus.ts`

- useAccountStatus's queryFn should never run; the data is written by useCurrentAccount, so the queryFn is just a fallback with infinite staleTime/gcTime. ([L14](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/users/account/useAccountStatus.ts#L14))

### `api/tan-query/users/account/useCurrentAccount.ts`

- useCurrentAccount uses the cached local account as placeholderData (not initialData) so the UI renders immediately but server data replaces it once it arrives. ([L173](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/users/account/useCurrentAccount.ts#L173))

### `api/tan-query/users/account/useWalletUser.ts`

- getWalletAccountQueryFn returns null on error because the API 404s for users with an incomplete signup, letting sign-in redirect to account completion. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/users/account/useWalletUser.ts#L53))
- In useWalletUser.ts, web3User is the wallet that originally signed in, which can be a manager acting as another user, distinct from currentUser. ([L131](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/users/account/useWalletUser.ts#L131))

### `context/appContext.ts`

- AppContext.reloadApp is optional: mobile provides an app restart after account switch, while web falls back to a full page reload. ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/context/appContext.ts#L31))

### `hooks/useChangeEmailFormConfiguration.ts`

- isInvalidCredentialsError in useChangeEmailFormConfiguration checks the raw response shape because the error comes from Hedgehog, not an SDK RequestError. ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useChangeEmailFormConfiguration.ts#L13))

### `hooks/useGetDiscordOAuthLink.ts`

- useGetDiscordOAuthLink signs a random character and exchanges it with the Discord bot for a JWT passed through Discord OAuth, so the server can verify the signer without exposing details in query params. ([L15](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useGetDiscordOAuthLink.ts#L15))

### `services/auth/authService.ts`

- In authService GetWalletAddressesResult, accountWalletAddress is the acting-as (managed) user and web3WalletAddress is the signed-in user. ([L21](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/authService.ts#L21))

### `services/auth/hedgehog.ts`

- hedgehog.ts getAuthHeaders signs with EIP-191 personal_sign, producing the same bytes as eth-sig-util personalSign so identity accepts the signatures. ([L49](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehog.ts#L49))

### `services/auth/hedgehogLib/Authentication.ts`

- Every function in hedgehogLib/Authentication.ts must stay byte-for-byte compatible with @audius/hedgehog 3.0.0-alpha.1 (bip39 3.0.4, ethereumjs-wallet hdkey, aes-256-cbc); any change locks users out. hedgehogLib.test.ts is the equivalence suite. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/Authentication.ts#L1))
- entropyToMnemonic in Authentication.ts mirrors bip39 3.0.4: it decodes hex like Buffer.from(hex, "hex") and accepts 16-32 bytes in multiples of 4. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/Authentication.ts#L24))
- verifyDecryptString in Authentication.ts uses TextDecoder with ignoreBOM to match Buffer#toString("utf8"), which keeps a leading BOM. ([L114](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/Authentication.ts#L114))

### `services/auth/hedgehogLib/HedgehogWallet.ts`

- HedgehogWallet replaces the ethereumjs-wallet Wallet and its string getters keep the same 0x-prefixed lowercase hex formats. ([L4](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/HedgehogWallet.ts#L4))

### `services/auth/hedgehogLib/WalletManager.ts`

- WalletManager.createAuthLookupKey lowercases the username so the lookup key is generated consistently for the identity database lookup. ([L73](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/WalletManager.ts#L73))
- WalletManager.createAuthLookupKey uses a hardcoded IV so the lookup key is deterministic for the same username and password. ([L75](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/WalletManager.ts#L75))
- WalletManager.getEntropyFromLocalStorage treats the string "undefined" as missing because it was sometimes written to localStorage. ([L85](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/WalletManager.ts#L85))

### `services/auth/hedgehogLib/hedgehogLib.test.ts`

- hedgehogLib.test.ts is the equivalence suite: the vendored hedgehog must derive the same keys, ciphertexts, signatures and read the same stored state as @audius/hedgehog 3.0.0-alpha.1, or users get locked out. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/hedgehogLib.test.ts#L1))
- In hedgehogLib.test.ts, ciphertext with a partial final block decrypts to garbage in browserify-cipher but throws in the new decrypt; both end in failed login, which is the asserted equivalence. ([L326](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/hedgehogLib.test.ts#L326))
- hedgehogLib.test.ts scrypt vectors come from scrypt-js@2.0.4 + buffer as loaded by the old jsdelivr web worker, with the same inputs and JSON round-trip. ([L393](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/hedgehogLib.test.ts#L393))

### `services/auth/hedgehogLib/scrypt.ts`

- In hedgehogLib/scrypt.ts, changing SCRYPT_PARAMS or input encoding changes every user key; the ivHex string utf8 bytes (not decoded hex) are the salt. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/scrypt.ts#L6))
- createKeySync in scrypt.ts blocks for about a second and must only run off the main thread. ([L17](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/scrypt.ts#L17))

### `services/auth/hedgehogLib/utils.ts`

- hexToBytesLikeBuffer in hedgehogLib/utils.ts decodes like Node Buffer.from(str, "hex"): stops at the first invalid pair and drops a trailing odd nibble. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/utils.ts#L28))
- getPlatformCreateKey in hedgehogLib/utils.ts runs scrypt on the calling thread, so web supplies a worker-based createKey and mobile a native one. ([L72](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/utils.ts#L72))

### `services/local-storage/LocalStorage.ts`

- LocalStorage keeps an in-memory syncCache so getItemSync returns real values on RN where AsyncStorage is async; on web it is a no-op. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/local-storage/LocalStorage.ts#L24))
- LocalStorage.preloadSyncKeys must run once at app boot before mounting React so useCurrentAccount placeholderData can read keys synchronously. ([L33](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/local-storage/LocalStorage.ts#L33))
- LocalStorage.getItemSync returns null when the underlying getItem is a Promise (AsyncStorage); callers must preload the key first. ([L59](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/local-storage/LocalStorage.ts#L59))

### `services/oauth/formatSocialProfile.ts`

- formatTikTokProfile truncates handles over MAX_HANDLE_LENGTH and flags for user review; verified users cannot claim verification if the handle does not match. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/oauth/formatSocialProfile.ts#L41))

### `store/account/sagas.ts`

- handleFetchTrackCount trusts account track_count since the account endpoint fetches the user as themselves, so it includes unlisted tracks (excludes deleted and stems). ([L73](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/account/sagas.ts#L73))
- fetchAccountAsync records IP via spawn, not fork, so callers do not wait on identity; it is not needed for the account to be usable. ([L233](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/account/sagas.ts#L233))
- Chat blockee/blocker lists are fetched after a delay post-account load since only chat send checks read them and failed sends refetch. ([L256](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/account/sagas.ts#L256))
- Account saga sets walletAddresses so useCurrentAccount/useWalletAddresses work; without it components depending on currentUserWallet stay disabled. ([L339](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/account/sagas.ts#L339))
- setLocalStorageAccountAndUser prefers cached user data over the server response so optimistic mutations not yet on all validator nodes are not overwritten. ([L375](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/account/sagas.ts#L375))
