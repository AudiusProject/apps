import { useRef } from 'react'

import { useTrackByParams, useUser } from '@audius/common/api'
import { trackPageSelectors, reachabilitySelectors } from '@audius/common/store'
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
import { TrackScreenDetailsTile } from './TrackScreenDetailsTile'
import { TrackScreenLineup } from './TrackScreenLineup'
import { TrackScreenSkeleton } from './TrackScreenSkeleton'

const { getLineup } = trackPageSelectors
const { getIsReachable } = reachabilitySelectors

export const TrackScreen = () => {
  const { params } = useRoute<'Track'>()
  const isReachable = useSelector(getIsReachable)
  const scrollViewRef = useRef<FlatList>(null)

  const { searchTrack, ...restParams } = params ?? {}
  const { data: fetchedTrack } = useTrackByParams(restParams)
  const track = fetchedTrack ?? searchTrack

  const { data: user } = useUser(track?.owner_id)

  const lineup = useSelector(getLineup)

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
                <RemixContestCountdown trackId={track_id} />
                <TrackScreenDetailsTile
                  track={track}
                  user={user}
                  uid={lineup?.entries?.[0]?.uid}
                  isLineupLoading={!lineup?.entries?.[0]}
                  scrollViewRef={scrollViewRef}
                />
              </Flex>
            </ScreenPrimaryContent>

            {isReachable ? (
              <ScreenSecondaryContent>
                <Flex gap='2xl'>
                  {/* Remix Contest */}
                  <RemixContestSection trackId={track_id} />
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
