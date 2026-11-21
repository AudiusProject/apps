# 0004. Payments, wallets and tokens in common

- Status: Accepted
- Date: 2026-11-21

## Context

USDC purchases and withdrawals, Solana transactions, swaps, artist coins and wallet balances, where mistakes cost users money. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `adapters/coin.ts`

- coinFromSdk in adapters/coin.ts falls back to dynamic bonding curve data because Birdeye price/supply data is not available immediately after a coin launches. ([L55](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/adapters/coin.ts#L55))

### `api/tan-query/coins/useCoinRedeemAmount.ts`

- useCoinRedeemAmount treats a 400 from the redeem amount endpoint as 'ended' because the API signals finished disbursements with a 400. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/coins/useCoinRedeemAmount.ts#L38))

### `api/tan-query/coins/useCoinRedeemCodeAmount.ts`

- useCoinRedeemCodeAmount returns the 400 response body because the API uses 400 to signal an invalid or already-redeemed code. ([L45](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/coins/useCoinRedeemCodeAmount.ts#L45))

### `api/tan-query/coins/useFanClubByTicker.ts`

- fetchCoinTickerAvailability in useFanClubByTicker treats a 404 from getCoinByTicker as available because the API returns 404 when no coin has that ticker. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/coins/useFanClubByTicker.ts#L40))

### `api/tan-query/coins/useTradeableCoins.ts`

- useTradeableCoins adds USDC to the coin map by hand because USDC is a frontend-only token the coins API never returns. ([L57](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/coins/useTradeableCoins.ts#L57))

### `api/tan-query/jupiter/executors.ts`

- executeMeteoraSwap in jupiter/executors.ts handles both directions, unlike the other executors, but one side must always be AUDIO. ([L71](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/jupiter/executors.ts#L71))
- executeMeteoraSwap transfers includedFeeInputAmount from the quote out of the user bank so no tokens are left stranded in the temp ATA. ([L126](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/jupiter/executors.ts#L126))
- executeMeteoraSwap extracts only the DBC/DAMM v2 swap instruction from the relay transaction because ATA setup is done manually and the relay's create-ATA instructions are not needed. ([L178](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/jupiter/executors.ts#L178))

### `api/tan-query/jupiter/orchestrator.ts`

- SwapOrchestrator.execute does not wrap IndirectSwapExecutor in its retry policy because that executor retries each step itself; only DirectSwapExecutor uses orchestrator-level retries. ([L78](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/jupiter/orchestrator.ts#L78))
- SwapOrchestrator.execute wraps DirectSwapExecutor in its retry policy because, unlike IndirectSwapExecutor, it has no step-level retries. ([L82](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/jupiter/orchestrator.ts#L82))

### `api/tan-query/jupiter/solanaUtils.ts`

- addJupiterOutputAtaInstruction in jupiter/solanaUtils.ts creates the output associated token account itself because Jupiter's shared-account mode fails for simple AMMs; it is the fallback path. ([L99](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/jupiter/solanaUtils.ts#L99))

### `api/tan-query/jupiter/useCoinExchangeRate.ts`

- useCoinExchangeRate caps the input amount at MAX_SAFE_EXCHANGE_RATE_AMOUNT (1 trillion tokens) because very large amounts make the quote API error; the cap is far above any real amount. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/jupiter/useCoinExchangeRate.ts#L48))
- getQuoteViaMeteoraDBC in useCoinExchangeRate.ts builds a fake Jupiter QuoteResponse from the Meteora DBC relay quote so downstream code can treat both quote sources the same; it carries less detail than a real Jupiter quote. ([L304](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/jupiter/useCoinExchangeRate.ts#L304))

### `api/tan-query/jupiter/useSwapCoins.ts`

- optimisticallyUpdateSwapBalances in useSwapCoins.ts only adjusts the in-app wallet account balance (plus the aggregate) because swaps are always executed against the internal wallet, never connected wallets. ([L133](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/jupiter/useSwapCoins.ts#L133))
- optimisticallyUpdateSwapBalances in useSwapCoins.ts only adjusts the in-app wallet account balance (plus the aggregate) because swaps are always executed against the internal wallet, never connected wallets. ([L157](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/jupiter/useSwapCoins.ts#L157))

### `api/tan-query/jupiter/utils.ts`

- formatTokenPrice in jupiter/utils.ts clamps maximumFractionDigits to 6 because it formats through USDC(), whose FixedDecimal has only 6 decimal places. ([L91](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/jupiter/utils.ts#L91))

### `api/tan-query/upload/usePublishCollection.ts`

- usePublishCollection copies albumTrackPrice before getUSDCMetadata rewrites stream_conditions, since the field is parsed out of the collection metadata. ([L67](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/upload/usePublishCollection.ts#L67))
- combineMetadata in usePublishCollection always sets is_download_gated true for premium album tracks; every premium track must be download-gated. ([L272](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/upload/usePublishCollection.ts#L272))

### `api/tan-query/upload/usePublishTracks.ts`

- addPremiumMetadata in usePublishTracks overwrites download_conditions with the stream_conditions when stream gating is USDC, so download gating always matches stream gating. ([L287](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/upload/usePublishTracks.ts#L287))

### `api/tan-query/wallets/useAudioBalance.ts`

- useAudioBalance only includes connected/linked wallets when the userId is the current user, because connected wallets are private; other users show only their main account balance. ([L186](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/wallets/useAudioBalance.ts#L186))
- updateAudioBalanceOptimistically updates both the includeStaked=true and false balance query entries for the SOL wallet because different parts of the app read different ones. ([L332](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/wallets/useAudioBalance.ts#L332))
- pollUntilAudioBalanceChanges only logs a warning when the balance never changes, relying on the next stale refetch to correct it rather than failing the caller. ([L411](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/wallets/useAudioBalance.ts#L411))

### `api/tan-query/wallets/useCoinBalance.ts`

- useCoinBalance uses useAudioBalance for the AUDIO mint because useUserCoin only reports SOL AUDIO and would miss ETH AUDIO. ([L55](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/wallets/useCoinBalance.ts#L55))

### `api/tan-query/wallets/useSendCoins.ts`

- In useSendCoins, passing recipientEthAddress makes the transfer derive the recipient's Audius user-bank token account instead of a regular associated token account. ([L20](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/wallets/useSendCoins.ts#L20))

### `api/tan-query/wallets/useTransferEthToSol.ts`

- useTransferEthToSol converts ETH AUDIO to Solana wAUDIO via Wormhole with the platform covering all fees, so the user needs no ETH or SOL for gas. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/wallets/useTransferEthToSol.ts#L6))

### `api/tan-query/wallets/useUSDCBalance.ts`

- useUSDCBalance invalidates the balance query when the USDC recovery finishes and keeps status LOADING through that refetch, so the skeleton does not flash off and briefly show the stale balance. ([L120](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/wallets/useUSDCBalance.ts#L120))

### `api/tan-query/wallets/useWalletOwner.ts`

- useWalletOwner returns the original configured address when the token-account owner lookup returns null or throws, so the UI still shows the address the user configured. ([L46](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/wallets/useWalletOwner.ts#L46))

### `hooks/purchaseContent/usePurchaseableStemCount.ts`

- usePurchaseableStemCount reads the stems query rather than metadata.\_stems, which is never populated; albums resolve to 0 stems. ([L5](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/purchaseContent/usePurchaseableStemCount.ts#L5))

### `hooks/useAccessAndRemixSettings.ts`

- useAccessAndRemixSettings disables gated access options for remixes, and on edit without the editable-access flag only allows broadening access (gated to public); it controls disabled state, not visibility. ([L19](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useAccessAndRemixSettings.ts#L19))

### `hooks/useCoinflowAdapter.ts`

- useCoinflowWithdrawalAdapter rewrites Coinflow withdrawal transactions to route through the user bank, signs with the root Solana wallet and sends via Relay. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useCoinflowAdapter.ts#L34))
- useCoinflowAdapter partial-signs unmodified Coinflow transactions with the root Solana wallet and sends/confirms them locally rather than via Relay. ([L145](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useCoinflowAdapter.ts#L145))
- useCoinflowAdapter replaces the Coinflow transaction's recentBlockhash with a fresh one before signing to prevent BlockhashNotFound errors. ([L187](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useCoinflowAdapter.ts#L187))
- useCoinflowAdapter sends the re-signed Coinflow transaction through solanaRelay rather than directly, to get the relay's retry and caching logic. ([L201](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useCoinflowAdapter.ts#L201))

### `hooks/useCoinflowSessionKey.ts`

- useCoinflowSessionKey re-renders EXPIRY_BUFFER_MS before expiry so that if the refresh fails the old Coinflow session key stops being used before it actually expires. ([L78](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useCoinflowSessionKey.ts#L78))

### `hooks/useMintRecovery.ts`

- useMintRecovery always checks the root Solana wallet's token account, since its purpose is to detect tokens left in the root wallet that must be recovered into the user bank. ([L22](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useMintRecovery.ts#L22))

### `models/Launchpad.ts`

- LaunchCoinErrorMetadata logs extensive step and confirmation state because coin launch failures are complex and sensitive for users. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/models/Launchpad.ts#L1))

### `services/audius-backend/AudiusBackend.ts`

- In AudiusBackend signData, HedgehogWalletNotFoundError is not logged or reported because it is expected when the user is logged out. ([L318](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/AudiusBackend.ts#L318))

### `services/audius-backend/solana.ts`

- decorateCoinflowWithdrawalTransaction in solana.ts reroutes a Coinflow root-wallet USDC transfer through the user bank so indexing sees it; the original must use TransferChecked from the root wallet USDC account. ([L251](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L251))
- decorateCoinflowWithdrawalTransaction drops existing compute budget instructions because the rewritten transaction needs a different budget. ([L281](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L281))
- recoverUsdcFromRootWallet in solana.ts moves USDC from the root wallet back to the user bank through payment router so indexing sees and handles the transfer. ([L358](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L358))
- createUserFundedAta in solana.ts funds the destination ATA from the user's own USDC: TX1 via relay swaps a USDC fee to SOL for the fee payer and creates the ATA; TX2 transfers the withdrawal from the user bank. ([L426](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L426))
- createUserFundedAta swaps with ExactIn on a fixed USDC amount so the swap consumes all input and leaves no dust. ([L453](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L453))
- createUserFundedAta estimates the USDC fee with an ExactOut quote, then adds a 2% buffer so the ExactIn swap yields enough lamports. ([L469](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L469))
- createUserFundedAta uses 500bps slippage because the swap is ~$0.01 and tight slippage fails with SlippageToleranceExceeded on stale quotes. ([L481](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L481))
- createUserFundedAta reads the claimable-tokens nonce once and uses N for the prefund TX and N+1 for the transfer TX, since a second RPC read can return a stale nonce. ([L513](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L513))
- In createUserFundedAta the prefund claimable transfer passes currentNonce explicitly so the following transfer TX can use currentNonce+1 deterministically. ([L540](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L540))
- createUserFundedAta keeps the root wallet USDC ATA open when it is the destination (Coinflow withdraw-to-bank needs it); otherwise it closes it and creates the recipient ATA. ([L584](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L584))
- transferFromUserBank: a signer adds a memo marking the transfer as withdrawal preparation so it is hidden from withdrawal history; a keypair makes the user pay a USDC fee for a missing destination ATA instead of the rate-limited relay. ([L628](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L628))
- transferFromUserBank keypair param: when the destination ATA is missing the user pays a small USDC fee swapped to SOL to create it, avoiding the relay daily rate limit. ([L655](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L655))
- In transferFromUserBank with a keypair, the ATA is created from the root wallet after a USDC-to-SOL fee swap so the relay never sees an unmatched create; the fee is deducted from the transfer amount. ([L736](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L736))
- transferFromUserBank passes the next nonce returned by createUserFundedAta to avoid a stale RPC nonce read after the prefund TX. ([L752](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L752))
- transferFromUserBank uses a fixed 400k compute limit when the nonce was overridden, because buildTransaction simulation can fail on stale RPC state. ([L805](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L805))
- transferFromUserBank sends with skipPreflight when the nonce was overridden because the relay RPC may not yet see the prefund nonce increment. ([L815](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solana.ts#L815))

### `services/audius-backend/solanaBackend.ts`

- getOrCreateAssociatedTokenAccount in solanaBackend.ts creates a missing token account through Phantom rather than relaying gas fees, erroring if Phantom is absent. ([L163](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solanaBackend.ts#L163))

### `services/auth/hedgehogLib/Hedgehog.ts`

- Hedgehog.signUp sets this.wallet only after setAuthFn succeeds so isLoggedIn() is not true for a half-created account. ([L120](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/Hedgehog.ts#L120))
- Hedgehog.changeCredentials deliberately does not log the user out on error, unlike signUp. ([L179](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/Hedgehog.ts#L179))

### `services/auth/hedgehogLib/utils.ts`

- waitUntil in hedgehogLib/utils.ts checks the condition synchronously first so already-ready waits (every SDK request inside the signature mutex) do not pay a 100ms poll and serialize requests. ([L83](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/hedgehogLib/utils.ts#L83))

### `services/auth/identity.ts`

- IdentityService.getAuthHeaders reads auth headers from localStorage first so a mobile WebView can inject them for web authentication. ([L71](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/auth/identity.ts#L71))

### `services/coinflow.ts`

- createCoinflowSession uses Coinflow wallet authentication, which needs no merchant API key or fixed IP. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/coinflow.ts#L1))

### `store/buy-usdc/sagas.ts`

- Stripe onramp expects amount in dollars, so buy-usdc saga divides cents by 100. ([L254](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/buy-usdc/sagas.ts#L254))
- watchRecovery uses takeLeading: one recovery at a time, no interruption, but re-triggerable in the same session after failures. ([L476](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/buy-usdc/sagas.ts#L476))

### `store/challenges/selectors/optimistic-challenges.ts`

- toOptimisticChallenge overrides API step counts with client counts since the client is ahead, except when the API already marks the challenge complete. ([L93](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/challenges/selectors/optimistic-challenges.ts#L93))
- On native mobile the mobile-install challenge is marked complete optimistically because the is_mobile user_event may not be indexed yet, letting the client claim. ([L105](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/challenges/selectors/optimistic-challenges.ts#L105))
- getOptimisticUserChallenges overrides state and step counts with client-tracked values to avoid UI oddness while the API indexes. ([L147](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/challenges/selectors/optimistic-challenges.ts#L147))

### `store/pages/audio-rewards/selectors.ts`

- getTrendingRewardsModalType (audio-rewards/selectors.ts) maps the deprecated 'playlists' modal type to 'tracks' for compatibility. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/audio-rewards/selectors.ts#L8))

### `store/purchase-content/sagas.ts`

- In purchase-content/sagas.ts, purchasing a stream-gated track grants stream plus download access, while purchasing a download-gated track grants only download, since it was already free to stream. ([L123](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/purchase-content/sagas.ts#L123))
- PurchaseUSDCWithStripeArgs.amount (purchase-content/sagas.ts) is in dollars, unlike most purchase amounts which are cents. ([L533](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/purchase-content/sagas.ts#L533))
- doStartPurchaseContentFlow (purchase-content/sagas.ts) waits for wallet addresses with a currentUser so a guest account has been created before purchasing. ([L638](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/purchase-content/sagas.ts#L638))
- In doStartPurchaseContentFlow, a missing token account amount means the USDC account was likely just created, so initial balance is treated as 0. ([L696](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/purchase-content/sagas.ts#L696))
- doStartPurchaseContentFlow treats PurchaseErrorCode.Canceled thrown by nested sagas as a cancellation, dispatching purchaseCanceled without logging an error. ([L880](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/purchase-content/sagas.ts#L880))
- In purchase-content/sagas.ts crypto purchase, when paying with wrapped SOL the native SOL balance also counts because Jupiter handles wrapping. ([L1058](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/purchase-content/sagas.ts#L1058))

### `store/purchase-content/slice.ts`

- PurchaseContentState.extraAmount (purchase-content/slice.ts) is in cents. ([L23](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/purchase-content/slice.ts#L23))

### `store/purchase-content/utils.ts`

- getPurchaseSummaryValues (purchase-content/utils.ts) ignores existing balance if applying it would drop the amount due below the minimum purchase amount, and throws on number bound overflow. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/purchase-content/utils.ts#L41))
- getPurchaseSummaryValues rounds amount due up to the nearest cent so the displayed price is never lower than what the user pays. ([L69](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/purchase-content/utils.ts#L69))
- getPurchaseSummaryValues only applies existing balance when the remaining amount due is at least minPurchaseAmountCents. ([L76](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/purchase-content/utils.ts#L76))
- getBalanceNeeded (purchase-content/utils.ts) enforces the minimum purchase amount and ignores existing balance if applying it would fall below that minimum. ([L92](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/purchase-content/utils.ts#L92))

### `store/ui/buy-sell/hooks/useCalculationStateMachine.ts`

- useCalculationStateMachine (buy-sell/hooks) tracks which side the user edited so bidirectional input/output recalculations don't loop or race. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/buy-sell/hooks/useCalculationStateMachine.ts#L1))

### `store/ui/buy-sell/hooks/useCoinData.ts`

- useCoinData (buy-sell/hooks) uses the untruncated fullBalance for swap calculations; the truncated balance is for display only. ([L92](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/buy-sell/hooks/useCoinData.ts#L92))

### `store/ui/buy-sell/swapFormSchema.ts`

- createSwapFormSchema (buy-sell/swapFormSchema.ts) only skips the balance check for null/undefined balance; a numeric 0 balance must still fail the check. ([L70](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/buy-sell/swapFormSchema.ts#L70))

### `store/ui/buy-sell/types.ts`

- getSwapTokens (buy-sell/types.ts): buy pays with the quote token for the base token; sell and convert pay with the base token for the quote token. ([L86](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/buy-sell/types.ts#L86))

### `store/ui/buy-sell/useBuySellSwap.ts`

- useBuySellSwap takes handleSwap from the caller because web and mobile use different services for external wallet swaps. ([L45](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/buy-sell/useBuySellSwap.ts#L45))
- After a swap, useBuySellSwap invalidates fan club feed queries so token-gated locked content is re-evaluated with the new balance. ([L134](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/buy-sell/useBuySellSwap.ts#L134))
- After a swap, useBuySellSwap invalidates individual comment queries so locked posts refetch with access. ([L145](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/buy-sell/useBuySellSwap.ts#L145))
- After a swap, useBuySellSwap invalidates track queries owned by the traded coins' owners so coin-gated track access updates. ([L150](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/buy-sell/useBuySellSwap.ts#L150))

### `store/ui/buy-sell/useCoinAmountFormatting.ts`

- useCoinAmountFormatting builds FixedDecimal with the token's full decimals and truncates, so construction doesn't round and display matches the cash wallet. ([L59](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/buy-sell/useCoinAmountFormatting.ts#L59))

### `store/ui/buy-sell/useCoinSwapForm.ts`

- useCoinSwapForm re-validates the input only when the input/output token pair changes, not on balance changes, because balance polling would otherwise trigger recursive Formik updates. ([L198](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/buy-sell/useCoinSwapForm.ts#L198))

### `store/ui/buy-sell/utils/tokenCalculations.ts`

- parseNumericAmount in buy-sell/utils/tokenCalculations.ts uses parseFloat only for callers without token decimals; decimal-aware code should use FixedDecimal to avoid float precision loss. ([L89](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/buy-sell/utils/tokenCalculations.ts#L89))

### `store/ui/buy-sell/utils/validationHelpers.ts`

- validateMinimumAmount rounds the minimum to 2 decimal places before comparing, because the UI shows the minimum at 2 decimals and an unrounded min would reject amounts that look valid. ([L57](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/buy-sell/utils/validationHelpers.ts#L57))
- validateSufficientBalance only skips the check when balance is null/undefined; a numeric 0 balance must still produce an insufficient-balance error. ([L108](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/buy-sell/utils/validationHelpers.ts#L108))

### `store/wallet/utils.ts`

- getTierForUserNonWei in store/wallet/utils.ts exists because fan club balance data is not wei-denominated, unlike the AUDIO balances the other tier helpers take. ([L95](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/wallet/utils.ts#L95))

### `utils/challenges.ts`

- getChallengeStatusLabel always shows Tastemaker as Available because it is an infinite aggregate challenge that stays in progress forever. ([L571](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/challenges.ts#L571))

### `utils/coinLogo.ts`

- In utils/coinLogo.ts, coin logos hosted at a validator node /content/<cid> URL (post Irys migration) can be resized on demand via /content/<cid>/<size>.jpg; CONTENT_NODE_URL_REGEX detects them. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/coinLogo.ts#L3))
- getCoinLogoUrl returns a resized variant because uploaded coin logos are up to 1000px and 0.5-2 MB; only validator node URLs can be resized, other URLs (Irys/Arweave, static) are returned as is. ([L17](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/coinLogo.ts#L17))
