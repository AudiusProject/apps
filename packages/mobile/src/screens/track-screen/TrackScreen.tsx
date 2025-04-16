import { useEffect, useRef } from 'react'

import { useTrackByParams, useUser } from '@audius/common/api'
import { useProxySelector } from '@audius/common/hooks'
import { trackPageMessages } from '@audius/common/messages'
import { Status } from '@audius/common/models'
import {
  trackPageLineupActions,
  trackPageSelectors,
  reachabilitySelectors
} from '@audius/common/store'
import type { FlatList } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { IconArrowRight, Button, Text, Flex } from '@audius/harmony-native'
import { CommentPreview } from 'app/components/comments/CommentPreview'
import {
  Screen,
  ScreenContent,
  VirtualizedScrollView
} from 'app/components/core'
import { ScreenPrimaryContent } from 'app/components/core/Screen/ScreenPrimaryContent'
import { ScreenSecondaryContent } from 'app/components/core/Screen/ScreenSecondaryContent'
import { useIsScreenReady } from 'app/components/core/Screen/hooks/useIsScreenReady'
import { Lineup } from 'app/components/lineup'
import { useNavigation } from 'app/hooks/useNavigation'
import { useRoute } from 'app/hooks/useRoute'

import { TrackScreenDetailsTile } from './TrackScreenDetailsTile'
import { TrackScreenRemixes } from './TrackScreenRemixes'
import { TrackScreenSkeleton } from './TrackScreenSkeleton'
const { tracksActions } = trackPageLineupActions
const { getLineup, getRemixParentTrack } = trackPageSelectors
const { getIsReachable } = reachabilitySelectors

const messages = {
  moreBy: 'More by',
  originalTrack: 'Original Track',
  ...trackPageMessages
}

const MAX_RELATED_TRACKS_TO_DISPLAY = 6

export const TrackScreen = () => {
  const navigation = useNavigation()
  const { params } = useRoute<'Track'>()
  const dispatch = useDispatch()
  const isReachable = useSelector(getIsReachable)
  const scrollViewRef = useRef<FlatList>(null)

  const { searchTrack, ...restParams } = params ?? {}
  const { data: fetchedTrack } = useTrackByParams(restParams)
  const track = fetchedTrack ?? searchTrack

  const { data: user } = useUser(track?.owner_id)

  const lineup = useSelector(getLineup)
  const remixParentTrack = useProxySelector(getRemixParentTrack, [])

  const isScreenReady = useIsScreenReady()

  useEffect(() => {
    if (isScreenReady) {
      dispatch(tracksActions.reset())
    }
  }, [dispatch, isScreenReady])

  if (!track || !user) {
    return (
      <Flex p='l' gap='2xl'>
        <TrackScreenSkeleton />
      </Flex>
    )
  }

  const handlePressGoToOtherRemixes = () => {
    if (!remixParentTrack) {
      return
    }
    navigation.push('TrackRemixes', { id: remixParentTrack.track_id })
  }

  const {
    track_id,
    permalink,
    field_visibility,
    remix_of,
    _remixes,
    comments_disabled
  } = track

  const remixParentTrackId = remix_of?.tracks?.[0]?.parent_track_id

  const showMoreByArtistTitle = isReachable && (user.track_count ?? 0) > 1

  const hasValidRemixParent =
    !!remixParentTrackId &&
    !!remixParentTrack &&
    remixParentTrack.is_delete === false &&
    !remixParentTrack.user?.is_deactivated

  const hasRemixes =
    field_visibility?.remixes && _remixes && _remixes.length > 0

  const moreByArtistTitle = showMoreByArtistTitle ? (
    <Text variant='title' size='l'>
      {`${messages.moreBy} ${user?.name}`}
    </Text>
  ) : null

  const originalTrackTitle = (
    <Text variant='title' size='l'>
      {messages.originalTrack}
    </Text>
  )

  return (
    <Screen url={permalink}>
      <ScreenContent isOfflineCapable>
        <VirtualizedScrollView ref={scrollViewRef}>
          <Flex p='l' gap='2xl'>
            {/* Track Details */}
            <ScreenPrimaryContent skeleton={<TrackScreenSkeleton />}>
              <TrackScreenDetailsTile
                track={track}
                user={user}
                uid={lineup?.entries?.[0]?.uid}
                isLineupLoading={!lineup?.entries?.[0]}
                scrollViewRef={scrollViewRef}
              />
            </ScreenPrimaryContent>

            {isReachable ? (
              <ScreenSecondaryContent>
                <Flex gap='2xl'>
                  {/* Comments */}
                  {!comments_disabled ? (
                    <Flex flex={3}>
                      <CommentPreview entityId={track_id} />
                    </Flex>
                  ) : null}

                  {/* Remixes */}
                  {hasRemixes ? <TrackScreenRemixes track={track} /> : null}

                  {/* More by Artist / Remix Parent */}
                  <Flex>
                    {hasValidRemixParent
                      ? originalTrackTitle
                      : moreByArtistTitle}
                    <Lineup
                      actions={tracksActions}
                      keyboardShouldPersistTaps='handled'
                      count={MAX_RELATED_TRACKS_TO_DISPLAY}
                      lineup={lineup}
                      start={1}
                      includeLineupStatus
                      itemStyles={{
                        padding: 0,
                        paddingVertical: 16
                      }}
                      leadingElementId={remixParentTrack?.track_id}
                      leadingElementDelineator={
                        <Flex>
                          {lineup.status === Status.SUCCESS ? (
                            <Flex pt='m' alignItems='flex-start'>
                              <Button
                                iconRight={IconArrowRight}
                                size='xs'
                                onPress={handlePressGoToOtherRemixes}
                              >
                                {messages.viewOtherRemixes}
                              </Button>
                            </Flex>
                          ) : null}
                          <Flex mt='2xl'>{moreByArtistTitle}</Flex>
                        </Flex>
                      }
                    />
                  </Flex>
                </Flex>
              </ScreenSecondaryContent>
            ) : null}
          </Flex>
        </VirtualizedScrollView>
      </ScreenContent>
    </Screen>
  )
}
