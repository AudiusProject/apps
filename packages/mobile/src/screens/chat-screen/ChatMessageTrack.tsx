import { useCallback, useEffect, useMemo } from 'react'

import { useTrackByPermalink, useUser } from '@audius/common/api'
import { useGatedContentAccess, useToggleTrack } from '@audius/common/hooks'
import type { TrackPlayback } from '@audius/common/hooks'
import { Name, PlaybackSource, Kind } from '@audius/common/models'
import type { ID } from '@audius/common/models'
import { QueueSource } from '@audius/common/store'
import type { ChatMessageTileProps } from '@audius/common/store'
import { getPathFromTrackUrl, makeUid } from '@audius/common/utils'
import { pick } from 'lodash'

import { TrackTile } from 'app/components/lineup-tile'
import { LineupTileSource } from 'app/components/lineup-tile/types'
import { make, track as trackEvent } from 'app/services/analytics'

export const ChatMessageTrack = ({
  link,
  onEmpty,
  onSuccess,
  styles
}: ChatMessageTileProps) => {
  const permalink = getPathFromTrackUrl(link)
  const { data: partialTrack } = useTrackByPermalink(permalink, {
    select: (track) =>
      pick(track, [
        'track_id',
        'owner_id',
        'preview_cid',
        'access',
        'is_download_gated',
        'is_stream_gated',
        'download_conditions',
        'stream_conditions'
      ])
  })
  const trackExists = !!partialTrack
  const { hasStreamAccess } = useGatedContentAccess(partialTrack)
  const { track_id, is_stream_gated, preview_cid, owner_id } =
    partialTrack ?? {}
  const { data: user } = useUser(owner_id)
  const isPreview = !!is_stream_gated && !!preview_cid && !hasStreamAccess

  const uid = useMemo(() => {
    return track_id ? makeUid(Kind.TRACKS, track_id) : null
  }, [track_id])

  const recordAnalytics = useCallback(
    ({ name, id }: { name: TrackPlayback; id: ID }) => {
      if (!trackExists) return
      trackEvent(
        make({
          eventName: name,
          id: `${id}`,
          source: PlaybackSource.CHAT_TRACK
        })
      )
    },
    [trackExists]
  )

  const { togglePlay } = useToggleTrack({
    id: track_id ?? null,
    isPreview,
    source: QueueSource.CHAT_TRACKS,
    recordAnalytics
  })

  useEffect(() => {
    if (trackExists && user && uid) {
      trackEvent(
        make({
          eventName: Name.MESSAGE_UNFURL_TRACK
        })
      )
      onSuccess?.()
    } else {
      onEmpty?.()
    }
  }, [trackExists, user, uid, onSuccess, onEmpty])

  return track_id && user && uid ? (
    <TrackTile
      id={track_id}
      index={0}
      togglePlay={togglePlay}
      uid={uid}
      isTrending={false}
      style={styles}
      variant='readonly'
      source={LineupTileSource.DM_TRACK}
    />
  ) : null
}
