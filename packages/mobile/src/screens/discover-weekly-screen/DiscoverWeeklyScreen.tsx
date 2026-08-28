import React, { useCallback, useEffect, useMemo, useRef } from 'react'

import { useDiscoverWeekly } from '@audius/common/api'
import { useAnalytics } from '@audius/common/hooks'
import { exploreMessages } from '@audius/common/messages'
import type { ID } from '@audius/common/models'
import { Name } from '@audius/common/models'
import { playbackActions, playbackSelectors } from '@audius/common/store'
import type { PlaybackTrack } from '@audius/common/store'
import { Image } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  Button,
  Flex,
  IconPause,
  IconPlay,
  Paper,
  Text
} from '@audius/harmony-native'
import discoverWeeklyArt from 'app/assets/images/discoverWeekly.jpg'
import { Screen, ScreenContent } from 'app/components/core'
import { TrackLineup } from 'app/components/lineup/TrackLineup'

const messages = {
  title: 'Discover Weekly'
}

const ART_SIZE = 120
const DISCOVER_WEEKLY_SOURCE = 'DISCOVER_WEEKLY_TRACKS'

/**
 * The full Discover Weekly mix. Mirrors the web page: artwork header, then the
 * track list.
 *
 * The endpoint returns a fixed 30, so there is no pagination -- hasNextPage is
 * false and loadNextPage is a no-op.
 */
export const DiscoverWeeklyScreen = () => {
  const { trackIds, isPending, isFetching } = useDiscoverWeekly({ limit: 30 })
  const { trackEvent } = useAnalytics()
  const dispatch = useDispatch()

  const isPlaying = useSelector(playbackSelectors.getPlaying)
  const currentPlaybackTrackId = useSelector(
    playbackSelectors.getCurrentTrackId
  )

  const playbackQueue: PlaybackTrack[] = useMemo(
    () =>
      trackIds.map((id) => ({
        trackId: id,
        source: DISCOVER_WEEKLY_SOURCE
      })),
    [trackIds]
  )

  // Mirrors the web page's play-all: toggle when we're already on the first
  // track, otherwise start the queue from the top.
  const handlePlay = useCallback(() => {
    if (playbackQueue.length === 0) return
    const firstId = playbackQueue[0].trackId as ID

    if (currentPlaybackTrackId === firstId) {
      dispatch(
        isPlaying ? playbackActions.togglePlay() : playbackActions.play()
      )
      return
    }

    trackEvent({
      eventName: Name.DISCOVER_WEEKLY_PLAY_ALL,
      source: 'mobile',
      trackCount: playbackQueue.length
    })
    dispatch(
      playbackActions.playFrom({
        tracks: playbackQueue,
        startIndex: 0,
        querySource: null
      })
    )
  }, [dispatch, isPlaying, currentPlaybackTrackId, playbackQueue, trackEvent])

  // Fired once the mix resolves, so trackCount is real and a failed load
  // doesn't register as a page view.
  const hasTrackedView = useRef(false)
  useEffect(() => {
    if (hasTrackedView.current || !trackIds.length) return
    hasTrackedView.current = true
    trackEvent({
      eventName: Name.DISCOVER_WEEKLY_PAGE_VIEW,
      source: 'mobile',
      trackCount: trackIds.length
    })
  }, [trackIds.length, trackEvent])

  const header = (
    <Flex ph='l' pt='l'>
      <Paper row gap='l' alignItems='center' p='l'>
        <Image
          source={discoverWeeklyArt}
          style={{ width: ART_SIZE, height: ART_SIZE, borderRadius: 8 }}
        />
        <Flex column gap='xs' style={{ flex: 1 }}>
          <Text variant='title' size='l'>
            {exploreMessages.discoverWeekly}
          </Text>
          <Text variant='body' size='s' color='subdued'>
            {exploreMessages.discoverWeeklySubtitle}
          </Text>
          {trackIds.length ? (
            <Text variant='body' size='s' color='subdued'>
              {exploreMessages.discoverWeeklyTrackCount(trackIds.length)}
            </Text>
          ) : null}
          <Button
            variant='primary'
            size='small'
            iconLeft={isPlaying ? IconPause : IconPlay}
            onPress={handlePlay}
            disabled={!trackIds.length}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
        </Flex>
      </Paper>
    </Flex>
  )

  return (
    <Screen title={messages.title} topbarRight={null} variant='secondary'>
      <ScreenContent>
        <TrackLineup
          trackIds={trackIds}
          source={DISCOVER_WEEKLY_SOURCE}
          isPending={isPending}
          isFetching={isFetching}
          hasNextPage={false}
          loadNextPage={() => {}}
          pageSize={30}
          header={header}
        />
      </ScreenContent>
    </Screen>
  )
}
