# 0026. Payments, auth and security on mobile

- Status: Accepted
- Date: 2026-11-21

## Context

Wallets, purchases, coins, sign-on, OAuth, manager mode, privacy and security handling. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `react-native.config.js`

- react-native.config disables react-native-fast-crypto on Android because its prebuilt library logs the password; Android uses AudiusScrypt instead. ([L4](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/react-native.config.js#L4))

### `src/app/Drawers.tsx`

- commonDrawersMap must list PremiumContentPurchase, AddCash, PurchaseVendor and StripeOnRamp in that order to avoid zIndex stacking issues. ([L136](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/Drawers.tsx#L136))

### `src/components/coinflow-onramp-drawer/CoinflowOnrampDrawer.tsx`

- CoinflowOnrampDrawer spreads sessionKey into CoinflowPurchase because the SDK supports it with a wallet at runtime but its types omit it. ([L127](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/coinflow-onramp-drawer/CoinflowOnrampDrawer.tsx#L127))

### `src/components/fields/PriceField.tsx`

- PriceField caps input length at MAX_SAFE_INTEGER digits minus 3 so the cents conversion cannot overflow a safe integer. ([L19](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/fields/PriceField.tsx#L19))
- PriceField stores the Formik value as an integer number of cents and converts to and from a human-readable dollar string for display. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/fields/PriceField.tsx#L28))

### `src/components/image/CoverPhoto.tsx`

- CoverPhoto shows the default placeholder for deactivated or deleted accounts so their cover photo is never exposed, for privacy and GDPR. ([L46](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/image/CoverPhoto.tsx#L46))

### `src/components/image/UserImage.tsx`

- UserImage shows the default placeholder for deactivated or deleted accounts so their profile picture is never exposed, for privacy and GDPR. ([L42](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/image/UserImage.tsx#L42))

### `src/components/manager-mode/ManagedAccountUnavailableScreen.tsx`

- withManagedAccountRestriction shows an unavailable screen for wallet-backed screens like DMs while managing another account, since a manager cannot act as the managed account's wallet. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/manager-mode/ManagedAccountUnavailableScreen.tsx#L41))

### `src/components/manager-mode/useManagerModeAccounts.ts`

- useManagerModeAccounts keeps the account switcher available while managing an account even if the flag is off, so no one gets stuck in manager mode. ([L11](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/manager-mode/useManagerModeAccounts.ts#L11))

### `src/components/premium-content-purchase-drawer/PremiumContentPurchaseDrawer.tsx`

- PremiumContentPurchaseDrawer eagerly creates the user bank on open so it is ready at purchase time, and starts recovery of USDC stuck in the root wallet from an interrupted onramp. ([L251](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/premium-content-purchase-drawer/PremiumContentPurchaseDrawer.tsx#L251))

### `src/components/premium-content-purchase-drawer/hooks/usePurchaseSummaryValues.ts`

- usePurchaseSummaryValues passes undefined extraAmount only for the NONE preset so the pay-extra row hides; an explicit 0 still renders the row until the user picks no preset. ([L33](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/premium-content-purchase-drawer/hooks/usePurchaseSummaryValues.ts#L33))

### `src/components/receive-tokens-drawer/ReceiveTokensDrawer.tsx`

- ReceiveTokensDrawer shows the root wallet address for USDC deposits and the user bank address for all other tokens. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/receive-tokens-drawer/ReceiveTokensDrawer.tsx#L40))

### `src/components/send-tokens-drawer/SendTokensDrawer.tsx`

- SendTokensDrawer passes the recipient user's erc_wallet so the send derives their user-bank associated token account rather than relying on spl_wallet. ([L103](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/send-tokens-drawer/SendTokensDrawer.tsx#L103))
- SendTokensDrawer closes without resetting state before navigating to user selection so the form is restored when the drawer reopens with the chosen user. ([L162](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/send-tokens-drawer/SendTokensDrawer.tsx#L162))

### `src/components/send-tokens-drawer/components/SendTokensInput.tsx`

- SendTokensInput sets destinationAddress to the user's spl_wallet only for display; the backend derives the recipient's user-bank ATA from their ETH address. ([L200](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/send-tokens-drawer/components/SendTokensInput.tsx#L200))

### `src/components/track-list/TrackListItem.tsx`

- TrackListItem treats USDC purchase-gated tracks as playable even when locked, unlike other gated tracks, because they have previews. ([L238](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/track-list/TrackListItem.tsx#L238))

### `src/screens/change-password-screen/ResendCodeLink.tsx`

- ResendCodeLink resends the verification code by calling identityService.changeEmail without an OTP; the expected OTP-missing error means a new code was sent. ([L21](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/change-password-screen/ResendCodeLink.tsx#L21))

### `src/screens/coin-details-screen/EditCoinDetailsScreen.tsx`

- EditCoinDetailsScreen keeps empty strings in the social links array because the update-coin API treats an empty string as deleting that link. ([L310](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/coin-details-screen/EditCoinDetailsScreen.tsx#L310))

### `src/screens/edit-track-screen/util.ts`

- When a track becomes USDC purchase gated, the edit-track util sets is_downloadable and is_original_available true unless download conditions were already USDC gated. ([L65](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/edit-track-screen/util.ts#L65))

### `src/screens/oauth-screen/hooks/useParsedParams.ts`

- useParsedParams rejects write_once connect_dashboard_wallet on mobile because it requires a postMessage back-channel that a native app cannot provide. ([L109](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/oauth-screen/hooks/useParsedParams.ts#L109))

### `src/screens/rewards-screen/ChallengeRewardsTile.tsx`

- ChallengeRewardsTile skips challenge IDs with no rewards-config title because the API can still return deprecated or hidden challenge IDs. ([L142](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/rewards-screen/ChallengeRewardsTile.tsx#L142))

### `src/screens/settings-screen/AccountSettingsScreen.tsx`

- AccountSettingsScreen hides email, password and verification while managing another account because those belong to the signed-in user, not the managed account. ([L109](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/settings-screen/AccountSettingsScreen.tsx#L109))

### `src/screens/settings-screen/manager-mode/AccountsManagingYouScreen.tsx`

- Manager-mode screens (AccountsManagingYouScreen, AccountsYouManageScreen) query grants with staleTime 0 because grants can change from web or another device. ([L54](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/settings-screen/manager-mode/AccountsManagingYouScreen.tsx#L54))

### `src/screens/settings-screen/manager-mode/AccountsYouManageScreen.tsx`

- Manager-mode screens (AccountsManagingYouScreen, AccountsYouManageScreen) query grants with staleTime 0 because grants can change from web or another device. ([L128](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/settings-screen/manager-mode/AccountsYouManageScreen.tsx#L128))
- AccountsYouManageScreen omits the switch-to-user action while already managing an account because the grant belongs to the signed-in user, not the managed account. ([L145](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/settings-screen/manager-mode/AccountsYouManageScreen.tsx#L145))

### `src/screens/sign-on-screen/SignOnStack.tsx`

- SignOnStack handles each signon page transition once via lastHandledPage, so editing the handle on PickHandle doesn't advance the user to FinishProfile before they submit. ([L81](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/sign-on-screen/SignOnStack.tsx#L81))

### `src/screens/sign-on-screen/components/EmailField.tsx`

- Sign-on EmailField writes every change to redux because email inputs appear in several places and must stay in sync when swapping between them. ([L15](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/sign-on-screen/components/EmailField.tsx#L15))

### `src/screens/sign-on-screen/screens/SelectArtistScreen/SelectArtistsScreen.tsx`

- SelectArtistsScreen stores selections in redux rather than Formik because Formik caused performance problems on this screen. ([L27](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/sign-on-screen/screens/SelectArtistScreen/SelectArtistsScreen.tsx#L27))

### `src/screens/sign-on-screen/screens/SelectArtistScreen/selectArtistPreviewContext.tsx`

- The select-artist preview context fetches an artist's top 3 tracks because it only needs one playable track and all 3 being unavailable is unlikely. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/sign-on-screen/screens/SelectArtistScreen/selectArtistPreviewContext.tsx#L53))

### `src/screens/sign-on-screen/screens/SelectGenresScreen.tsx`

- SelectGenresFieldArray keeps genres in React state alongside Formik because setState's updater gives access to previous values, then syncs Formik from it. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/sign-on-screen/screens/SelectGenresScreen.tsx#L41))

### `src/screens/sign-on-screen/screens/SignInScreen.tsx`

- SignInScreen re-sets the password field after navigating to ConfirmEmail so the OTP error is cleared and the user can come back to the sign-in page. ([L58](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/sign-on-screen/screens/SignInScreen.tsx#L58))

### `src/screens/wallet-screen/components/CashWallet.tsx`

- CashWallet dispatches buyUSDC startRecoveryIfNecessary on mount to recover USDC left in the root wallet by an interrupted onramp. ([L35](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/wallet-screen/components/CashWallet.tsx#L35))

### `src/services/createPrivateKey.ts`

- createPrivateKey uses the app's AudiusScrypt native module on Android because react-native-fast-crypto's prebuilt Android library logs the password; older binaries without the module fall back to fast-crypto. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/createPrivateKey.ts#L12))

### `src/store/sign-out/sagas.ts`

- Mobile sign-out dispatches setupBackend to reach a first-load state (it finds no account), standing in for the page reload web does. ([L58](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/sign-out/sagas.ts#L58))

### `src/store/wallet-connect/sagas/connectNewWalletSaga.ts`

- connectNewWalletSaga throws when the dapp key pair is missing, which happens if the app restarted while Phantom was open. ([L47](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/wallet-connect/sagas/connectNewWalletSaga.ts#L47))

### `src/store/wallet-connect/sagas/signMessageSaga.ts`

- signMessageSaga waits for a confirming wallet, chain or error because on Solana phone the connectWallet saga hasn't finished before signMessage starts. ([L63](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/wallet-connect/sagas/signMessageSaga.ts#L63))

### `src/utils/webCrypto/subtleCrypto.ts`

- installSubtleCrypto only adds crypto.subtle and never replaces the native getRandomValues provided by react-native-get-random-values. ([L222](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/utils/webCrypto/subtleCrypto.ts#L222))
