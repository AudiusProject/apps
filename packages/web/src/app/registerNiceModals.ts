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
import 'components/album-track-remove-confirmation-modal/AlbumTrackRemoveConfirmationModal'
import 'components/delete-playlist-confirmation-modal/DeletePlaylistConfirmationModal'
import 'components/delete-track-confirmation-modal/DeleteTrackConfirmationModal'
import 'components/duplicate-add-confirmation-modal/DuplicateAddConfirmationModal'
import 'components/early-release-confirmation-modal/EarlyReleaseConfirmationModal'
import 'components/edit-access-confirmation-modal/EditAccessConfirmationModal'
import 'components/finalize-winners-confirmation-modal/FinalizeWinnersConfirmationModal'
import 'components/hide-confirmation-modal/HideContentConfirmationModal'
import 'components/leaving-audius-modal/LeavingAudiusModal'
import 'components/publish-confirmation-modal/PublishConfirmationModal'
import 'components/replace-track-confirmation-modal/ReplaceTrackConfirmationModal'
import 'components/replace-track-progress-modal/ReplaceTrackProgressModal'
import 'components/share-modal/ShareModal'
import 'components/upload-confirmation-modal/UploadConfirmationModal'
import 'components/user-badges/TierExplainerModal'
import 'components/welcome-modal/WelcomeModal'
