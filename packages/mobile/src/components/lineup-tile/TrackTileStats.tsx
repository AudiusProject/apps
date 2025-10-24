import { useTrack } from '@audius/common/api'
import { useIsTrackUnlockable } from '@audius/common/hooks'
import type { ID } from '@audius/common/models'
import { type LineupBaseActions } from '@audius/common/store'

import { Flex } from '@audius/harmony-native'

import { TrackDownloadStatusIndicator } from '../offline-downloads'
import { TrackAccessTypeLabel } from '../track/TrackAccessTypeLabel'
import { TrackLockedStatusBadge } from '../track/TrackLockedStatusBadge'

import { LineupTileRankIcon } from './LineupTileRankIcon'
import {
  CommentMetric,
  PlayMetric,
  RepostsMetric,
  SavesMetric
} from './TrackTileMetrics'

type TrackTileStatsProps = {
  trackId: ID
  isTrending?: boolean
  rankIndex?: number
  uid?: string
  actions?: LineupBaseActions
}

export const TrackTileStats = (props: TrackTileStatsProps) => {
  const { trackId, isTrending, rankIndex, uid, actions } = props

  const isUnlockable = useIsTrackUnlockable(trackId)

  const { data: partialTrack } = useTrack(trackId, {
    select: (track) => {
      return {
        isUnlisted: track.is_unlisted,
        noMetrics:
          !track.repost_count && !track.save_count && !track.comment_count
      }
    }
  })
  const { isUnlisted, noMetrics } = partialTrack ?? {}

  return (
    <Flex row justifyContent='space-between' alignItems='center' p='s' h={32}>
      <Flex direction='row' gap='m' alignItems='center'>
        {isTrending && rankIndex !== undefined ? (
          <LineupTileRankIcon index={rankIndex} />
        ) : null}
        <TrackAccessTypeLabel trackId={trackId} />
        {isUnlisted ? null : (
          <>
            <RepostsMetric trackId={trackId} />
            <SavesMetric trackId={trackId} />
            <CommentMetric
              trackId={trackId}
              uid={uid}
              actions={actions}
              showLeaveCommentText={noMetrics}
            />
            <TrackDownloadStatusIndicator size='s' trackId={trackId} />
          </>
        )}
      </Flex>
      {isUnlockable ? (
        <TrackLockedStatusBadge trackId={trackId} />
      ) : isUnlisted ? null : (
        <PlayMetric trackId={trackId} />
      )}
    </Flex>
  )
}
