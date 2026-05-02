import { useRef } from 'react'

import { useTrackByParams, useUser } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { Kind } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { reachabilitySelectors } from '@audius/common/store'
import { makeStableUid } from '@audius/common/utils'
import type { FlatList } from 'react-native'
import { useSelector } from 'react-redux'

import { Flex } from '@audius/harmony-native'
import { CommentPreview } from 'app/components/comments/CommentPreview'
import {
  Screen,
  ScreenContent,
  VirtualizedScrollView
} from 'app/components/core'
import { ScreenPrimaryContent } from 'app/components/core/Screen/ScreenPrimaryContent'
import { ScreenSecondaryContent } from 'app/components/core/Screen/ScreenSecondaryContent'
import { useRoute } from 'app/hooks/useRoute'

import { RemixContestCountdown } from './RemixContestCountdown'
import { RemixContestSection } from './RemixContestSection'
import { TrackContestsSection } from './TrackContestsSection'
import { TrackScreenDetailsTile } from './TrackScreenDetailsTile'
import { TrackScreenLineup } from './TrackScreenLineup'
import { TrackScreenSkeleton } from './TrackScreenSkeleton'

const { getIsReachable } = reachabilitySelectors

export const TrackScreen = () => {
  const { params } = useRoute<'Track'>()
  const isReachable = useSelector(getIsReachable)
  const scrollViewRef = useRef<FlatList>(null)
  const { isEnabled: isContestsEnabled } = useFeatureFlag(FeatureFlags.CONTESTS)

  const { searchTrack, ...restParams } = params ?? {}
  const { data: fetchedTrack } = useTrackByParams(restParams)
  const track = fetchedTrack ?? searchTrack

  const { data: user } = useUser(track?.owner_id)

  if (!track || !user) {
    return (
      <Flex p='l' gap='2xl'>
        <TrackScreenSkeleton />
      </Flex>
    )
  }

  const { track_id, permalink, comments_disabled } = track

  return (
    <Screen url={permalink}>
      <ScreenContent isOfflineCapable>
        <VirtualizedScrollView ref={scrollViewRef}>
          <Flex p='l' gap='2xl'>
            {/* Track Details */}
            <ScreenPrimaryContent skeleton={<TrackScreenSkeleton />}>
              <Flex gap='l'>
                {/* Legacy in-line countdown chip — when CONTESTS is on
                    the contest experience moved to its own screen with
                    its own countdown, so this top-of-page chip would
                    be a redundant artifact (Figma 2888-16639 shows a
                    clean header). */}
                {!isContestsEnabled ? (
                  <RemixContestCountdown trackId={track_id} />
                ) : null}
                <TrackScreenDetailsTile
                  track={track}
                  user={user}
                  uid={makeStableUid(Kind.TRACKS, track_id, 'TRACK_TRACKS')}
                  isLineupLoading={false}
                  scrollViewRef={scrollViewRef}
                />
              </Flex>
            </ScreenPrimaryContent>

            {isReachable ? (
              <ScreenSecondaryContent>
                <Flex gap='2xl'>
                  {/* Contests — when CONTESTS is on, render a "Contests"
                      tile rail that links to the dedicated contest
                      screen (Figma 2888-16639). Otherwise fall back to
                      the legacy in-line tabbed RemixContestSection. */}
                  {isContestsEnabled ? (
                    <TrackContestsSection trackId={track_id} />
                  ) : (
                    <RemixContestSection trackId={track_id} />
                  )}
                  {/* Comments */}
                  {!comments_disabled ? (
                    <Flex flex={3}>
                      <CommentPreview entityId={track_id} />
                    </Flex>
                  ) : null}
                  <TrackScreenLineup trackId={track_id} user={user} />
                </Flex>
              </ScreenSecondaryContent>
            ) : null}
          </Flex>
        </VirtualizedScrollView>
      </ScreenContent>
    </Screen>
  )
}
