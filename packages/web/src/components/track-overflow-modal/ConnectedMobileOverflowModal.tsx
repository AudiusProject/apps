import {
  useToggleFavoriteTrack,
  useUser,
  useTrack,
  useCollection
} from '@audius/common/api'
import {
  FavoriteSource,
  ID,
  RepostSource,
  ShareSource,
  FollowSource,
  ModalSource
} from '@audius/common/models'
import {
  cacheCollectionsActions,
  collectionsSocialActions,
  tracksSocialActions,
  usersSocialActions,
  addToCollectionUIActions,
  deletePlaylistConfirmationModalUIActions,
  mobileOverflowMenuUISelectors,
  shareModalUIActions,
  modalsSelectors,
  modalsActions,
  usePremiumContentPurchaseModal,
  OverflowSource,
  PurchaseableContentType
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import { connect } from 'react-redux'
import { useNavigate } from 'react-router-dom-v5-compat'
import { Dispatch } from 'redux'

import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { AppState } from 'store/types'
import { push } from 'utils/navigation'

import MobileOverflowModal from './components/MobileOverflowModal'

const { profilePage, collectionPage } = route
const { setVisibility } = modalsActions
const { getModalVisibility } = modalsSelectors
const { getMobileOverflowModal } = mobileOverflowMenuUISelectors
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { requestOpen: openDeletePlaylist } =
  deletePlaylistConfirmationModalUIActions
const { requestOpen: openAddToCollection } = addToCollectionUIActions
const { followUser, unfollowUser } = usersSocialActions
const { repostTrack, undoRepostTrack } = tracksSocialActions
const {
  repostCollection,
  saveCollection,
  shareCollection,
  undoRepostCollection,
  unsaveCollection
} = collectionsSocialActions
const { publishPlaylist } = cacheCollectionsActions

type ConnectedMobileOverflowModalProps = {
  id: ID | string | null
  source: OverflowSource
  overflowActions: any
  overflowActionCallbacks: any
  isOpen: boolean
  onClose: () => void
} & ReturnType<typeof mapDispatchToProps>

// A connected `MobileOverflowModal`. Builds and injects callbacks for it's contained MobileOverflowModal component.
const ConnectedMobileOverflowModal = ({
  id,
  source,
  overflowActions,
  overflowActionCallbacks,
  isOpen,
  onClose,
  repostTrack,
  unrepostTrack,
  repostCollection,
  unrepostCollection,
  saveCollection,
  unsaveCollection,
  addToCollection,
  deletePlaylist,
  publishPlaylist,
  visitTrackPage,
  visitArtistPage,
  visitPlaylistPage,
  follow,
  unfollow,
  shareUser
}: ConnectedMobileOverflowModalProps) => {
  const { onOpen: openPremiumContentModal } = usePremiumContentPurchaseModal()
  const openPurchaseModal = useRequiresAccountCallback(
    (...args: Parameters<typeof openPremiumContentModal>) =>
      openPremiumContentModal(...args),
    [openPremiumContentModal]
  )
  const navigate = useNavigate()

  // Fetch data based on source
  const { data: track } = useTrack(
    source === OverflowSource.TRACKS ? (id as number) : null
  )
  const { data: collection } = useCollection(
    source === OverflowSource.COLLECTIONS ? (id as number) : null
  )
  const { data: user } = useUser(
    source === OverflowSource.PROFILE
      ? (id as number)
      : source === OverflowSource.TRACKS
        ? track?.owner_id
        : collection?.playlist_owner_id
  )

  const toggleSaveTrack = useToggleFavoriteTrack({
    trackId: id as number,
    source: FavoriteSource.OVERFLOW
  })

  // Create callbacks
  const {
    onRepost,
    onUnrepost,
    onFavorite,
    onUnfavorite,
    onShare,
    onAddToAlbum,
    onAddToPlaylist,
    onEditPlaylist,
    onPublishPlaylist,
    onDeletePlaylist,
    onVisitTrackPage,
    onVisitArtistPage,
    onVisitCollectionPage,
    onFollow,
    onUnfollow,
    onPurchase
  } = ((): {
    onRepost?: () => void
    onUnrepost?: () => void
    onFavorite?: () => void
    onUnfavorite?: () => void
    onShare?: () => void
    onAddToAlbum?: () => void
    onAddToPlaylist?: () => void
    onEditPlaylist?: () => void
    onPublishPlaylist?: () => void
    onDeletePlaylist?: () => void
    onVisitTrackPage?: () => void
    onVisitArtistPage?: () => void
    onVisitCollectionPage?: () => void
    onFollow?: () => void
    onUnfollow?: () => void
    onPurchase?: () => void
  } => {
    if (!id || !user) return {}

    switch (source) {
      case OverflowSource.TRACKS: {
        if (!track) return {}
        return {
          onRepost: () => repostTrack(id as ID),
          onUnrepost: () => unrepostTrack(id as ID),
          onFavorite: () => toggleSaveTrack(),
          onUnfavorite: () => toggleSaveTrack(),
          onAddToAlbum: () => addToCollection('album', id as ID, track.title),
          onAddToPlaylist: () =>
            addToCollection('playlist', id as ID, track.title),
          onVisitTrackPage: () =>
            track.permalink
              ? visitTrackPage(track.permalink)
              : console.error(`Permalink missing for track ${id}`),
          onVisitArtistPage: () => visitArtistPage(user.handle),
          onFollow: () => follow(track.owner_id),
          onUnfollow: () => unfollow(track.owner_id),
          onPurchase: () =>
            openPurchaseModal(
              {
                contentId: id as ID,
                contentType: PurchaseableContentType.TRACK
              },
              { source: ModalSource.OverflowMenu }
            )
        }
      }
      case OverflowSource.COLLECTIONS: {
        if (!collection) return {}
        return {
          onRepost: () => repostCollection(id as ID),
          onUnrepost: () => unrepostCollection(id as ID),
          onFavorite: () => saveCollection(id as ID),
          onUnfavorite: () => unsaveCollection(id as ID),
          onShare: () => shareCollection(id as ID, ShareSource.OVERFLOW),
          onVisitArtistPage: () => visitArtistPage(user.handle),
          onVisitCollectionPage: () =>
            visitPlaylistPage(
              id as ID,
              user.handle,
              collection.playlist_name,
              collection.permalink,
              collection.is_album
            ),
          onEditPlaylist: () => navigate(`${collection.permalink}/edit`),
          onDeletePlaylist: collection.is_album
            ? () => {}
            : () => deletePlaylist(id as ID),
          onPublishPlaylist: collection.is_album
            ? () => {}
            : () => publishPlaylist(id as ID)
        }
      }

      case OverflowSource.PROFILE: {
        return {
          onFollow: () => follow(id as ID),
          onUnfollow: () => unfollow(id as ID),
          onShare: () => shareUser(id as ID)
        }
      }
    }
  })()

  return (
    <MobileOverflowModal
      actions={overflowActions}
      callbacks={overflowActionCallbacks}
      isOpen={isOpen}
      onClose={onClose}
      onRepost={onRepost}
      onUnrepost={onUnrepost}
      onFavorite={onFavorite}
      onUnfavorite={onUnfavorite}
      onShare={onShare}
      onAddToAlbum={onAddToAlbum}
      onAddToPlaylist={onAddToPlaylist}
      onVisitTrackPage={onVisitTrackPage}
      onEditPlaylist={onEditPlaylist}
      onPublishPlaylist={onPublishPlaylist}
      onDeletePlaylist={onDeletePlaylist}
      onVisitArtistPage={onVisitArtistPage}
      onVisitCollectionPage={onVisitCollectionPage}
      onFollow={onFollow}
      onUnfollow={onUnfollow}
      onPurchase={onPurchase}
    />
  )
}

const mapStateToProps = (state: AppState) => {
  const modalState = getMobileOverflowModal(state)
  const modalVisibleState = getModalVisibility(state, 'Overflow')
  return {
    ...modalState,
    isOpen: modalVisibleState === true
  }
}

const mapDispatchToProps = (dispatch: Dispatch) => {
  return {
    onClose: () =>
      dispatch(setVisibility({ modal: 'Overflow', visible: false })),
    // Tracks
    repostTrack: (trackId: ID) =>
      dispatch(repostTrack(trackId, RepostSource.OVERFLOW)),
    unrepostTrack: (trackId: ID) =>
      dispatch(undoRepostTrack(trackId, RepostSource.OVERFLOW)),

    // Collections
    shareCollection: (collectionId: ID) =>
      dispatch(shareCollection(collectionId, ShareSource.OVERFLOW)),
    repostCollection: (collectionId: ID, metadata?: any) =>
      dispatch(repostCollection(collectionId, metadata)),
    unrepostCollection: (collectionId: ID, metadata?: any) =>
      dispatch(undoRepostCollection(collectionId, metadata)),
    saveCollection: (collectionId: ID) =>
      dispatch(saveCollection(collectionId, FavoriteSource.OVERFLOW)),
    unsaveCollection: (collectionId: ID) =>
      dispatch(unsaveCollection(collectionId, FavoriteSource.OVERFLOW)),
    deletePlaylist: (playlistId: ID) =>
      dispatch(openDeletePlaylist({ playlistId })),
    publishPlaylist: (playlistId: ID) => dispatch(publishPlaylist(playlistId)),

    // Users
    follow: (userId: ID) => dispatch(followUser(userId, FollowSource.OVERFLOW)),
    unfollow: (userId: ID) =>
      dispatch(unfollowUser(userId, FollowSource.OVERFLOW)),
    shareUser: (userId: ID) => {
      dispatch(
        requestOpenShareModal({
          type: 'profile',
          profileId: userId,
          source: ShareSource.OVERFLOW
        })
      )
    },
    // Routes
    addToCollection: (
      collectionType: 'album' | 'playlist',
      trackId: ID,
      title: string
    ) => dispatch(openAddToCollection(collectionType, trackId, title)),
    visitTrackPage: (permalink: string) => dispatch(push(permalink)),
    visitArtistPage: (handle: string) => dispatch(push(profilePage(handle))),
    visitPlaylistPage: (
      playlistId: ID,
      handle: string,
      playlistTitle: string,
      permalink: string,
      isAlbum: boolean
    ) =>
      dispatch(
        push(
          collectionPage(handle, playlistTitle, playlistId, permalink, isAlbum)
        )
      )
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ConnectedMobileOverflowModal)
