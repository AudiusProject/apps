import { useCallback, useEffect } from 'react'

import {
  getTrackByPermalinkQueryKey,
  useTrackByPermalink
} from '@audius/common/api'
import {
  TrackPlayback,
  useGatedContentAccess,
  useToggleTrack
} from '@audius/common/hooks'
import { PlaybackSource, ID, ModalSource } from '@audius/common/models'
import { QueueSource, ChatMessageTileProps } from '@audius/common/store'
import { getPathFromTrackUrl } from '@audius/common/utils'
import { useQuery } from '@tanstack/react-query'
import { pick } from 'lodash'
import { useDispatch } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { TrackTile } from 'components/track/mobile/TrackTile'
import { TrackTileSize } from 'components/track/types'

import { ChatUnfurlSkeleton } from './ChatUnfurlSkeleton'

export const ChatMessageTrack = ({
  link,
  onEmpty,
  onSuccess,
  className
}: ChatMessageTileProps) => {
  const dispatch = useDispatch()
  const permalink = getPathFromTrackUrl(link)

  const { data: partialTrack } = useTrackByPermalink(permalink, {
    select: (track) =>
      pick(track, [
        'track_id',
        'is_delete',
        'is_stream_gated',
        'preview_cid',
        'access',
        'stream_conditions',
        'is_download_gated',
        'download_conditions'
      ])
  })
  const trackExists = !!partialTrack

  const { data: trackIdFromPermalink, isPending: isPermalinkPending } =
    useQuery<number | null | undefined>({
      queryKey: getTrackByPermalinkQueryKey(permalink),
      enabled: false
    })
  const hasTrackId = !isPermalinkPending && trackIdFromPermalink != null
  const isPending = isPermalinkPending || (hasTrackId && !partialTrack)

  const { hasStreamAccess } = useGatedContentAccess(partialTrack)
  const { track_id, is_delete, is_stream_gated, preview_cid } =
    partialTrack ?? {}
  const isPreview = !!is_stream_gated && !!preview_cid && !hasStreamAccess

  const recordAnalytics = useCallback(
    ({ name, id }: { name: TrackPlayback; id: ID }) => {
      if (!trackExists) return
      dispatch(
        make(name, {
          id: `${id}`,
          source: PlaybackSource.CHAT_TRACK
        })
      )
    },
    [dispatch, trackExists]
  )

  const { togglePlay, isTrackPlaying } = useToggleTrack({
    id: track_id ?? null,
    isPreview,
    source: QueueSource.CHAT_TRACKS,
    recordAnalytics
  })

  const hasResolvedTrack = !isPending && trackExists && !is_delete

  useEffect(() => {
    if (isPending) return
    if (hasResolvedTrack) {
      onSuccess?.()
    } else {
      onEmpty?.()
    }
  }, [isPending, hasResolvedTrack, onSuccess, onEmpty])

  if (isPending) {
    return <ChatUnfurlSkeleton className={className} />
  }

  if (hasResolvedTrack && track_id) {
    return (
      <TrackTile
        containerClassName={className}
        index={0}
        id={track_id}
        size={TrackTileSize.SMALL}
        ordered={false}
        trackTileStyles={{}}
        togglePlay={togglePlay}
        hasLoaded={() => {}}
        isLoading={false}
        isTrending={false}
        isActive={isTrackPlaying}
        variant='readonly'
        source={ModalSource.DirectMessageTrackTile}
      />
    )
  }

  return null
}
