import { OverflowAction, OverflowActionCallbacks } from '@audius/common/store'

import ActionSheetModal from 'components/action-drawer/ActionDrawer'

type MobileOverflowModalProps = {
  // Actions to show in the modal
  actions: OverflowAction[]
  // Extra callbacks to fire after a row/action is selected
  callbacks?: OverflowActionCallbacks
  isOpen: boolean
  onClose: () => void
  onRepost?: () => void
  onUnrepost?: () => void
  onFavorite?: () => void
  onUnfavorite?: () => void
  onShare?: () => void
  onAddToAlbum?: () => void
  onAddToPlaylist?: () => void
  onEditPlaylist?: () => void
  onDeletePlaylist?: () => void
  onPublishPlaylist?: () => void
  onVisitTrackPage?: () => void
  onVisitArtistPage?: () => void
  onVisitCollectionPage?: () => void
  onFollow?: () => void
  onUnfollow?: () => void
  onPurchase?: () => void
}

const rowMessageMap = {
  [OverflowAction.REPOST]: 'Repost',
  [OverflowAction.UNREPOST]: 'Unrepost',
  [OverflowAction.FAVORITE]: 'Favorite',
  [OverflowAction.UNFAVORITE]: 'Unfavorite',
  [OverflowAction.SHARE]: 'Share',
  [OverflowAction.ADD_TO_ALBUM]: 'Add To Album',
  [OverflowAction.ADD_TO_PLAYLIST]: 'Add To Playlist',
  [OverflowAction.REMOVE_FROM_PLAYLIST]: 'Remove From This Playlist',
  [OverflowAction.EDIT_ALBUM]: 'Edit Album',
  [OverflowAction.EDIT_PLAYLIST]: 'Edit Playlist',
  [OverflowAction.DELETE_ALBUM]: 'Delete Album',
  [OverflowAction.DELETE_PLAYLIST]: 'Delete Playlist',
  [OverflowAction.PUBLISH_PLAYLIST]: 'Publish Playlist',
  [OverflowAction.VIEW_TRACK_PAGE]: 'View Track Page',
  [OverflowAction.VIEW_ARTIST_PAGE]: 'View Profile',
  [OverflowAction.VIEW_PLAYLIST_PAGE]: 'View Playlist Page',
  [OverflowAction.VIEW_EPISODE_PAGE]: 'View Episode Page',
  [OverflowAction.VIEW_ALBUM_PAGE]: 'View Album Page',
  [OverflowAction.FOLLOW_ARTIST]: 'Follow Artist',
  [OverflowAction.UNFOLLOW_ARTIST]: 'Unfollow Artist',
  [OverflowAction.FOLLOW]: 'Follow',
  [OverflowAction.UNFOLLOW]: 'Unfollow',
  [OverflowAction.EDIT_TRACK]: 'Edit Track',
  [OverflowAction.RELEASE_NOW]: 'Release Now',
  [OverflowAction.DELETE_TRACK]: 'Delete Track',
  [OverflowAction.MARK_AS_PLAYED]: 'Mark as Played',
  [OverflowAction.MARK_AS_UNPLAYED]: 'Mark as Unplayed',
  [OverflowAction.PURCHASE_TRACK]: 'Purchase Track'
}

// A modal for displaying overflow options on mobile.
// Configurable by passing in an array of `OverflowActions`.
const MobileOverflowModal = ({
  actions,
  callbacks,
  isOpen,
  onClose,
  onRepost,
  onUnrepost,
  onFavorite,
  onUnfavorite,
  onShare,
  onAddToAlbum,
  onAddToPlaylist,
  onEditPlaylist,
  onDeletePlaylist,
  onPublishPlaylist,
  onVisitTrackPage,
  onVisitArtistPage,
  onVisitCollectionPage,
  onFollow,
  onUnfollow,
  onPurchase
}: MobileOverflowModalProps) => {
  // Mapping from rows to prop callbacks.
  const rowCallbacks = {
    [OverflowAction.REPOST]: onRepost,
    [OverflowAction.UNREPOST]: onUnrepost,
    [OverflowAction.FAVORITE]: onFavorite,
    [OverflowAction.UNFAVORITE]: onUnfavorite,
    [OverflowAction.SHARE]: onShare,
    [OverflowAction.ADD_TO_ALBUM]: onAddToAlbum,
    [OverflowAction.ADD_TO_PLAYLIST]: onAddToPlaylist,
    [OverflowAction.EDIT_ALBUM]: onEditPlaylist,
    [OverflowAction.EDIT_PLAYLIST]: onEditPlaylist,
    [OverflowAction.DELETE_ALBUM]: onDeletePlaylist,
    [OverflowAction.DELETE_PLAYLIST]: onDeletePlaylist,
    [OverflowAction.PUBLISH_PLAYLIST]: onPublishPlaylist,
    [OverflowAction.VIEW_TRACK_PAGE]: onVisitTrackPage,
    [OverflowAction.VIEW_EPISODE_PAGE]: onVisitTrackPage,
    [OverflowAction.VIEW_ARTIST_PAGE]: onVisitArtistPage,
    [OverflowAction.VIEW_PLAYLIST_PAGE]: onVisitCollectionPage,
    [OverflowAction.VIEW_ALBUM_PAGE]: onVisitCollectionPage,
    [OverflowAction.FOLLOW_ARTIST]: onFollow,
    [OverflowAction.UNFOLLOW_ARTIST]: onUnfollow,
    [OverflowAction.FOLLOW]: onFollow,
    [OverflowAction.UNFOLLOW]: onUnfollow,
    [OverflowAction.PURCHASE_TRACK]: onPurchase,
    // These are implement in native mobile,
    // but not mobile web
    [OverflowAction.REMOVE_FROM_PLAYLIST]: () => {},
    [OverflowAction.EDIT_TRACK]: () => {},
    [OverflowAction.RELEASE_NOW]: () => {},
    [OverflowAction.DELETE_TRACK]: () => {},
    [OverflowAction.MARK_AS_PLAYED]: () => {},
    [OverflowAction.MARK_AS_UNPLAYED]: () => {}
  }

  const didSelectRow = (index: number) => {
    const action = actions[index]
    const callback = rowCallbacks[action] || (() => {})
    if (callbacks && callbacks[action]) {
      callbacks[action]!()
    }
    // Eventually: will need some special casing for onAddToCollection, which returns
    // a function accepting playlistId
    callback()
    onClose()
  }

  return (
    <ActionSheetModal
      isOpen={isOpen}
      onClose={onClose}
      actions={actions ? actions.map((r) => ({ text: rowMessageMap[r] })) : []}
      didSelectRow={didSelectRow}
    />
  )
}

export default MobileOverflowModal
