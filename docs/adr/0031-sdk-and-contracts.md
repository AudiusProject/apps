# 0031. SDK internals and contracts

- Status: Accepted
- Date: 2026-11-21

## Context

Non-public SDK internals, Solana programs (`spl`), Ethereum contracts (`eth`) and `fixed-decimal`: units, encodings and protocol rules. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `packages/eth/src/audius-token/audiusToken.ts`

- The AUDIO ERC-20 contract has 18 decimals and supports EIP-2612 permit() approvals, which the eth package's domain config is for. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/eth/src/audius-token/audiusToken.ts#L3))

### `packages/eth/src/audius-wormhole/audiusWormhole.ts`

- AudiusWormhole is Audius's permit-able client for sending tokens through the Wormhole Portal, distinct from the standard Wormhole contracts and from wAUDIO on Solana. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/eth/src/audius-wormhole/audiusWormhole.ts#L3))

### `packages/eth/src/service-type-manager/serviceTypeManager.ts`

- VALIDATOR_SERVICE_TYPE is the bytes32 right-zero-padded encoding of 'validator' used by ServiceTypeManager and ServiceProviderFactory. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/eth/src/service-type-manager/serviceTypeManager.ts#L3))

### `packages/fixed-decimal/src/FixedDecimal.ts`

- FixedDecimal.toLocaleString derives the decimal separator from a Number because React Native ignores minimumFractionDigits when formatting bigint. ([L502](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/fixed-decimal/src/FixedDecimal.ts#L502))

### `packages/sdk/src/index.native.ts`

- In the native sdk() entry, sdkInstance is a let with a definite-assignment assertion because defaultOpenUrl closes over it, and login() can only run after sdk() returns. ([L22](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/index.native.ts#L22))
- defaultOpenUrl in the native SDK uses require('expo-web-browser') rather than dynamic import() so Metro can resolve the optional module statically at bundle time. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/index.native.ts#L32))

### `packages/sdk/src/sdk/api/chats/ChatsApi.ts`

- When upgrading blasts to chats in ChatsApi, message_id is blast_id + pending_chat_id in that order to match Misc.BlastMessageID in the comms server. ([L937](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/chats/ChatsApi.ts#L937))

### `packages/sdk/src/sdk/api/chats/serverTypes.ts`

- serverTypes.ts in the SDK chats API must not import anything because it is fed to quicktype to generate Go types and quicktype cannot track imports. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/chats/serverTypes.ts#L1))
- The websocket RPC data field in SDK serverTypes is typed any because quicktype's Go output handles union types poorly; client types override it. ([L289](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/chats/serverTypes.ts#L289))

### `packages/sdk/src/sdk/api/comments/CommentsAPI.ts`

- CommentsApi.createComment passes the caller's entityType (Track or Event) through instead of hardcoding Track so Event comments keep entity_type on-chain. ([L160](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/comments/CommentsAPI.ts#L160))
- CommentsApi.createComment forwards videoUrl on the non-FanClub path so Event post updates carry the embed the indexer renders. ([L169](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/comments/CommentsAPI.ts#L169))

### `packages/sdk/src/sdk/api/events/types.ts`

- EntityManagerFollowEventSchema uses numeric IDs and is submitted client-side via the entity manager, unlike the generated FollowEventRequest which uses hashids against /events/{id}/follow with OAuth. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/events/types.ts#L40))

### `packages/sdk/src/sdk/api/generator/gen.js`

- The SDK generator gen.js only generates the default v1 client because the v1/full API flavor is no longer used. ([L98](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/generator/gen.js#L98))

### `packages/sdk/src/sdk/api/notifications/NotificationsApi.ts`

- When marking notifications viewed, NotificationsApi sets entityId to the user's own id because the user is the entity whose notifications are being viewed. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/notifications/NotificationsApi.ts#L41))

### `packages/sdk/src/sdk/api/playlists/PlaylistsApi.ts`

- PlaylistsApi's getCurrentTimestamp returns Unix seconds because client-generated playlist_contents entry timestamps are expected in seconds, not milliseconds. ([L62](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/playlists/PlaylistsApi.ts#L62))

### `packages/sdk/src/sdk/api/tracks/TracksApi.ts`

- TracksApi.updateTrack only regenerates a preview when no new audio file is uploaded, because uploading audio already produces the preview. ([L541](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/tracks/TracksApi.ts#L541))

### `packages/sdk/src/sdk/api/tracks/types.ts`

- Track metadata collaborators are numeric user ids indexed by the ETL as pending invites; each tagged artist must accept before the credit is active. ([L156](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/tracks/types.ts#L156))
- Upload request types declare onProgress manually instead of via zod because z.function() does not support named arguments. ([L268](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/tracks/types.ts#L268))
- UploadTrackFilesSchema requires an explicit userId, never derived from auth, because manager and developer-app sessions act for multiple users and the validator attests the audio was uploaded for that user, which makes the cids claimable; without the claim, publishing fails under content authorization. ([L275](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/tracks/types.ts#L275))
- UpdateTrack request types declare onProgress manually instead of via zod because z.function() does not support named arguments. ([L298](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/tracks/types.ts#L298))
- In TrackCollaboratorSchema, userId is the tagged collaborator accepting, declining or leaving, and trackId is the track they were tagged on. ([L331](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/tracks/types.ts#L331))

### `packages/sdk/src/sdk/api/users/UsersApi.test.ts`

- wAUDIO on Solana has 8 decimals, so 1 AUDIO is 100000000 base units in tip amounts. ([L270](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/users/UsersApi.test.ts#L270))

### `packages/sdk/src/sdk/api/users/types.ts`

- User upload request types declare onProgress manually instead of via zod because z.function() does not support named arguments. ([L59](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/users/types.ts#L59))
- UpdateProfile request types declare onProgress manually instead of via zod because z.function() does not support named arguments. ([L165](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/api/users/types.ts#L165))

### `packages/sdk/src/sdk/createSdk.ts`

- createSdk's accessToken callback switches on 'OAuth2' and 'BearerAuth', which are the securitySchemes names in the OpenAPI spec. ([L125](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/createSdk.ts#L125))
- For the OAuth2 scheme, createSdk's accessToken callback adds the 'Bearer ' prefix itself because openapi-generator's typescript-fetch template does not (openapi-generator issue 12514). ([L127](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/createSdk.ts#L127))
- For the BearerAuth scheme, createSdk returns the raw bearer token because the generated template adds the 'Bearer ' prefix. ([L135](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/createSdk.ts#L135))
- createSdk's accessToken callback returns bearerToken for any other scheme to stay compatible with older SDK versions. ([L138](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/createSdk.ts#L138))

### `packages/sdk/src/sdk/createSdkWithServices.ts`

- createSdkWithServices builds the Solana client, program clients and Ethereum contracts as lazy facades that load @solana/web3.js, anchor, @audius/spl and ABIs on first use so creating the SDK does not pull them in. ([L258](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/createSdkWithServices.ts#L258))
- createSdkWithServices' accessToken callback switches on 'OAuth2' and 'BearerAuth', the securitySchemes names in the OpenAPI spec. ([L404](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/createSdkWithServices.ts#L404))
- For OAuth2, createSdkWithServices adds the 'Bearer ' prefix itself because openapi-generator's template does not (openapi-generator issue 12514). ([L406](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/createSdkWithServices.ts#L406))
- For BearerAuth, createSdkWithServices returns the raw token because the generated template adds the 'Bearer ' prefix. ([L414](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/createSdkWithServices.ts#L414))
- createSdkWithServices returns bearerToken for any other auth scheme to stay compatible with older SDK versions. ([L417](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/createSdkWithServices.ts#L417))

### `packages/sdk/src/sdk/middleware/addRequestSignatureMiddleware.ts`

- addRequestSignatureMiddleware refreshes the signature under a mutex so concurrent requests cannot race and revert the cached signature to an older one. ([L42](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/middleware/addRequestSignatureMiddleware.ts#L42))
- On signing failure, addRequestSignatureMiddleware clears the cached message and signature so a stale signature is not sent after logout. ([L85](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/middleware/addRequestSignatureMiddleware.ts#L85))
- addRequestSignatureMiddleware does not warn on HedgehogWalletNotFoundError because it is the normal state for a logged-out user. ([L90](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/middleware/addRequestSignatureMiddleware.ts#L90))

### `packages/sdk/src/sdk/middleware/addTokenRefreshMiddleware.ts`

- addTokenRefreshMiddleware skips refresh on 401 when there is no refresh token so unauthenticated calls do not trigger noisy error callbacks. ([L29](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/middleware/addTokenRefreshMiddleware.ts#L29))
- addTokenRefreshMiddleware shares one in-flight refreshAccessToken call across concurrent 401s so the refresh token is not redeemed multiple times. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/middleware/addTokenRefreshMiddleware.ts#L34))

### `packages/sdk/src/sdk/oauth/OAuth.ts`

- OAuth.login also writes CSRF state, PKCE verifier and redirect URI to sessionStorage because a full-page redirect destroys the JS instance; popup and mobile flows use the instance fields. ([L131](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/oauth/OAuth.ts#L131))
- OAuth redirect handling checks for an error param (e.g. access_denied when the user cancels consent) and settles the login promise so callers are not left hanging. ([L498](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/oauth/OAuth.ts#L498))
- When running in the login popup, OAuth posts code and state to window.opener and closes, since the opener's \_receiveMessage holds the PKCE verifier and does the exchange. ([L512](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/oauth/OAuth.ts#L512))
- After a redirect login, OAuth removes code and state from the URL via history so stale bookmarks do not replay a used authorization code. ([L552](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/oauth/OAuth.ts#L552))

### `packages/sdk/src/sdk/oauth/tokenStoreAsyncStorage.test.ts`

- tokenStoreAsyncStorage.test imports TokenStoreAsyncStorage dynamically after vi.mock so the AsyncStorage mock is in place before the module loads. ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/oauth/tokenStoreAsyncStorage.test.ts#L13))

### `packages/sdk/src/sdk/scripts/generateServicesConfig.ts`

- generateServicesConfig filters storage nodes to the canonical Audius-operated endpoints to improve upload success and avoid lower-reliability third-party nodes. ([L197](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/scripts/generateServicesConfig.ts#L197))

### `packages/sdk/src/sdk/services/AntiAbuseOracleSelector/AntiAbuseOracleSelector.ts`

- AntiAbuseOracleSelector's onError reselects a healthy AAO and retries via context.fetch so the request is retried exactly once rather than looping through middleware. ([L52](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/AntiAbuseOracleSelector/AntiAbuseOracleSelector.ts#L52))

### `packages/sdk/src/sdk/services/AudiusWalletClient/createHedgehogWalletClient.ts`

- createHedgehogWalletClient resolves the account lazily because Hedgehog restores the wallet from storage asynchronously, so no account exists at construction time. ([L45](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/AudiusWalletClient/createHedgehogWalletClient.ts#L45))
- createHedgehogWalletClient ignores HedgehogWalletNotFoundError during lazy init because the user may not be logged in; it only throws when an action needs a wallet. ([L76](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/AudiusWalletClient/createHedgehogWalletClient.ts#L76))
- createHedgehogWalletClient reimplements each wallet action to await the account first, since Hedgehog restores wallets via async storage calls. ([L83](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/AudiusWalletClient/createHedgehogWalletClient.ts#L83))

### `packages/sdk/src/sdk/services/Encryption/EmailEncryptionService.ts`

- EmailEncryptionService caches the in-flight decrypt promise rather than the result so concurrent requests for the same key share one decryption. ([L76](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Encryption/EmailEncryptionService.ts#L76))

### `packages/sdk/src/sdk/services/EntityManager/EntityManagerClient.ts`

- EntityManagerClient validation accepts entityId 0 because some ManageEntity actions legitimately use 0. ([L231](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/EntityManager/EntityManagerClient.ts#L231))
- EntityManagerClient validation accepts empty-string metadata because some ManageEntity actions send no metadata. ([L234](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/EntityManager/EntityManagerClient.ts#L234))

### `packages/sdk/src/sdk/services/EntityManager/contract/EntityManagerContract.ts`

- The ManageEntity EIP-712 types use 'uint' for userId and entityId; changing to uint32 would break signature recovery on the relay and in indexing. ([L17](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/EntityManager/contract/EntityManagerContract.ts#L17))

### `packages/sdk/src/sdk/services/Ethereum/LazyEthereumService.ts`

- LazyEthereumService proxies never report a 'then' property, otherwise awaiting the lazy contract stand-in would treat it as a thenable. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Ethereum/LazyEthereumService.ts#L28))
- The lazy contract's abi property is non-enumerable because its getter throws before load, and spreading or logging the contract would otherwise trigger it. ([L93](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Ethereum/LazyEthereumService.ts#L93))

### `packages/sdk/src/sdk/services/Solana/SolanaRelay.ts`

- SolanaRelay.relay converts relay ResponseErrors back into the original SendTransactionError when possible so callers see a normal Solana error. ([L145](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/SolanaRelay.ts#L145))
- SolanaRelay.relay tolerates non-JSON error bodies and surfaces the original ResponseError instead of a SyntaxError. ([L149](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/SolanaRelay.ts#L149))

### `packages/sdk/src/sdk/services/Solana/programs/ClaimableTokensClient/ClaimableTokensClient.ts`

- ClaimableTokensClient.getOrCreateUserBank awaits any pending creation for the same user bank and returns didExist=true without retrying, to avoid reintroducing concurrent creates. ([L140](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/programs/ClaimableTokensClient/ClaimableTokensClient.ts#L140))
- ClaimableTokensClient keeps the per-user-bank promise after success as an in-memory existence cache to reduce RPC calls, and deletes it only on error so the next attempt retries. ([L179](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/programs/ClaimableTokensClient/ClaimableTokensClient.ts#L179))

### `packages/sdk/src/sdk/services/Solana/programs/LazySolanaClient.ts`

- LazySolanaClient.connection starts loading the real client before throwing, so a retry after the next await can succeed. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/programs/LazySolanaClient.ts#L34))

### `packages/sdk/src/sdk/services/Solana/programs/PaymentRouterClient/PaymentRouterClient.ts`

- PaymentRouterClient creates the associated token account with the idempotent instruction because another party may create it concurrently between the lookup and the create. ([L217](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/programs/PaymentRouterClient/PaymentRouterClient.ts#L217))

### `packages/sdk/src/sdk/services/Solana/programs/RewardManagerClient/RewardManagerClient.ts`

- RewardManagerClient decodes up to minVotes + 1 attestations because the anti-abuse oracle adds one attestation on top of the validator votes. ([L273](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/programs/RewardManagerClient/RewardManagerClient.ts#L273))

### `packages/sdk/src/sdk/services/Solana/programs/SolanaClient.ts`

- SolanaClient.buildTransaction rounds the priority fee because setComputeUnitPrice converts to BigInt, which throws on fractional microLamports. ([L131](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/programs/SolanaClient.ts#L131))

### `packages/sdk/src/sdk/services/Solana/programs/types.ts`

- TransactionInstructionSchema validates structurally instead of instanceof TransactionInstruction because separate @solana/web3.js copies fail instanceof checks. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/programs/types.ts#L32))
- AddressLookupTableAccountSchema validates structurally instead of instanceof because separate @solana/web3.js copies fail instanceof checks. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/programs/types.ts#L53))

### `packages/sdk/src/sdk/services/Solana/types.ts`

- FirstBuyQuoteRequest.audioInputAmount is a string in AUDIO base units (lamports), not whole tokens. ([L152](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/types.ts#L152))
- FirstBuyQuoteRequest.tokenOutputAmount is a stringified integer in the artist coin's 9-decimal base units. ([L155](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/types.ts#L155))
- ClaimFeesResponse.claimFeeTxs are base64-encoded serialized Solana transactions for the client to sign. ([L171](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/types.ts#L171))
- ClaimVestedCoinsResponse.claimVestedCoinsTxs are base64-encoded serialized Solana transactions for the client to sign. ([L182](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/types.ts#L182))
- SwapCoinQuoteRequest.inputAmount is a stringified bigint in the input token's raw base units, not a decimal amount. ([L192](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/types.ts#L192))
- SwapCoinQuoteResponse.outputAmount is expressed in the output token's raw base units. ([L198](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/types.ts#L198))
- SwapCoinRequest.inputAmount is a stringified bigint in the input token's raw base units, not a decimal amount. ([L202](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/types.ts#L202))
- SwapCoinResponse.transaction is a base64-encoded serialized Solana transaction for the client to sign. ([L211](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/types.ts#L211))
- SwapCoinResponse.outputAmount is expressed in the output token's raw base units. ([L212](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/types.ts#L212))
- SwapCoinResponse.includedFeeInputAmount is the exact input amount consumed including fees, which can differ from the requested inputAmount. ([L213](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Solana/types.ts#L213))

### `packages/sdk/src/sdk/services/Storage/Storage.test.ts`

- Storage.generatePreview sends the user id as a query parameter naming who the preview is attested to; the validator refuses users that do not claim the source cid, so it is an assertion rather than a credential. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Storage/Storage.test.ts#L24))
- Storage polling only waits for a '320' transcode result on audio uploads; image resizes never produce one. ([L164](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Storage/Storage.test.ts#L164))

### `packages/sdk/src/sdk/services/Storage/Storage.ts`

- Storage dynamically imports tus-js-client only when an upload starts so it stays out of the SDK's initial bundle. ([L21](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Storage/Storage.ts#L21))
- In Node, Storage unwraps the zod-validated NodeFile wrapper to its Buffer because tus-js-client accepts only Buffer or ReadStream sources. ([L75](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Storage/Storage.ts#L75))
- Storage forwards polling failures from tus onSuccess to the upload promise explicitly because tus-js-client does not await onSuccess. ([L126](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Storage/Storage.ts#L126))
- Storage.pollProcessingStatus checks the abort signal outside the try block so an abort is not caught and retried as a transient error. ([L246](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Storage/Storage.ts#L246))
- Storage.pollProcessingStatus keeps polling on the next node when a node reports done without the 320 cid, because that node's upload row may not yet have the transcode results. ([L256](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Storage/Storage.ts#L256))
- Storage.pollProcessingStatus logs and swallows node connection errors so polling can retry, rethrowing only upload failures, stalls and 422s. ([L307](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/Storage/Storage.ts#L307))

### `packages/sdk/src/sdk/services/StorageNodeSelector/StorageNodeSelector.ts`

- StorageNodeSelector.orderedNodes stores endpoints lowercased, so comparisons against it must lowercase too. ([L20](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/StorageNodeSelector/StorageNodeSelector.ts#L20))
- StorageNodeSelector.getNodes is synchronous, so it orders with the current node list and only kicks off a refresh for later calls. ([L101](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/StorageNodeSelector/StorageNodeSelector.ts#L101))
- StorageNodeSelector.selectUntilEndOfList snapshots orderedNodes because a node list refresh can replace it while health checks are awaited. ([L132](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/services/StorageNodeSelector/StorageNodeSelector.ts#L132))

### `packages/sdk/src/sdk/types/File.ts`

- File type detection imports file-type on demand so browser and React Native bundles never evaluate the Node-only module. ([L70](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/types/File.ts#L70))

### `packages/sdk/src/sdk/utils/crypto.test.ts`

- CryptoUtils AES-GCM keys use the last 32 bytes of the shared secret because secp256k1 shared secrets are 33-byte compressed points. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/utils/crypto.test.ts#L48))

### `packages/sdk/src/sdk/utils/fetch.ts`

- The SDK fetch util re-exports Headers, Request and Response from globalThis because cross-fetch does not export them in browser environments. ([L10](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/sdk/src/sdk/utils/fetch.ts#L10))

### `packages/spl/src/associated-token/index.ts`

- decodeAssociatedTokenInstruction treats null/undefined data[0] as Create because the Associated Token Account program and spl-token JS emit Create with empty or zero data. ([L122](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/spl/src/associated-token/index.ts#L122))

### `packages/spl/src/claimable-tokens/ClaimableTokensProgram.ts`

- ClaimableTokensProgram.createSignedSetAuthorityData passes userBank as current authority because only the encoded instruction data is used for the signed message. ([L325](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/spl/src/claimable-tokens/ClaimableTokensProgram.ts#L325))

### `packages/spl/src/layout-utils.ts`

- The ethAddress layout pads to 20 bytes because hex addresses with leading zeros would otherwise encode to a truncated buffer. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/spl/src/layout-utils.ts#L41))

### `packages/spl/src/reward-manager/AttestationLayout.ts`

- AttestationLayout spans 83 bytes: ethAddress 20 + 1 + u64 8 + 1 + 32 + 1 + ethAddress 20. ([L11](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/spl/src/reward-manager/AttestationLayout.ts#L11))

### `packages/spl/src/reward-manager/RewardManagerProgram.ts`

- RewardManagerProgram adds 45 bytes of padding per verified message because the on-chain program allocates 128 bytes per element even though the attestation is 83 bytes. ([L103](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/spl/src/reward-manager/RewardManagerProgram.ts#L103))

### `packages/spl/src/reward-manager/SenderAttestationLayout.ts`

- SenderAttestationLayout spans 55 bytes: 3 ('add') + 32 pubkey + 20 eth address. ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/spl/src/reward-manager/SenderAttestationLayout.ts#L16))

### `packages/spl/src/reward-manager/types.ts`

- The \_ field in verified message types holds the 45-byte padding of the attestations account layout so the decoded type matches. ([L368](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/spl/src/reward-manager/types.ts#L368))
