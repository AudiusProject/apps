import { useContext } from 'react'

import {
  useCurrentUserId,
  useRejectTrackCollaboration,
  useRemixContest,
  useToggleFavoriteTrack,
  useTrack
} from '@audius/common/api'
import {
  ShareSource,
  RepostSource,
  FavoriteSource,
  PlayableType,
  ID,
  Name
} from '@audius/common/models'
import {
  cacheCollectionsActions,
  tracksSocialActions,
  addToCollectionUIActions,
  playbackActions,
  playbackPositionActions,
  playbackPositionSelectors,
  CommonState,
  artistPickModalActions,
  useDeleteTrackConfirmationModal,
  shareModalUIActions,
  useHostRemixContestModal,
  QueueSource
} from '@audius/common/store'
import { Genre, Nullable, route } from '@audius/common/utils'
import { PopupMenuItem } from '@audius/harmony'
import { pick } from 'lodash'
import { connect, useDispatch, useSelector } from 'react-redux'
import { Dispatch } from 'redux'

import { make } from 'common/store/analytics/actions'
import * as embedModalActions from 'components/embed-modal/store/actions'
import { ToastContext } from 'components/toast/ToastContext'
import { push } from 'utils/navigation'
import { albumPage, hostRemixContestPage } from 'utils/route'

const { requestOpen: requestOpenShareModal } = shareModalUIActions

const { profilePage } = route
const { requestOpen: openAddToCollection } = addToCollectionUIActions
const { saveTrack, unsaveTrack, repostTrack, undoRepostTrack } =
  tracksSocialActions
const { addTrackToPlaylist } = cacheCollectionsActions
const { clearTrackPosition, setTrackPosition } = playbackPositionActions
const { getUserTrackPositions } = playbackPositionSelectors

const messages = {
  addToAlbum: 'Add To Album',
  addToPlaylist: 'Add To Playlist',
  copiedToClipboard: 'Copied To Clipboard!',
  deleteTrack: 'Delete Track',
  editTrack: 'Edit Track',
  embed: 'Embed',
  favorite: 'Favorite',
  repost: 'Repost',
  reposted: 'Reposted!',
  setArtistPick: 'Set as Artist Pick',
  share: 'Share',
  undoRepost: 'Undo Repost',
  unfavorite: 'Unfavorite',
  unreposted: 'Un-Reposted!',
  unsetArtistPick: 'Unset as Artist Pick',
  visitArtistPage: 'Visit Profile',
  visitAlbumPage: 'Visit Album Page',
  visitTrackPage: 'Visit Track Page',
  visitEpisodePage: 'Visit Episode Page',
  markAsPlayed: 'Mark as Played',
  markedAsPlayed: 'Marked as Played',
  markAsUnplayed: 'Mark as Unplayed',
  markedAsUnplayed: 'Marked as Unplayed',
  hostRemixContest: 'Host Remix Contest',
  editRemixContest: 'Edit Remix Contest',
  playNext: 'Play Next',
  addToQueue: 'Add to Queue',
  willPlayNext: 'Will play next',
  addedToQueue: 'Added to queue',
  removeCollaboration: 'Remove Me as Collaborator',
  removedCollaboration: 'Removed as collaborator'
}

export type OwnProps = {
  children: (items: PopupMenuItem[]) => JSX.Element
  extraMenuItems?: PopupMenuItem[]
  handle: string
  includeAddToAlbum?: boolean
  includeAddToPlaylist?: boolean
  includeArtistPick?: boolean
  includeDelete?: boolean
  includeEdit?: boolean
  ddexApp?: string | null
  includeEmbed?: boolean
  includeFavorite?: boolean
  includeRepost?: boolean
  includeShare?: boolean
  includeRemixContest?: boolean
  includeAlbumPage?: boolean
  includeTrackPage?: boolean
  includePlayNext?: boolean
  includeAddToQueue?: boolean
  isArtistPick?: boolean
  isDeleted?: boolean
  isFavorited?: boolean
  isOwner?: boolean
  isOwnerDeactivated?: boolean
  isReposted?: boolean
  isUnlisted?: boolean
  trackId: ID
  trackTitle: string
  genre?: Genre
  trackPermalink: string
  type: 'track'
}

