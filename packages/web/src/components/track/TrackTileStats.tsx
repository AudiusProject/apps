import { useTrack } from '@audius/common/api'
import { useIsTrackUnlockable } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import { Flex, Skeleton } from '@audius/harmony'

import { EntityRank } from 'components/lineup/EntityRank'
import { useIsMobile } from 'hooks/useIsMobile'

import { TrackAccessTypeLabel } from './TrackAccessTypeLabel'
import { TrackLockedStatusBadge } from './TrackLockedStatusBadge'
import {
  CommentMetric,
  PlayMetric,
  RepostsMetric,
  SavesMetric
} from './TrackTileMetrics'
import { TrackTileSize } from './types'

type TrackTileStatsProps = {
  trackId: ID
  rankIndex?: number
  size: TrackTileSize
  isLoading?: boolean
  noShimmer?: boolean
}

export const TrackTileStats = (props: TrackTileStatsProps) => {
  const { trackId, rankIndex, size, isLoading, noShimmer } = props

  const isUnlockable = useIsTrackUnlockable(trackId)
  const isMobile = useIsMobile()

  const { data: isUnlisted } = useTrack(trackId, {
    select: (track) => {
      return track.is_unlisted
    }
  })

  if (isLoading) {
    return (
      <Flex h='2xl' alignItems='center'>
        <Skeleton w='40%' h={isMobile ? 16 : 20} noShimmer={noShimmer} />
      </Flex>
    )
  }

  return (
    <Flex
      justifyContent='space-between'
      alignItems='center'
      pv={isMobile ? 's' : 'xs'}
    >
      <Flex gap='l' h={size === TrackTileSize.LARGE ? 'xl' : 'm'}>
        {rankIndex != null ? <EntityRank index={rankIndex} /> : null}
        <TrackAccessTypeLabel trackId={trackId} />
        {isUnlisted ? null : (
          <>
            <RepostsMetric trackId={trackId} size={size} />
            <SavesMetric trackId={trackId} />
            <CommentMetric trackId={trackId} size={size} />
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
