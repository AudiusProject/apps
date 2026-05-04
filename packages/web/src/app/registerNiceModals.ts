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
import 'components/album-track-remove-confirmation-modal/AlbumTrackRemoveConfirmationModal'
import 'components/artist-pick-modal/ArtistPickModal'
import 'components/buy-sell-modal/BuySellModal'
import 'components/delete-playlist-confirmation-modal/DeletePlaylistConfirmationModal'
import 'components/delete-track-confirmation-modal/DeleteTrackConfirmationModal'
import 'components/download-track-archive-modal/DownloadTrackArchiveModal'
import 'components/duplicate-add-confirmation-modal/DuplicateAddConfirmationModal'
import 'components/early-release-confirmation-modal/EarlyReleaseConfirmationModal'
import 'components/edit-access-confirmation-modal/EditAccessConfirmationModal'
import 'components/finalize-winners-confirmation-modal/FinalizeWinnersConfirmationModal'
import 'components/hide-confirmation-modal/HideContentConfirmationModal'
import 'components/inbox-unavailable-modal/InboxUnavailableModal'
import 'components/leaving-audius-modal/LeavingAudiusModal'
import 'components/locked-content-modal/LockedContentModal'
import 'components/payout-wallet-modal/PayoutWalletModal'
import 'components/publish-confirmation-modal/PublishConfirmationModal'
import 'components/receive-tokens-modal/ReceiveTokensModal'
import 'components/replace-track-confirmation-modal/ReplaceTrackConfirmationModal'
import 'components/replace-track-progress-modal/ReplaceTrackProgressModal'
import 'components/share-modal/ShareModal'
import 'components/transaction-details-modal/TransactionDetailsModal'
import 'components/upload-confirmation-modal/UploadConfirmationModal'
import 'components/user-badges/TierExplainerModal'
import 'components/wait-for-download-modal/WaitForDownloadModal'
import 'components/welcome-modal/WelcomeModal'
import 'pages/audio-page/components/modals/AudioBreakdownModal'
import 'pages/audio-page/components/modals/ConnectedWalletsModal'
import 'pages/chat-page/components/ChatBlastModal'
