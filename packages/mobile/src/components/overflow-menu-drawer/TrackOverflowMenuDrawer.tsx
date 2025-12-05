import { useCallback, useContext } from 'react'
import type React from 'react'

import {
  useCollection,
  useCurrentUserId,
  useToggleFavoriteTrack,
  useTrack,
  useUser
} from '@audius/common/api'
import {
  ShareSource,
  RepostSource,
  FavoriteSource,
  FollowSource,
  ModalSource
} from '@audius/common/models'
import type { ID } from '@audius/common/models'
import {
  cacheCollectionsActions,
  collectionPageLineupActions as tracksActions,
  tracksSocialActions,
  usersSocialActions,
  addToCollectionUIActions,
  mobileOverflowMenuUISelectors,
  shareModalUIActions,
  OverflowAction,
  playbackPositionActions,
  PurchaseableContentType,
  usePremiumContentPurchaseModal,
  usePublishConfirmationModal,
  trackPageActions,
  artistPickModalActions,
  playerActions,
  playerSelectors,
  useHostRemixContestModal
} from '@audius/common/store'
import type { OverflowActionCallbacks } from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import { useDrawer } from 'app/hooks/useDrawer'
import { useNavigation } from 'app/hooks/useNavigation'
import { useToast } from 'app/hooks/useToast'
import { AppTabNavigationContext } from 'app/screens/app-screen'
import { setVisibility } from 'app/store/drawers/slice'

import { useCommentDrawer } from '../comments/CommentDrawerContext'

const { getUid } = playerSelectors
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { getMobileOverflowModal } = mobileOverflowMenuUISelectors
const { requestOpen: openAddToCollectionModal } = addToCollectionUIActions
const { followUser, unfollowUser } = usersSocialActions
const { setTrackPosition, clearTrackPosition } = playbackPositionActions
const { repostTrack, undoRepostTrack } = tracksSocialActions
const { removeTrackFromPlaylist } = cacheCollectionsActions

type Props = {
  render: (callbacks: OverflowActionCallbacks) => React.ReactElement
}

const messages = {
  markedAsPlayed: 'Marked as Played',
  markedAsUnplayed: 'Marked as Unplayed'
}

