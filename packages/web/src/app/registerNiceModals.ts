/**
 * Side-effect imports for nice-modal-react registrations.
 *
 * Each imported module calls `NiceModal.register(id, Component)` and
 * `registerNiceModalId(id)` at module scope. Importing this file from
 * `AppProviders` ensures all registered modals are available before
 * anything tries to `showNiceModal(id)`.
 *
 * Add new NiceModal-managed modals here as they migrate.
 */
import 'components/add-cash-modal/AddCashModal'
import 'components/add-to-collection/desktop/AddToCollectionModal'
import 'components/album-track-remove-confirmation-modal/AlbumTrackRemoveConfirmationModal'
import 'components/artist-pick-modal/ArtistPickModal'
import 'components/buy-sell-modal/BuySellModal'
import 'components/coinflow-onramp-modal/CoinflowOnrampModal'
import 'components/delete-playlist-confirmation-modal/DeletePlaylistConfirmationModal'
import 'components/delete-track-confirmation-modal/DeleteTrackConfirmationModal'
import 'components/download-track-archive-modal/DownloadTrackArchiveModal'
import 'components/duplicate-add-confirmation-modal/DuplicateAddConfirmationModal'
import 'components/early-release-confirmation-modal/EarlyReleaseConfirmationModal'
import 'components/edit-access-confirmation-modal/EditAccessConfirmationModal'
import 'components/finalize-winners-confirmation-modal/FinalizeWinnersConfirmationModal'
import 'components/hide-confirmation-modal/HideContentConfirmationModal'
import 'components/host-remix-contest-modal/HostRemixContestModal'
import 'components/inbox-unavailable-modal/InboxUnavailableModal'
import 'components/leaving-audius-modal/LeavingAudiusModal'
import 'components/locked-content-modal/LockedContentModal'
import 'components/payout-wallet-modal/PayoutWalletModal'
import 'components/premium-content-purchase-modal/PremiumContentPurchaseModal'
import 'components/publish-confirmation-modal/PublishConfirmationModal'
import 'components/publish-hidden-tracks-confirmation-modal/PublishHiddenTracksConfirmationModal'
import 'components/receive-tokens-modal/ReceiveTokensModal'
import 'components/replace-track-confirmation-modal/ReplaceTrackConfirmationModal'
import 'components/replace-track-progress-modal/ReplaceTrackProgressModal'
import 'components/rewards/modals/ClaimAllRewardsModal'
import 'components/rewards/modals/TopAPI'
import 'components/send-tokens-modal/SendTokensModal'
import 'components/share-modal/ShareModal'
import 'components/transaction-details-modal/TransactionDetailsModal'
import 'components/upload-confirmation-modal/UploadConfirmationModal'
import 'components/usdc-purchase-details-modal/USDCPurchaseDetailsModal'
import 'components/usdc-transaction-details-modal/USDCTransactionDetailsModal'
import 'components/user-badges/TierExplainerModal'
import 'components/wait-for-download-modal/WaitForDownloadModal'
import 'components/welcome-modal/WelcomeModal'
import 'components/withdraw-usdc-modal/WithdrawUSDCModal'
import 'components/withdraw-usdc-modal/components/CoinflowWithdrawModal'
import 'pages/audio-page/components/modals/AudioBreakdownModal'
import 'pages/audio-page/components/modals/ConnectedWalletsModal'
import 'pages/audio-page/components/modals/TransferAudioMobileDrawer'
import 'pages/chat-page/components/ChatBlastModal'
import 'pages/fan-club-detail-page/components/ClaimVestedCoinsModal'
import 'pages/rewards-page/components/modals/ChallengeRewardsModal/ChallengeRewardsModal'
