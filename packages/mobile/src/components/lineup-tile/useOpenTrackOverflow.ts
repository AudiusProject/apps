import { useCallback } from 'react'

import { useCurrentUserId, useTrack, useUser } from '@audius/common/api'
import { useGatedTrackAccess } from '@audius/common/hooks'
import type { ID } from '@audius/common/models'
import {
  mobileOverflowMenuUIActions,
  OverflowAction,
  OverflowSource,
  playbackPositionSelectors
} from '@audius/common/store'
import { Genre, removeNullable } from '@audius/common/utils'
import { useDispatch, useSelector } from 'react-redux'

const { open: openOverflowMenu } = mobileOverflowMenuUIActions
const { getTrackPosition } = playbackPositionSelectors

type Options = {
  /**
   * Adds share, favorite and repost. Rows have no inline buttons for these,
   * so they go in the menu.
   */
  includeSocial?: boolean
  hideViewArtist?: boolean
}

/** Opens the track overflow menu used by lineup tiles and rows. */
export const useOpenTrackOverflow = (id: ID, options: Options = {}) => {
  const { includeSocial = false, hideViewArtist = false } = options
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()
  const { hasStreamAccess } = useGatedTrackAccess(id)

  const { data: track } = useTrack(id, {
    select: (track) => ({
      track_id: track.track_id,
      owner_id: track.owner_id,
      genre: track.genre,
      is_unlisted: track.is_unlisted,
      is_scheduled_release: track.is_scheduled_release,
      ddex_app: track.ddex_app,
      album_backlink: track.album_backlink,
      has_current_user_saved: track.has_current_user_saved,
      has_current_user_reposted: track.has_current_user_reposted
    })
  })
  const { data: artistPickTrackId } = useUser(track?.owner_id, {
    select: (user) => user.artist_pick_track_id
  })
  const playbackStatus = useSelector(
    (state) =>
      getTrackPosition(state, { trackId: id, userId: currentUserId })?.status
  )

  return useCallback(() => {
    if (!track) return
    const isLongFormContent =
      track.genre === Genre.Podcasts || track.genre === Genre.Audiobooks
    const isOwner = currentUserId === track.owner_id
    const isArtistPick = isOwner && artistPickTrackId === track.track_id
    const canShare = !track.is_unlisted || isOwner
    const canEngage =
      includeSocial && !isOwner && !track.is_unlisted && hasStreamAccess

    const overflowActions = [
      !track.is_unlisted || isOwner ? OverflowAction.PLAY_NEXT : null,
      !track.is_unlisted || isOwner ? OverflowAction.ADD_TO_QUEUE : null,
      includeSocial && canShare ? OverflowAction.SHARE : null,
      canEngage
        ? track.has_current_user_saved
          ? OverflowAction.UNFAVORITE
          : OverflowAction.FAVORITE
        : null,
      canEngage
        ? track.has_current_user_reposted
          ? OverflowAction.UNREPOST
          : OverflowAction.REPOST
        : null,
      isOwner && !track.ddex_app ? OverflowAction.ADD_TO_ALBUM : null,
      !track.is_unlisted || isOwner ? OverflowAction.ADD_TO_PLAYLIST : null,
      isLongFormContent
        ? OverflowAction.VIEW_EPISODE_PAGE
        : OverflowAction.VIEW_TRACK_PAGE,
      track.album_backlink ? OverflowAction.VIEW_ALBUM_PAGE : null,
      isLongFormContent
        ? playbackStatus === 'COMPLETED'
          ? OverflowAction.MARK_AS_UNPLAYED
          : OverflowAction.MARK_AS_PLAYED
        : null,
      isOwner && !isArtistPick ? OverflowAction.SET_ARTIST_PICK : null,
      isArtistPick ? OverflowAction.UNSET_ARTIST_PICK : null,
      hideViewArtist ? null : OverflowAction.VIEW_ARTIST_PAGE,
      isOwner && !track.ddex_app ? OverflowAction.EDIT_TRACK : null,
      isOwner && track.is_scheduled_release && track.is_unlisted
        ? OverflowAction.RELEASE_NOW
        : null,
      isOwner && !track.ddex_app ? OverflowAction.DELETE_TRACK : null
    ].filter(removeNullable)

    dispatch(
      openOverflowMenu({
        source: OverflowSource.TRACKS,
        id: track.track_id,
        overflowActions
      })
    )
  }, [
    track,
    currentUserId,
    artistPickTrackId,
    includeSocial,
    hasStreamAccess,
    hideViewArtist,
    playbackStatus,
    dispatch
  ])
}
