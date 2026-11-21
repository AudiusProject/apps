# 0029. Identity service

- Status: Accepted
- Date: 2026-11-21

## Context

Hedgehog auth, rate limiting, relay abuse checks, email deliverability, Coinflow and database migration constraints in `packages/identity-service`. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `packages/identity-service/loadAudiusSdk.cjs`

- identity-service loads ESM-only @audius/sdk via loadAudiusSdk.cjs outside src/ so ts-node-dev does not rewrite import() into require() and throw ERR_REQUIRE_ESM. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/loadAudiusSdk.cjs#L3))

### `packages/identity-service/sequelize/migrations/20191107223636-create-viewed-field.js`

- Migration 20191107223636 uses raw SQL instead of models.Notification because the model was removed in #14207 while the table remains, so fresh databases can still migrate. ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/sequelize/migrations/20191107223636-create-viewed-field.js#L16))

### `packages/identity-service/sequelize/migrations/20220512172226-add_notification_json_b.js`

- Postgres ALTER TYPE ADD VALUE cannot run inside a transaction block, so identity enum-add migrations issue one query per value outside a transaction. ([L5](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/sequelize/migrations/20220512172226-add_notification_json_b.js#L5))

### `packages/identity-service/sequelize/migrations/20260511000000-remove-live-emails.js`

- Migration 20260511000000 leaves the live enum label in place because Postgres cannot remove enum values without root access; rows and defaults are moved back to daily instead. ([L4](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/sequelize/migrations/20260511000000-remove-live-emails.js#L4))

### `packages/identity-service/sequelize/migrations/20261007000000-default-weekly-emails.js`

- The default-weekly-emails down migration only restores the daily default because users migrated to weekly are indistinguishable from users who chose weekly. ([L17](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/sequelize/migrations/20261007000000-default-weekly-emails.js#L17))

### `packages/identity-service/src/app.js`

- identity-service App.init registers settings, middleware, rate limiters, routes then the error handler in that order because Express runs handlers in registration order. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/app.js#L40))
- identity-service cannot run more than one web worker because POA and ETH relays rely on in-memory wallet locks. ([L76](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/app.js#L76))
- identity /authentication rate limiter stacks with the global reqLimiter, so each request counts against both budgets. ([L222](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/app.js#L222))
- identity /twitter rate limiter stacks with the global reqLimiter, so each request counts against both budgets. ([L230](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/app.js#L230))
- identity /tiktok rate limiter stacks with the global reqLimiter, so each request counts against both budgets. ([L237](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/app.js#L237))

### `packages/identity-service/src/audiusLibsInstance.js`

- identity-service sets useRelay false on libs Solana config because identity is itself the relayer and must not relay through itself. ([L47](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/audiusLibsInstance.js#L47))

### `packages/identity-service/src/authMiddleware.js`

- authMiddleware refreshes handle from chain when blockchainUserId or handle is missing so provisional handles are always overwritten by the on-chain value. ([L114](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/authMiddleware.js#L114))

### `packages/identity-service/src/awsSNS.js`

- awsSNS wraps calls by method name instead of util.promisify because aws-sdk SNS methods fail when detached from the client object. ([L15](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/awsSNS.js#L15))

### `packages/identity-service/src/config.js`

- identity registryAddress is loaded from contract-config.json, and an env var takes precedence over the file. ([L293](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/config.js#L293))
- identity config.js disables node/no-missing-require because eth-contract-config.json is conditionally required and absent on CI. ([L714](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/config.js#L714))

### `packages/identity-service/src/corsMiddleware.js`

- identity corsMiddleware skips /tiktok/access_token because that route sets its own CORS headers inline in tiktok.js. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/corsMiddleware.js#L3))

### `packages/identity-service/src/emails/otp.js`

- The identity OTP email template stays minimal because promo content, images and tracking push security emails into spam. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/emails/otp.js#L1))

### `packages/identity-service/src/featureFlag.js`

- identity featureFlag DEFAULTS apply only until the Optimizely datafile loads, normally a few seconds after boot. ([L9](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/featureFlag.js#L9))

### `packages/identity-service/src/index.ts`

- identity index.ts imports libs before anything else so its slow first load is isolated and does not distort timing of other modules. ([L5](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/index.ts#L5))
- Shutdown logs in identity ON_DEATH may be swallowed by the bunyan CLI used by npm start; run without it to see them. ([L52](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/index.ts#L52))

### `packages/identity-service/src/migrationManager.js`

- identity clearDatabase drops and recreates the public schema and must only be used in tests. ([L23](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/migrationManager.js#L23))

### `packages/identity-service/src/models/authentication.js`

- identity Authentication.lookupKey is the scrypt hash of email and password joined by colons with a fixed IV, computed client-side by hedgehog. ([L14](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/models/authentication.js#L14))

### `packages/identity-service/src/models/userPlaylistFavorites.js`

- UserPlaylistFavorites stores favorites as strings so on-chain playlist ids and autogenerated playlist ids can coexist. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/models/userPlaylistFavorites.js#L3))

### `packages/identity-service/src/rateLimiter.js`

- identity getIP assumes Cloudflare plus a load balancer: the rightmost XFF entry is the outer proxy, rightmost-1 is the user or a whitelisted node, and for a node rightmost-2 is the user. ([L46](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/rateLimiter.js#L46))
- identity rate limiter strips the leading underscore from decoded contract ABI param names such as \_userId. ([L191](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/rateLimiter.js#L191))

### `packages/identity-service/src/relay/txRelay.js`

- txRelay bumps a zero gas price to MIN_GAS_PRICE because a zero-gas tx will likely never be mined. ([L54](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/relay/txRelay.js#L54))
- relayToNethermind creates a throwaway private key per transaction because gas on the ACDC chain is free, so no funded relayer wallet or nonce tracking is needed. ([L594](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/relay/txRelay.js#L594))

### `packages/identity-service/src/routes/authentication.js`

- POST /authentication stores the browser-generated hedgehog iv, cipherText and lookupKey; identity never sees the plaintext credentials. ([L26](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/authentication.js#L26))
- POST /authentication keeps walletAddress null when signature recovery fails so the account can still be recovered later. ([L63](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/authentication.js#L63))
- Changing email via POST /authentication requires a recovered wallet from signed headers; unsigned requests are rejected. ([L79](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/authentication.js#L79))
- POST /authentication only updates the email of the user whose wallet signed the request. ([L138](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/authentication.js#L138))
- Authentication is a paranoid (soft-delete) model, so signup looks up lookupKey with paranoid:false to find and restore soft-deleted rows. ([L150](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/authentication.js#L150))
- When an existing non-deleted Authentication row matches, signup overwrites iv and cipherText because old artifacts may be unrecoverable. ([L171](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/authentication.js#L171))
- GET /authentication/check only reports lookupKey existence for a signed-in user; it never logs in, returns credentials or sends OTP. ([L202](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/authentication.js#L202))
- Login OTP is sent to the email registered for the wallet when available, not to the email the client typed. ([L265](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/authentication.js#L265))

### `packages/identity-service/src/routes/coinflow.js`

- coinflow.js prefixes raw 32-byte Ed25519 keys with the ASN.1 SubjectPublicKeyInfo header so Node createPublicKey can import them. ([L18](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/coinflow.js#L18))
- The Coinflow session-key route requires a signed, timestamped proof bound to identity wallet and environment because the root wallet is not the public user bank and must not be trusted from the caller. ([L39](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/coinflow.js#L39))
- coinflow.js logs only the response status on failure because Axios errors embed the Coinflow merchant key in request config. ([L92](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/coinflow.js#L92))

### `packages/identity-service/src/routes/reactions.js`

- identity reactions validate the tip against the API so a user can only react to tips they actually received. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/reactions.js#L24))

### `packages/identity-service/src/routes/recovery.js`

- POST /recovery returns success without sending when no SendGrid key is configured, so local and test envs do not fail. ([L45](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/recovery.js#L45))
- Recovery email is suppressed unless isEmailVerified, falling back to legacy isEmailDeliverable for accounts created before verification existed. ([L76](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/recovery.js#L76))

### `packages/identity-service/src/routes/relay.js`

- Relay abuse detection and blocking apply only to requests not from the Audius app (owner wallets), via !req.isFromApp. ([L33](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/relay.js#L33))
- Relay re-runs detectAbuse for flagged users so previously abusive users can be cleared on later relays. ([L58](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/relay.js#L58))
- Relay runs an abbreviated detectAbuse after setting a provisional handle because the user is not yet indexed for a full check. ([L83](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/relay.js#L83))
- Relay rejects only users explicitly isBlockedFromRelay; deactivated or notification/email-blocked users can still relay. ([L125](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/relay.js#L125))
- On a relay error, txRelay.sendTransaction is retried once with resetNonce=true to recover from nonce desync. ([L157](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/relay.js#L157))

### `packages/identity-service/src/routes/scores.js`

- BotScores rows from hCaptcha store recaptchaScore 1 because the free hCaptcha tier only returns pass/fail, not a risk score. ([L77](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/scores.js#L77))
- BotScores.recaptchaContext set to hCaptcha is how hCaptcha scores are distinguished from reCAPTCHA scores. ([L84](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/scores.js#L84))

### `packages/identity-service/src/routes/socialHandles.js`

- socialHandles matches Twitter screen_name case-sensitively because Twitter stores it with case. ([L22](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/socialHandles.js#L22))
- socialHandles lowercases the handle for Instagram lookups because Instagram usernames are stored lowercase. ([L30](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/socialHandles.js#L30))
- socialHandles lowercases the handle for TikTok lookups because TikTok names are stored lowercase. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/socialHandles.js#L38))
- socialHandles requires the Audius handle to equal the Twitter handle when the Twitter account is verified. ([L66](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/socialHandles.js#L66))

### `packages/identity-service/src/routes/stripe.js`

- identity stripe.js posts form-urlencoded data because the Stripe REST API does not accept JSON bodies. ([L59](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/stripe.js#L59))

### `packages/identity-service/src/routes/tiktok.js`

- TikTok associate always sends updateSocialVerification, even for unverified users, so the linked social handle on chain is kept current. ([L176](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/tiktok.js#L176))

### `packages/identity-service/src/routes/twitter.js`

- identity twitter lookup randomly alternates between /username and ?usernames routes because they have separate rate limits, doubling throughput. ([L127](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/twitter.js#L127))
- Twitter associate always sends updateSocialVerification, even for unverified users, so the linked social handle on chain is kept current. ([L193](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/twitter.js#L193))

### `packages/identity-service/src/routes/user.js`

- identity user.js treats email as deliverable when the validation call fails, so signup is not blocked by the third-party check. ([L37](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/user.js#L37))
- POST /user reads body.username as the email because hedgehog names the field username. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/user.js#L53))
- identity stores walletAddress lowercased, not checksummed, so lookups must lowercase too. ([L87](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/user.js#L87))

### `packages/identity-service/src/routes/userEvents.js`

- UserEvents upsert must never flip hasSignedInNativeMobile back to false once true. ([L64](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/userEvents.js#L64))

### `packages/identity-service/src/routes/welcomeEmail.js`

- POST /email/welcome returns success without sending when no SendGrid key is configured. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/welcomeEmail.js#L28))
- Welcome email is suppressed unless isEmailVerified, falling back to legacy isEmailDeliverable for pre-verification accounts. ([L49](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/routes/welcomeEmail.js#L49))

### `packages/identity-service/src/tracer.js`

- identity tracer registers HttpInstrumentation before ExpressInstrumentation because Express spans depend on the HTTP layer propagating trace headers. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/tracer.js#L38))

### `packages/identity-service/src/typed-routes/ethereum/ethRpc.ts`

- ethRpc toTransactionRequest converts eth_sendTransaction RPC params back into viem TransactionRequest per variant because viem uses never-typed fields that differ per tx type. ([L60](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/typed-routes/ethereum/ethRpc.ts#L60))
- The identity /ethereum/rpc proxy intercepts eth_sendTransaction and signs it with a locked relayer wallet; all other RPC calls pass through. ([L183](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/typed-routes/ethereum/ethRpc.ts#L183))

### `packages/identity-service/src/utils/antiAbuse.js`

- antiAbuse getIP uses the leftmost X-Forwarded-For entry (client IP) rather than the rate limiter proxy-depth logic. ([L14](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/utils/antiAbuse.js#L14))
- recordIP updates the UserIPs row even if unchanged so updatedAt reflects the last time the IP was seen. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/utils/antiAbuse.js#L38))
- detectAbuse writes the latest IP to identity first because the AAO service requests it back during the check. ([L99](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/utils/antiAbuse.js#L99))

### `packages/identity-service/src/utils/apiSigning.js`

- identity apiSigning signs keccak256 of JSON.stringify(sortKeys(data+timestamp)) with no whitespace, which verifiers must reproduce exactly. ([L22](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/utils/apiSigning.js#L22))

### `packages/identity-service/src/utils/transactionalEmail.js`

- transactionalEmail disables SendGrid click and open tracking because security emails carry codes and login links that must not be rewritten. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/src/utils/transactionalEmail.js#L1))

### `packages/identity-service/test/coinflowTest.js`

- coinflowTest loads the route in a vm context with stubbed dependencies so tests need no Postgres, Redis, merchant key or live Coinflow. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/test/coinflowTest.js#L8))

### `packages/identity-service/test/configTest.js`

- configTest skips relayerWallets and ethRelayerWallets because their custom format coercion overrides env-var test values on config.load. ([L75](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/identity-service/test/configTest.js#L75))
