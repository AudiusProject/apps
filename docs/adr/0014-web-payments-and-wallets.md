# 0014. Payments, wallets and fan clubs on web

- Status: Accepted
- Date: 2026-11-21

## Context

Purchases, USDC and token flows, wallets, fan clubs and rewards, where mistakes cost users money. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `src/app/ReownAppKitModal.tsx`

- ReownAppKitModal calls reconnect at module load because there is no app-wide WagmiProvider whose Hydrate used to restore the connection; reconnect is a no-op if one is in progress. ([L45](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/ReownAppKitModal.tsx#L45))

### `src/app/appkit.ts`

- appkit.ts uses 'wagmi.store' because WagmiAdapter passes no storage override, so @wagmi/core falls back to the wagmi prefix. ([L62](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/appkit.ts#L62))
- appkit.ts hasPersistedWalletConnection returns true on unparseable storage because a false negative would drop an external-wallet user to Hedgehog. ([L68](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/appkit.ts#L68))
- hasPersistedWalletConnection reads connections.value because wagmi serializes the connections Map as { \_\_type: 'Map', value: [...] }. ([L85](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/appkit.ts#L85))

### `src/app/routes.tsx`

- routes.tsx DeferredCoinflowPurchaseProtection mounts Coinflow fraud protection on browser idle and only with an account, since signed-out users cannot check out and its fingerprinting costs seconds of mobile CPU. ([L60](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/routes.tsx#L60))

### `src/common/store/pages/audio-rewards/sagas.ts`

- audio-rewards sagas race claimChallengeRewardAsync against resetAndCancelClaimReward so closing the modal cancels the claim saga. ([L370](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/audio-rewards/sagas.ts#L370))
- audio-rewards sagas query monthly plays with an end date one year ahead because the play-count challenge is open-ended. ([L407](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/audio-rewards/sagas.ts#L407))
- handleOptimisticListenStreakUpdate resets the optimistic streak override when a non-zero current_step_count is fetched, since the API can reset streaks. ([L515](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/audio-rewards/sagas.ts#L515))
- watchUpdateOptimisticPlayCount increments p1, p2 and p3 play-count challenges together because they all display the same play count. ([L578](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/audio-rewards/sagas.ts#L578))
- audio-rewards challengeActivityActions are listens, claims and the rewards UI opening, which trigger fast polling for a window. ([L646](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/audio-rewards/sagas.ts#L646))
- userChallengePollingDaemon polls fast on the rewards page and after activity, slowly otherwise, and pauses while the tab is hidden or the app is backgrounded, catching up on return. ([L667](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/audio-rewards/sagas.ts#L667))
- userChallengePollingDaemon takes the max of the active and idle intervals so remote config cannot make idle polling faster than active. ([L686](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/audio-rewards/sagas.ts#L686))

### `src/common/store/upload/sagaHelpers.ts`

- addPremiumMetadata handles download_conditions before stream_conditions because they can be set independently of each other. ([L86](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/upload/sagaHelpers.ts#L86))
- In addPremiumMetadata, when USDC stream_conditions are set the download_conditions are overwritten to match them. ([L99](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/upload/sagaHelpers.ts#L99))

### `src/components/buy-sell-modal/BuySellFlow.tsx`

- BuySellFlow passes decimals and wallet address for external-wallet swaps; internal swaps ignore them. ([L271](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/buy-sell-modal/BuySellFlow.tsx#L271))

### `src/components/buy-sell-modal/BuySellModal.tsx`

- BuySellModal disables click-outside dismissal while the AppKit wallet modal is open on top of it. ([L63](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/buy-sell-modal/BuySellModal.tsx#L63))

### `src/components/buy-sell-modal/components/CurrentWalletBanner.tsx`

- CurrentWalletBanner fetches only the SPL AUDIO balance for AUDIO rather than the combined ERC+SPL balance. ([L87](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/buy-sell-modal/components/CurrentWalletBanner.tsx#L87))

### `src/components/coinflow-onramp-modal/CoinflowOnrampModal.tsx`

- CoinflowOnrampModal spreads sessionKey because the Coinflow SDK runtime supports it with a wallet but its types omit it. ([L86](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/coinflow-onramp-modal/CoinflowOnrampModal.tsx#L86))

### `src/components/edit/fields/StemsAndDownloadsField.tsx`

- StemsAndDownloadsField keeps all modal selections in temp download conditions; on submit only the selected availability type's conditions are saved. ([L82](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/StemsAndDownloadsField.tsx#L82))

### `src/components/edit/fields/helpers.ts`

- getCombinedDefaultGatedConditionValues keeps all Access & Sale selections so switching options remembers them; only the selected type is saved. ([L4](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/helpers.ts#L4))

### `src/components/edit/fields/price-and-audience/PriceAndAudienceField.tsx`

- PriceAndAudienceField reads initial stream conditions from the parent form, not the contextual menu, for edit flows. ([L121](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/price-and-audience/PriceAndAudienceField.tsx#L121))
- PriceAndAudienceField keeps modal selections in temp stream conditions; on submit only the selected access option's conditions are saved. ([L185](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/price-and-audience/PriceAndAudienceField.tsx#L185))
- PriceAndAudienceField casts to USDCPurchaseConditions because the saga validates and adds splits later. ([L276](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/price-and-audience/PriceAndAudienceField.tsx#L276))

### `src/components/edit/fields/types.ts`

- LAST_GATE_KEEPER records whether Access & Sale or Stems & Downloads last set the stream or download conditions. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/types.ts#L38))

### `src/components/form-fields/PriceField.tsx`

- PriceField limits input length to MAX_SAFE_INTEGER digits minus room for cents to avoid numeric overflow. ([L19](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/form-fields/PriceField.tsx#L19))

### `src/components/payout-wallet-modal/PayoutWalletModal.tsx`

- PayoutWalletModal polls for the new USDC ATA owner with a very high retry cap on purpose, waiting for account creation to land. ([L283](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/payout-wallet-modal/PayoutWalletModal.tsx#L283))

### `src/components/premium-content-purchase-modal/PremiumContentPurchaseModal.tsx`

- PremiumContentPurchaseModal only creates a guest account when the email changed, so multiple purchases can reuse one guest email. ([L268](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/premium-content-purchase-modal/PremiumContentPurchaseModal.tsx#L268))
- PremiumContentPurchaseModal pre-creates the user bank on mount and recovers USDC stuck in the root wallet from an aborted withdrawal. ([L293](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/premium-content-purchase-modal/PremiumContentPurchaseModal.tsx#L293))

### `src/components/premium-content-purchase-modal/hooks/usePurchaseSummaryValues.ts`

- usePurchaseSummaryValues passes undefined extraAmount only for the None preset so a user-entered 0 still shows the row. ([L33](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/premium-content-purchase-modal/hooks/usePurchaseSummaryValues.ts#L33))

### `src/components/send-tokens-modal/SendTokensInput.tsx`

- SendTokensInput sets spl_wallet only for display; the backend derives the recipient user-bank ATA from their ETH address. ([L180](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/send-tokens-modal/SendTokensInput.tsx#L180))

### `src/components/send-tokens-modal/SendTokensModal.tsx`

- SendTokensModal marks AppKit open when a Connect link is clicked so the modal doesn't close before Reown's AppKit modal renders. ([L68](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/send-tokens-modal/SendTokensModal.tsx#L68))
- SendTokensModal blocks closing for 1 second after a Connect click so the AppKit modal can appear. ([L73](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/send-tokens-modal/SendTokensModal.tsx#L73))
- SendTokensModal passes the recipient's erc_wallet (falling back to wallet) so the user-bank ATA is derived server side. ([L148](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/send-tokens-modal/SendTokensModal.tsx#L148))
- SendTokensModal ignores close while the AppKit modal is open during wallet connection. ([L197](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/send-tokens-modal/SendTokensModal.tsx#L197))

### `src/components/withdraw-usdc-modal/components/EnterTransferDetails.tsx`

- EnterTransferDetails applies no extra minimum for the Coinflow setup fee because the fee is deducted from the withdrawal and the $5 minimum still applies. ([L107](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/withdraw-usdc-modal/components/EnterTransferDetails.tsx#L107))

### `src/hooks/useClaimFees.ts`

- useClaimFees is web only because the artist must sign with the same external wallet they used to launch the coin. ([L27](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useClaimFees.ts#L27))
- useClaimFees polls the AUDIO balance query after claiming because the new balance value is not returned. ([L114](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useClaimFees.ts#L114))

### `src/hooks/useClaimVestedCoins.ts`

- useClaimVestedCoins is web only because the artist must sign with the same external wallet they used to launch the coin. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useClaimVestedCoins.ts#L32))
- The relay's claim vested coins transaction claims to the external wallet, which must sign, and transfers to the user bank in the same transaction. ([L79](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useClaimVestedCoins.ts#L79))
- useClaimVestedCoins sends the signed transaction through the relay even though Audius pays no fees, to get its retry logic and logging. ([L107](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useClaimVestedCoins.ts#L107))

### `src/hooks/useConnectExternalWallets.ts`

- useConnectExternalWallets passes wagmi config explicitly to each wagmi hook because there is no app-wide WagmiProvider. ([L54](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useConnectExternalWallets.ts#L54))
- useConnectExternalWallets tracks its own isConnecting state because several hook instances may listen to the same AppKit modal events. ([L60](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useConnectExternalWallets.ts#L60))
- Users signed in with an external wallet are on the audiusChain network, so useConnectExternalWallets switches to mainnet before opening the connect modal. ([L92](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useConnectExternalWallets.ts#L92))

### `src/hooks/useExternalWalletSwap.ts`

- getDirectSwapTx sets useSharedAccounts false because Jupiter shared accounts cannot be used for AMM pool swaps. ([L60](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useExternalWalletSwap.ts#L60))
- getMeteoraSwapTx exists because Meteora only supports swaps between AUDIO and fan club coins, so other pairs route through AUDIO. ([L371](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useExternalWalletSwap.ts#L371))
- useExternalWalletSwap catches errors and still returns a result, so its onSuccess also runs on handled failures and must check result.status. ([L666](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useExternalWalletSwap.ts#L666))

### `src/hooks/useLaunchCoin.ts`

- useLaunchCoin signs the pool-creation and first-buy transactions locally without sending them, and passes both to the relay confirm endpoint. ([L134](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useLaunchCoin.ts#L134))
- useLaunchCoin treats a successful relay confirm response as on-chain confirmation of the pool creation. ([L148](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useLaunchCoin.ts#L148))
- useLaunchCoin adds the coin to the Audius database in its own try/catch because the on-chain launch has already succeeded and this step must not fail it. ([L164](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useLaunchCoin.ts#L164))
- useLaunchCoin invalidates the connected wallets query because the launch confirm call associates the external wallet with the user. ([L251](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useLaunchCoin.ts#L251))

### `src/pages/edit-coin-details-page/EditCoinDetailsPage.tsx`

- EditCoinDetailsPage keeps empty strings in the social links array sent to the API, because an empty string tells the backend to delete that link. ([L363](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/edit-coin-details-page/EditCoinDetailsPage.tsx#L363))

### `src/pages/fan-club-detail-page/components/FanClubInfoSection.tsx`

- FanClubInfoSection treats claimable fees below MIN_CLAIMABLE_FEES (0.01 AUDIO, 1,000,000 base units at 8 decimals) as dust not worth claiming because of transaction fees. ([L83](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-club-detail-page/components/FanClubInfoSection.tsx#L83))

### `src/pages/fan-club-detail-page/components/TextPostCard.tsx`

- TextPostCard generates a deterministic pseudo-random placeholder from the comment id for locked posts so each blurred post looks distinct and stable across renders. ([L49](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-club-detail-page/components/TextPostCard.tsx#L49))

### `src/pages/fan-clubs-launchpad-page/LaunchpadPage.tsx`

- fetchImageAsFile in LaunchpadPage copies the user's cover photo into a File for the coin banner and expects a URL already resolved with mirror fallback (from useCoverPhoto). ([L69](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-clubs-launchpad-page/LaunchpadPage.tsx#L69))
- LaunchpadPage's handleWalletAddSuccess runs only after the wallet is both linked and has sufficient SOL balance. ([L146](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-clubs-launchpad-page/LaunchpadPage.tsx#L146))
- LaunchpadPage fetches the connected wallet's SOL balance fresh (not cached) when checking the minimum needed to launch. ([L181](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-clubs-launchpad-page/LaunchpadPage.tsx#L181))
- LaunchpadPage treats a wallet connect error as possibly meaning the wallet was already linked recently (AlreadyAssociatedError) and continues the flow in that case. ([L216](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-clubs-launchpad-page/LaunchpadPage.tsx#L216))
- LaunchpadPage switches AppKit to the Solana network before opening the connect modal so SOL wallets are prioritised. ([L268](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-clubs-launchpad-page/LaunchpadPage.tsx#L268))
- LaunchpadPage retries a failed first-buy transaction with a new Jupiter swap when the pool was already created, instead of re-creating the pool. ([L416](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-clubs-launchpad-page/LaunchpadPage.tsx#L416))
- LaunchpadPage closes the launch modal on an error after pool creation so the user can resubmit through the swap-retry flow. ([L461](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-clubs-launchpad-page/LaunchpadPage.tsx#L461))
- LaunchpadPage handleSubmit retries only the first-buy swap if a previous attempt failed at that step, rather than creating a new pool. ([L561](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-clubs-launchpad-page/LaunchpadPage.tsx#L561))
- LaunchpadPage copies the user's cover image into a new file for the coin banner so later profile changes don't affect the coin. ([L593](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-clubs-launchpad-page/LaunchpadPage.tsx#L593))

### `src/pages/fan-clubs-launchpad-page/components/FanClubsTable.tsx`

- FanClubsTable stores handleSearchChange in a ref so the memoised FilterHeader component always calls the latest handler without being recreated. ([L376](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-clubs-launchpad-page/components/FanClubsTable.tsx#L376))
- FanClubsTable creates FilterHeader once with useMemo so the search input is not remounted (losing focus) on every keystroke. ([L382](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-clubs-launchpad-page/components/FanClubsTable.tsx#L382))

### `src/pages/fan-clubs-launchpad-page/components/LaunchpadBuyModal.tsx`

- LaunchpadBuyModal waits for the polled AUDIO balance to change before proceeding, because RPC drift means an optimistic update is not enough. ([L412](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-clubs-launchpad-page/components/LaunchpadBuyModal.tsx#L412))

### `src/pages/fan-clubs-launchpad-page/constants.ts`

- The launchpad requires 0.03 SOL minimum because launching a coin costs about 0.0245 SOL plus some extra for swap fees. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-clubs-launchpad-page/constants.ts#L24))

### `src/pages/fan-clubs-launchpad-page/pages/BuyCoinPage.tsx`

- BuyCoinPage's FORM_INPUT_DECIMALS (8) limits how many decimal places the input accepts and is distinct from AUDIO_DECIMALS. ([L44](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-clubs-launchpad-page/pages/BuyCoinPage.tsx#L44))

### `src/pages/oauth-pay-page/hooks.ts`

- OAuth pay derives the recipient's user bank address locally with no RPC, and any account creation happens at confirm time in the same transaction. ([L174](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/oauth-pay-page/hooks.ts#L174))
- OAuth pay converts the URL amount (token decimals, e.g. 8) to the balance's decimal scale (e.g. 18 for AUDIO) before checking for sufficient balance. ([L240](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/oauth-pay-page/hooks.ts#L240))

### `src/pages/pay-and-earn-page/components/WithdrawalsTab.tsx`

- WithdrawalsTab reads transactions and reset through refs so the withdrawal poller only restarts when the awaited transaction changes, since reset is a new function every render. ([L131](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/pay-and-earn-page/components/WithdrawalsTab.tsx#L131))

### `src/pages/profile-page/components/FanClubFlairInput.tsx`

- FanClubFlairInput appends the currently selected badge coin to the dropdown options if missing, so the previous selection stays available after switching to Highest Balance or None. ([L70](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/profile-page/components/FanClubFlairInput.tsx#L70))

### `src/pages/rewards-page/components/ChallengeRewards/ChallengeRewardsTile.tsx`

- ChallengeRewardsTile skips challenge IDs without rewards config titles because the API may still return deprecated or hidden challenge IDs. ([L129](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/rewards-page/components/ChallengeRewards/ChallengeRewardsTile.tsx#L129))

### `src/pages/sign-up-page/components/useExternalWalletAuth.ts`

- isMetaMaskBug detects the MetaMask 'is not a function' error from metamask-extension issue 31464 so useExternalWalletAuth can skip it. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-up-page/components/useExternalWalletAuth.ts#L32))
- useExternalWalletAuth subscribes to network changes and waits for the Audius chain because of wagmi issue 4600 where switchNetwork resolves before the chain actually switches. ([L61](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-up-page/components/useExternalWalletAuth.ts#L61))
- useExternalWalletAuth ignores the MetaMask switchNetwork 'is not a function' error from metamask-extension issue 31464 and rethrows anything else. ([L81](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-up-page/components/useExternalWalletAuth.ts#L81))
- useExternalWalletAuth switches to mainnet before connecting as a workaround for a MetaMask bug, then switches to the Audius chain after connect. ([L111](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-up-page/components/useExternalWalletAuth.ts#L111))

### `src/services/audius-sdk/audiusSdk.ts`

- audiusSdk routes Ethereum RPC requests through an identity relay so identity can pay gas fees on approved transactions, using a dummy account replaced by the relay. ([L44](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/audius-sdk/audiusSdk.ts#L44))

### `src/services/audius-sdk/auth.ts`

- getAudiusWalletClient calls wagmi reconnect itself because a freshly loaded config rehydrates as disconnected and WagmiProvider may not have re-rendered to start the reconnect yet. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/audius-sdk/auth.ts#L53))

### `src/store/sign-out/sagas.ts`

- sign-out saga only disconnects wagmi when AppKit was lazily loaded, since otherwise no wallet connection exists. ([L22](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/store/sign-out/sagas.ts#L22))
