import React, { useCallback, useEffect, useRef } from 'react'

import { useDiscoverWeekly } from '@audius/common/api'
import { useAnalytics, useFeatureFlag } from '@audius/common/hooks'
import { exploreMessages as messages } from '@audius/common/messages'
import { Name, type DiscoverWeeklySurface } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { Image } from 'react-native'

import { Flex, Paper, Text } from '@audius/harmony-native'
import discoverWeeklyArt from 'app/assets/images/discoverWeekly.jpg'
import { useNavigation } from 'app/hooks/useNavigation'

import { useExploreSectionTracking } from '../hooks/useExploreSectionTracking'

const ART_SIZE = 96

/**
 * Promotional banner for Discover Weekly, pinned to the top of Explore.
 *
 * Mirrors the web banner: an entry point rather than a content row, so it
 * navigates to the full mix instead of playing in place. Deliberately not
 * wrapped in ExploreSection -- it sits above the section stack.
 */
type DiscoverWeeklyProps = {
  /** Which surface this instance renders on -- carried on every event so we
   * can tell which entry point actually drives listens. */
  surface?: DiscoverWeeklySurface
}

export const DiscoverWeekly = ({
  surface = 'explore'
}: DiscoverWeeklyProps) => {
  const { InViewWrapper, inView } = useExploreSectionTracking('Discover Weekly')
  const navigation = useNavigation()
  const { trackEvent } = useAnalytics()
  const { isEnabled: isDiscoverWeeklyEnabled } = useFeatureFlag(
    FeatureFlags.DISCOVER_WEEKLY
  )
  const { trackIds, isError, isSuccess } = useDiscoverWeekly(
    { limit: 30 },
    { enabled: inView && isDiscoverWeeklyEnabled }
  )

  // Fire the impression once, and only once there's a real mix behind it.
  const hasTrackedView = useRef(false)
  useEffect(() => {
    if (hasTrackedView.current || !inView || !trackIds.length) return
    hasTrackedView.current = true
    trackEvent({
      eventName: Name.DISCOVER_WEEKLY_BANNER_VIEW,
      surface,
      source: 'mobile',
      trackCount: trackIds.length
    })
  }, [inView, trackIds.length, surface, trackEvent])

  const handlePress = useCallback(() => {
    trackEvent({
      eventName: Name.DISCOVER_WEEKLY_BANNER_CLICK,
      surface,
      source: 'mobile',
      trackCount: trackIds.length
    })
    navigation.navigate('DiscoverWeeklyScreen')
  }, [navigation, trackEvent, surface, trackIds.length])

  // The flag check sits with the empty/error case so both surfaces that render
  // this banner -- Explore and the feed -- are gated by this one return.
  if (
    !isDiscoverWeeklyEnabled ||
    isError ||
    (isSuccess && trackIds.length === 0)
  ) {
    return null
  }

  return (
    <InViewWrapper>
      <Paper row alignItems='center' gap='m' p='m' onPress={handlePress}>
        <Image
          source={discoverWeeklyArt}
          style={{ width: ART_SIZE, height: ART_SIZE, borderRadius: 8 }}
        />
        <Flex column gap='xs' style={{ flex: 1 }}>
          <Text variant='label' size='s' color='accent'>
            {messages.discoverWeeklyBadge}
          </Text>
          <Text variant='title' size='l' numberOfLines={1}>
            {messages.discoverWeekly}
          </Text>
          <Text variant='body' size='s' color='subdued'>
            {messages.discoverWeeklyPitch}
          </Text>
        </Flex>
      </Paper>
    </InViewWrapper>
  )
}
