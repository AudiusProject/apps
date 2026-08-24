import React, { useEffect, useRef } from 'react'

import { useDiscoverWeekly } from '@audius/common/api'
import { useAnalytics } from '@audius/common/hooks'
import { exploreMessages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import { Image } from 'react-native'

import { Flex, Paper, Text } from '@audius/harmony-native'
import discoverWeeklyArt from 'app/assets/images/discoverWeekly.jpg'
import { Screen, ScreenContent } from 'app/components/core'
import { TrackLineup } from 'app/components/lineup/TrackLineup'

const messages = {
  title: 'Discover Weekly'
}

const ART_SIZE = 120

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

  return (
    <Screen title={messages.title} topbarRight={null} variant='secondary'>
      <ScreenContent>
        <Paper m='l' gap='l' h='100%'>
          <Flex row gap='l' alignItems='center' p='l'>
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
            </Flex>
          </Flex>
          <TrackLineup
            trackIds={trackIds}
            source='DISCOVER_WEEKLY_TRACKS'
            isPending={isPending}
            isFetching={isFetching}
            hasNextPage={false}
            loadNextPage={() => {}}
            pageSize={30}
          />
        </Paper>
      </ScreenContent>
    </Screen>
  )
}
