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

  const { data: isUnlisted } = useTrack(trackId, {
    select: (track) => {
      return track.is_unlisted
    }
  })

  return (
    <Flex row justifyContent='space-between' alignItems='center' p='s' h={32}>
      <Flex direction='row' gap='m'>
        {isTrending && rankIndex !== undefined ? (
          <LineupTileRankIcon index={rankIndex} />
        ) : null}
        <TrackAccessTypeLabel trackId={trackId} />
        {isUnlisted ? null : (
          <>
            <RepostsMetric trackId={trackId} />
            <SavesMetric trackId={trackId} />
            <CommentMetric trackId={trackId} uid={uid} actions={actions} />
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
