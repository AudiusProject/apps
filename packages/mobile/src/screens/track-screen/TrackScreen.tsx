import { useRef } from 'react'

import {
  useCurrentUserId,
  useTrackByParams,
  usePrefetchTrackComments,
  usePrefetchTrackPageLineup,
  useUser
} from '@audius/common/api'
import { Kind } from '@audius/common/models'
import { reachabilitySelectors } from '@audius/common/store'
import { isTrackUnavailable, makeStableUid } from '@audius/common/utils'
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
import { TrackUnavailable } from 'app/components/track-unavailable/TrackUnavailable'
import { useRoute } from 'app/hooks/useRoute'

import { TrackContestsSection } from './TrackContestsSection'
import { TrackScreenDetailsTile } from './TrackScreenDetailsTile'
import { TrackScreenLineup } from './TrackScreenLineup'
import { TrackScreenSkeleton } from './TrackScreenSkeleton'

const { getIsReachable } = reachabilitySelectors

export const TrackScreen = () => {
  const { params } = useRoute<'Track'>()
  const isReachable = useSelector(getIsReachable)
  const scrollViewRef = useRef<FlatList>(null)

  const { searchTrack, ...restParams } = params ?? {}
  const { data: fetchedTrack } = useTrackByParams(restParams)
  const track = fetchedTrack ?? searchTrack

  const paramTrackId = 'trackId' in restParams ? restParams.trackId : undefined
  const trackId = paramTrackId ?? track?.track_id
  usePrefetchTrackComments(track?.comments_disabled ? null : trackId)

  usePrefetchTrackPageLineup(trackId)

  const { data: user } = useUser(track?.owner_id)
  const { data: currentUserId } = useCurrentUserId()

  if (!track || !user) {
    return (
      <Flex p='l' gap='2xl'>
        <TrackScreenSkeleton />
      </Flex>
    )
  }

  const { track_id, permalink, comments_disabled } = track

  if (isTrackUnavailable(track, currentUserId)) {
    return (
      <Screen url={permalink}>
        <ScreenContent>
          <TrackUnavailable />
        </ScreenContent>
      </Screen>
    )
  }

  return (
    <Screen url={permalink}>
      <ScreenContent isOfflineCapable>
        <VirtualizedScrollView ref={scrollViewRef}>
          <Flex p='l' gap='2xl'>
            {/* Track Details */}
            <ScreenPrimaryContent skeleton={<TrackScreenSkeleton />}>
              <Flex gap='l'>
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
                  {/* "Contests" tile rail links to the dedicated contest
                      screen (Figma 2888-16639). */}
                  <TrackContestsSection trackId={track_id} />
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