const TrackOverflowMenuDrawer = ({ render }: Props) => {
  const { onClose: closeNowPlayingDrawer } = useDrawer('NowPlaying')
  const { navigation: contextNavigation } = useContext(AppTabNavigationContext)
  const { data: currentUserId } = useCurrentUserId()
  const navigation = useNavigation({ customNavigation: contextNavigation })
  const dispatch = useDispatch()
  const { toast } = useToast()
  const { id: modalId, contextPlaylistId } = useSelector(getMobileOverflowModal)
  const id = modalId as ID
  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()
  const uid = useSelector(getUid)

  const { open } = useCommentDrawer()

  const { data: track } = useTrack(id)
  const { data: track_ids } = useCollection(contextPlaylistId, {
    select: (collection) => collection.playlist_contents.track_ids
  })
  const playlistTrackInfo = track_ids?.find((t) => t.track === track?.track_id)

  const albumInfo = track?.album_backlink

  const { data: user } = useUser(track?.owner_id)

  const toggleSaveTrack = useToggleFavoriteTrack({
    trackId: id,
    source: FavoriteSource.OVERFLOW
  })

  const handlePurchasePress = useCallback(() => {
    if (track?.track_id) {
      openPremiumContentPurchaseModal(
        {
          contentId: track?.track_id,
          contentType: PurchaseableContentType.TRACK
        },
        { source: ModalSource.TrackListItem }
      )
    }
  }, [track, openPremiumContentPurchaseModal])

  const { onOpen: openPublishConfirmation } = usePublishConfirmationModal()
  const { onOpen: openHostRemixContest } = useHostRemixContestModal()

  const handleSetAsArtistPick = useCallback(() => {
    if (track) {
      dispatch(artistPickModalActions.open({ trackId: track.track_id }))
    }
  }, [dispatch, track])

  const handleUnsetAsArtistPick = useCallback(() => {
    dispatch(artistPickModalActions.open({ trackId: null }))
  }, [dispatch])

  const handleOpenCommentsDrawer = useCallback(() => {
    if (track?.track_id) {
      open({
        entityId: track.track_id,
        navigation,
        actions: playerActions,
        uid: uid as string
      })
    }
  }, [uid, navigation, open, track?.track_id])

  const handleOpenRemixContestDrawer = useCallback(() => {
    if (track?.track_id) {
      openHostRemixContest({ trackId: track.track_id })
    }
  }, [track?.track_id, openHostRemixContest])

  if (!track || !user) {
    return null
  }
  const { owner_id, title, is_unlisted } = track
  const { handle } = user

  if (!id || !owner_id || !handle || !title) {
    return null
  }

  const callbacks = {
    [OverflowAction.REPOST]: () =>
      dispatch(repostTrack(id, RepostSource.OVERFLOW)),
    [OverflowAction.UNREPOST]: () =>
      dispatch(undoRepostTrack(id, RepostSource.OVERFLOW)),
    [OverflowAction.FAVORITE]: () => toggleSaveTrack(),
    [OverflowAction.UNFAVORITE]: () => toggleSaveTrack(),
    [OverflowAction.SHARE]: () =>
      dispatch(
        requestOpenShareModal({
          type: 'track',
          trackId: id,
          source: ShareSource.OVERFLOW
        })
      ),
    [OverflowAction.ADD_TO_ALBUM]: () =>
      dispatch(openAddToCollectionModal('album', id, title, is_unlisted)),
    [OverflowAction.ADD_TO_PLAYLIST]: () =>
      dispatch(openAddToCollectionModal('playlist', id, title, is_unlisted)),
    [OverflowAction.REMOVE_FROM_PLAYLIST]: () => {
      if (contextPlaylistId && playlistTrackInfo) {
        const { metadata_time, time } = playlistTrackInfo
        dispatch(
          removeTrackFromPlaylist(
            track.track_id,
            contextPlaylistId,
            metadata_time ?? time
          )
        )
        dispatch(tracksActions.fetchLineupMetadatas())
      }
    },
    [OverflowAction.VIEW_TRACK_PAGE]: () => {
      closeNowPlayingDrawer()
      navigation?.push('Track', { trackId: id })
    },
    [OverflowAction.VIEW_EPISODE_PAGE]: () => {
      closeNowPlayingDrawer()
      navigation?.push('Track', { trackId: id })
    },
    [OverflowAction.VIEW_ALBUM_PAGE]: () => {
      albumInfo && navigation?.push('Collection', { id: albumInfo.playlist_id })
    },
    [OverflowAction.VIEW_ARTIST_PAGE]: () => {
      closeNowPlayingDrawer()
      navigation?.push('Profile', { handle })
    },
    [OverflowAction.FOLLOW_ARTIST]: () =>
      dispatch(followUser(owner_id, FollowSource.OVERFLOW)),
    [OverflowAction.UNFOLLOW_ARTIST]: () =>
      dispatch(unfollowUser(owner_id, FollowSource.OVERFLOW)),
    [OverflowAction.EDIT_TRACK]: () => {
      navigation?.push('EditTrack', { id })
    },
    [OverflowAction.RELEASE_NOW]: () => {
      openPublishConfirmation({
        contentType: 'playlist',
        confirmCallback: () => dispatch(trackPageActions.makeTrackPublic(id))
      })
    },
    [OverflowAction.DELETE_TRACK]: () => {
      dispatch(
        setVisibility({
          drawer: 'DeleteTrackConfirmation',
          visible: true,
          data: { trackId: id }
        })
      )
    },
    [OverflowAction.MARK_AS_PLAYED]: () => {
      dispatch(
        setTrackPosition({
          userId: currentUserId,
          trackId: id,
          positionInfo: { status: 'COMPLETED', playbackPosition: 0 }
        })
      )
      toast({ content: messages.markedAsPlayed })
    },
    [OverflowAction.MARK_AS_UNPLAYED]: () => {
      dispatch(clearTrackPosition({ trackId: id, userId: currentUserId }))
      toast({ content: messages.markedAsUnplayed })
    },
    [OverflowAction.PURCHASE_TRACK]: handlePurchasePress,
    [OverflowAction.SET_ARTIST_PICK]: handleSetAsArtistPick,
    [OverflowAction.UNSET_ARTIST_PICK]: handleUnsetAsArtistPick,
    [OverflowAction.VIEW_COMMENTS]: handleOpenCommentsDrawer,
    [OverflowAction.HOST_REMIX_CONTEST]: handleOpenRemixContestDrawer
  }

  return render(callbacks)
}

export default TrackOverflowMenuDrawer