type TrackMenuProps = OwnProps & ReturnType<typeof mapDispatchToProps>

const TrackMenu = ({
  includeDelete = true,
  includeAddToAlbum = true,
  includeAddToPlaylist = true,
  includeArtistPick = true,
  includeEdit = true,
  includeEmbed = true,
  includeFavorite = true,
  includeAlbumPage = true,
  includeTrackPage = true,
  includeRemixContest = false,
  includePlayNext = true,
  includeAddToQueue = true,
  isArtistPick,
  isDeleted,
  isOwner,
  isOwnerDeactivated,
  isUnlisted,
  extraMenuItems = [],
  ddexApp = null,
  isFavorited,
  ...props
}: TrackMenuProps) => {
  const { trackPermalink, goToRoute } = props
  const { toast } = useContext(ToastContext)
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()
  const { mutate: rejectTrackCollaboration } = useRejectTrackCollaboration()
  const { onOpen: openDeleteTrackConfirmation } =
    useDeleteTrackConfirmationModal()
  const { onOpen: openHostRemixContest } = useHostRemixContestModal()
  const { data: partialTrack } = useTrack(props.trackId, {
    select: (track) =>
      pick(track, [
        'album_backlink',
        'permalink',
        'remix_of',
        'collaborators',
        'owner_id'
      ])
  })

  // Whether the current user is an accepted collaborator (not the owner), and
  // can therefore remove themselves from the track.
  const isCollaborator =
    !!currentUserId &&
    (partialTrack?.collaborators ?? []).some(
      (collaborator) => collaborator.user_id === currentUserId
    )

  const toggleSaveTrack = useToggleFavoriteTrack({
    trackId: props.trackId,
    source: FavoriteSource.OVERFLOW
  })

  const { data: remixContest } = useRemixContest(props.trackId, {
    enabled: includeRemixContest
  })

  const onDeleteTrack = (trackId: Nullable<number>) => {
    if (!trackId) return

    openDeleteTrackConfirmation({
      trackId
    })
  }

  const onEditTrack = (trackId: Nullable<number>) => {
    if (!trackId) return
    const permalink = trackPermalink || partialTrack?.permalink
    permalink && goToRoute(`${permalink}/edit`)
  }

  const trackPlaybackPositions = useSelector((state: CommonState) =>
    getUserTrackPositions(state, { userId: currentUserId })
  )

  const getMenu = () => {
    const {
      goToRoute,
      handle,
      includeRepost,
      includeShare,
      openAddToCollectionModal,
      openEmbedModal,
      repostTrack,
      shareTrack,
      trackId,
      trackTitle,
      trackPermalink,
      genre,
      undoRepostTrack,
      unsetArtistPick
    } = props

    const albumInfo = partialTrack?.album_backlink
    const isLongFormContent =
      genre === Genre.Podcasts || genre === Genre.Audiobooks

    const shareMenuItem = {
      text: messages.share,
      onClick: () => shareTrack(trackId)
    }

    const repostMenuItem = {
      text: props.isReposted ? messages.undoRepost : messages.repost,
      // Set timeout so the menu has time to close before we propagate the change.
      onClick: () =>
        setTimeout(() => {
          props.isReposted ? undoRepostTrack(trackId) : repostTrack(trackId)
          toast(props.isReposted ? messages.unreposted : messages.reposted)
        }, 0)
    }

    const favoriteMenuItem = {
      text: isFavorited ? messages.unfavorite : messages.favorite,
      // Set timeout so the menu has time to close before we propagate the change.
      onClick: () =>
        setTimeout(() => {
          toggleSaveTrack()
        }, 0)
    }

    const addToPlaylistMenuItem = {
      text: messages.addToPlaylist,
      onClick: () => {
        openAddToCollectionModal(
          'playlist',
          trackId,
          trackTitle,
          isUnlisted ?? false
        )
      }
    }

    const addToAlbumMenuItem = {
      text: messages.addToAlbum,
      onClick: () => {
        openAddToCollectionModal(
          'album',
          trackId,
          trackTitle,
          isUnlisted ?? false
        )
      }
    }

    const trackPageMenuItem = {
      text: isLongFormContent
        ? messages.visitEpisodePage
        : messages.visitTrackPage,
      onClick: () => {
        goToRoute(trackPermalink)
      }
    }

    const markAsUnplayedItem = {
      text: messages.markAsUnplayed,
      onClick: () => {
        dispatch(clearTrackPosition({ userId: currentUserId, trackId }))
        toast(messages.markedAsUnplayed)
      }
    }

    const markAsPlayedItem = {
      text: messages.markAsPlayed,
      onClick: () => {
        dispatch(
          setTrackPosition({
            userId: currentUserId,
            trackId,
            positionInfo: { status: 'COMPLETED', playbackPosition: 0 }
          })
        )
        toast(messages.markedAsPlayed)
      }
    }

    const albumPageMenuItem = {
      text: messages.visitAlbumPage,
      onClick: () =>
        albumInfo &&
        goToRoute(
          albumPage(handle, albumInfo.playlist_name, albumInfo.playlist_id)
        )
    }

    const artistPageMenuItem = {
      text: messages.visitArtistPage,
      onClick: () => goToRoute(profilePage(handle))
    }

    const artistPickMenuItem = {
      text: isArtistPick ? messages.unsetArtistPick : messages.setArtistPick,
      onClick: isArtistPick
        ? () => unsetArtistPick()
        : () => props.setArtistPick(trackId)
    }

    const deleteTrackMenuItem = {
      text: messages.deleteTrack,
      onClick: () => onDeleteTrack(trackId),
      destructive: true
    }

    const editTrackMenuItem = {
      text: messages.editTrack,
      onClick: () => onEditTrack(trackId)
    }

    const embedMenuItem = {
      text: messages.embed,
      onClick: () => openEmbedModal(trackId)
    }

    const remixContestMenuItem = {
      text: remixContest
        ? messages.editRemixContest
        : messages.hostRemixContest,
      onClick: () => {
        const permalink = trackPermalink || partialTrack?.permalink
        if (permalink) {
          goToRoute(hostRemixContestPage(permalink))
        } else {
          // Fallback for call sites that don't pass a permalink — keep the
          // modal as a safety net until every entry point is migrated.
          openHostRemixContest({ trackId })
        }
      }
    }

    const playNextMenuItem = {
      text: messages.playNext,
      onClick: () => {
        dispatch(
          playbackActions.playNext({
            track: { trackId, source: QueueSource.RECOMMENDED_TRACKS }
          })
        )
        dispatch(
          make(Name.PLAY_QUEUE_ADD_TRACK, {
            source: 'queue',
            trackId: String(trackId),
            from: 'overflow menu'
          })
        )
        toast(messages.willPlayNext)
      }
    }

    const addToQueueMenuItem = {
      text: messages.addToQueue,
      onClick: () => {
        dispatch(
          playbackActions.addToQueue({
            tracks: [{ trackId, source: QueueSource.RECOMMENDED_TRACKS }]
          })
        )
        dispatch(
          make(Name.PLAY_QUEUE_ADD_TRACK, {
            source: 'queue',
            trackId: String(trackId),
            from: 'overflow menu'
          })
        )
        toast(messages.addedToQueue)
      }
    }

    const leaveCollaborationMenuItem: PopupMenuItem = {
      text: messages.removeCollaboration,
      onClick: () => {
        if (trackId) {
          rejectTrackCollaboration({ trackId })
          toast(messages.removedCollaboration)
        }
      }
    }

    const menu: { items: PopupMenuItem[] } = { items: [] }

    if (
      includeRemixContest &&
      isOwner &&
      !isDeleted &&
      !partialTrack?.remix_of
    ) {
      menu.items.push(remixContestMenuItem)
    }

    if (includePlayNext && !isDeleted && (!isUnlisted || isOwner)) {
      menu.items.push(playNextMenuItem)
    }
    if (includeAddToQueue && !isDeleted && (!isUnlisted || isOwner)) {
      menu.items.push(addToQueueMenuItem)
    }
    if (includeShare && !isDeleted) {
      menu.items.push(shareMenuItem)
    }
    if (includeRepost && !isOwner && !isDeleted) {
      menu.items.push(repostMenuItem)
    }
    if (includeFavorite && !isOwner && (!isDeleted || isFavorited)) {
      menu.items.push(favoriteMenuItem)
    }
    if (isCollaborator && !isOwner && !isDeleted) {
      menu.items.push(leaveCollaborationMenuItem)
    }
    if (includeAddToAlbum && !isDeleted && isOwner) {
      menu.items.push(addToAlbumMenuItem)
    }
    if (includeAddToPlaylist && !isDeleted && (!isUnlisted || isOwner)) {
      menu.items.push(addToPlaylistMenuItem)
    }
    if (trackId && trackTitle && !isDeleted) {
      if (includeTrackPage) menu.items.push(trackPageMenuItem)
      if (isLongFormContent) {
        const playbackPosition = trackPlaybackPositions?.[trackId]
        menu.items.push(
          playbackPosition?.status === 'COMPLETED'
            ? markAsUnplayedItem
            : markAsPlayedItem
        )
      }
    }
    if (trackId && isOwner && includeArtistPick && !isDeleted) {
      menu.items.push(artistPickMenuItem)
    }
    if (albumInfo && includeAlbumPage) {
      menu.items.push(albumPageMenuItem)
    }
    if (handle && !isOwnerDeactivated) {
      menu.items.push(artistPageMenuItem)
    }
    if (includeEdit && isOwner && !isDeleted && !ddexApp) {
      menu.items.push(editTrackMenuItem)
    }
    if (extraMenuItems && extraMenuItems.length > 0) {
      menu.items = menu.items.concat(extraMenuItems)
    }
    if (includeEmbed && !isDeleted) {
      menu.items.push(embedMenuItem)
    }
    if (includeDelete && isOwner && !isDeleted && !ddexApp) {
      menu.items.push(deleteTrackMenuItem)
    }

    return menu
  }

  const menu = getMenu()

  return props.children(menu.items)
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    goToRoute: (route: string) => dispatch(push(route)),
    addTrackToPlaylist: (trackId: ID, playlistId: ID) =>
      dispatch(addTrackToPlaylist(trackId, playlistId)),
    shareTrack: (trackId: ID) =>
      dispatch(
        requestOpenShareModal({
          type: 'track',
          trackId,
          source: ShareSource.OVERFLOW
        })
      ),
    saveTrack: (trackId: ID) =>
      dispatch(saveTrack(trackId, FavoriteSource.OVERFLOW)),
    unsaveTrack: (trackId: ID) =>
      dispatch(unsaveTrack(trackId, FavoriteSource.OVERFLOW)),
    repostTrack: (trackId: ID) =>
      dispatch(repostTrack(trackId, RepostSource.OVERFLOW)),
    undoRepostTrack: (trackId: ID) =>
      dispatch(undoRepostTrack(trackId, RepostSource.OVERFLOW)),
    setArtistPick: (trackId: ID) =>
      dispatch(artistPickModalActions.open({ trackId })),
    unsetArtistPick: () =>
      dispatch(artistPickModalActions.open({ trackId: null })),
    openAddToCollectionModal: (
      collectionType: 'album' | 'playlist',
      trackId: ID,
      title: string,
      isUnlisted: boolean
    ) =>
      dispatch(openAddToCollection(collectionType, trackId, title, isUnlisted)),
    openEmbedModal: (trackId: ID) =>
      dispatch(embedModalActions.open(trackId, PlayableType.TRACK))
  }
}

export default connect(null, mapDispatchToProps)(TrackMenu)
