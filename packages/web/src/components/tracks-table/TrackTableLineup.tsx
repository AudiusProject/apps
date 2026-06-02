import { useCallback, useMemo } from 'react'

import { useTracks, useUsers } from '@audius/common/api'
import {
  Name,
  PlaybackSource,
  FavoriteSource,
  RepostSource,
  ID,
  Kind
} from '@audius/common/models'
import {
  playbackSelectors,
  playbackActions,
  tracksSocialActions
} from '@audius/common/store'
import type { PlaybackTrack } from '@audius/common/store'
import { makeStableUid } from '@audius/common/utils'
import { useDispatch, useSelector } from 'react-redux'

import { make } from 'common/store/analytics/actions'

import { TracksTable } from './TracksTable'
import type { TracksTableProps, TrackWithUID } from './types'

const { getBuffering, getPlaying } = playbackSelectors

type TrackTableLineupProps = Omit<
  TracksTableProps,
  | 'onClickFavorite'
  | 'onClickRepost'
  | 'playing'
  | 'activeIndex'
  | 'onClickRow'
  | 'data'
> & {
  playingSource?: PlaybackSource
  // Source tag for the playback queue (also used for stable UID generation).
  source: string
  // Ordered list of track IDs to display.
  trackIds: ID[]
  // Fetch state from the underlying tanquery hook.
  isPending?: boolean
  isFetching?: boolean
  isInitialLoading?: boolean
  hasNextPage?: boolean
  loadNextPage?: () => void
  pageSize?: number
}

export const TrackTableLineup = ({
  playingSource = PlaybackSource.TRACK_TILE,
  source,
  trackIds,
  isInitialLoading,
  hasNextPage,
  loadNextPage,
  pageSize,
  ...props
}: TrackTableLineupProps) => {
  const dispatch = useDispatch()

  const { data: tracks } = useTracks(trackIds)
  const { byId: usersMap } = useUsers(tracks?.map((entry) => entry.owner_id))

  const isPlaying = useSelector(getPlaying)
  const isBuffering = useSelector(getBuffering)
  const currentPlaybackTrackId = useSelector(
    playbackSelectors.getCurrentTrackId
  )

  // Build playback queue entries keyed to this lineup's source.
  const playbackQueue: PlaybackTrack[] = useMemo(
    () =>
      trackIds.map((id) => ({
        trackId: id,
        source
      })),
    [trackIds, source]
  )

  // Build rows: track metadata + user + stable UID.
  const entries = useMemo(() => {
    if (!tracks || tracks.length === 0) {
      return hasNextPage
        ? new Array(pageSize ?? 0).fill({ kind: Kind.EMPTY })
        : []
    }
    const byId = new Map(tracks.map((t) => [t.track_id, t]))
    const rows = trackIds
      .map((id) => {
        const track = byId.get(id)
        if (!track) return null
        return {
          ...track,
          kind: Kind.TRACKS,
          id,
          uid: makeStableUid(Kind.TRACKS, id, source),
          user: usersMap[track.owner_id]
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
    return hasNextPage
      ? rows.concat(new Array(pageSize ?? 0).fill({ kind: Kind.EMPTY }))
      : rows
  }, [tracks, trackIds, source, usersMap, hasNextPage, pageSize])

  const activeIndex = useMemo(() => {
    if (currentPlaybackTrackId === null) return -1
    return entries.findIndex(
      (entry) => (entry as any)?.track_id === currentPlaybackTrackId
    )
  }, [currentPlaybackTrackId, entries])

  const onClickFavorite = useCallback(
    (track: TrackWithUID) => {
      const trackId = track.track_id
      if (!track.has_current_user_saved) {
        dispatch(
          tracksSocialActions.saveTrack(trackId, FavoriteSource.TRACK_PAGE)
        )
      } else {
        dispatch(
          tracksSocialActions.unsaveTrack(trackId, FavoriteSource.TRACK_PAGE)
        )
      }
    },
    [dispatch]
  )

  const onClickRepost = useCallback(
    (track: TrackWithUID) => {
      const trackId = track.track_id
      if (!track.has_current_user_reposted) {
        dispatch(
          tracksSocialActions.repostTrack(trackId, RepostSource.TRACK_PAGE)
        )
      } else {
        dispatch(
          tracksSocialActions.undoRepostTrack(trackId, RepostSource.TRACK_PAGE)
        )
      }
    },
    [dispatch]
  )

  const onClickRow = useCallback(
    (track: TrackWithUID, index: number) => {
      if (index === activeIndex && isPlaying) {
        dispatch(playbackActions.togglePlay())
        dispatch(
          make(Name.PLAYBACK_PAUSE, {
            id: `${track.track_id}`,
            source: playingSource
          })
        )
        return
      }
      if (index === activeIndex && !isPlaying) {
        dispatch(playbackActions.play())
        dispatch(
          make(Name.PLAYBACK_PLAY, {
            id: `${track.track_id}`,
            source: playingSource
          })
        )
        return
      }
      const startIndex = playbackQueue.findIndex(
        (t) => t.trackId === track.track_id
      )
      if (startIndex < 0) return
      dispatch(
        playbackActions.playFrom({
          tracks: playbackQueue,
          startIndex,
          querySource: null
        })
      )
      dispatch(
        make(Name.PLAYBACK_PLAY, {
          id: `${track.track_id}`,
          source: playingSource
        })
      )
    },
    [dispatch, isPlaying, playingSource, activeIndex, playbackQueue]
  )

  return (
    <TracksTable
      {...props}
      data={entries as any}
      onClickFavorite={onClickFavorite}
      onClickRepost={onClickRepost}
      playing={isPlaying && !isBuffering}
      activeIndex={activeIndex}
      onClickRow={onClickRow}
      fetchMore={loadNextPage}
      loading={isInitialLoading}
      pageSize={pageSize}
      fetchBatchSize={pageSize}
      fetchThreshold={pageSize ? pageSize / 2 : undefined}
    />
  )
}
