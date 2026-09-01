import React, { useCallback, useEffect, useRef } from 'react'

import { useWeeklyRotation } from '@audius/common/api'
import { useAnalytics, useFeatureFlag } from '@audius/common/hooks'
import { exploreMessages as messages } from '@audius/common/messages'
import { Name, type WeeklyRotationSurface } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { Image } from 'react-native'

import { Flex, Paper, Text } from '@audius/harmony-native'
import weeklyRotationArt from 'app/assets/images/weeklyRotation.jpg'
import { useNavigation } from 'app/hooks/useNavigation'

import { useExploreSectionTracking } from '../hooks/useExploreSectionTracking'

const ART_SIZE = 96

/**
 * Promotional banner for Weekly Rotation, pinned to the top of Explore.
 *
 * Mirrors the web banner: an entry point rather than a content row, so it
 * navigates to the full mix instead of playing in place. Deliberately not
 * wrapped in ExploreSection -- it sits above the section stack.
 */
type WeeklyRotationProps = {
  /** Which surface this instance renders on -- carried on every event so we
   * can tell which entry point actually drives listens. */
  surface?: WeeklyRotationSurface
}

export const WeeklyRotation = ({
  surface = 'explore'
}: WeeklyRotationProps) => {
  const { InViewWrapper, inView } = useExploreSectionTracking('Weekly Rotation')
  const navigation = useNavigation()
  const { trackEvent } = useAnalytics()
  const { isEnabled: isWeeklyRotationEnabled } = useFeatureFlag(
    FeatureFlags.WEEKLY_ROTATION
  )
  const { trackIds, isError, isSuccess } = useWeeklyRotation(
    { limit: 30 },
    { enabled: inView && isWeeklyRotationEnabled }
  )

  // Fire the impression once, and only once there's a real mix behind it.
  const hasTrackedView = useRef(false)
  useEffect(() => {
    if (hasTrackedView.current || !inView || !trackIds.length) return
    hasTrackedView.current = true
    trackEvent({
      eventName: Name.WEEKLY_ROTATION_BANNER_VIEW,
      surface,
      source: 'mobile',
      trackCount: trackIds.length
    })
  }, [inView, trackIds.length, surface, trackEvent])

  const handlePress = useCallback(() => {
    trackEvent({
      eventName: Name.WEEKLY_ROTATION_BANNER_CLICK,
      surface,
      source: 'mobile',
      trackCount: trackIds.length
    })
    navigation.navigate('WeeklyRotationScreen')
  }, [navigation, trackEvent, surface, trackIds.length])

  // The flag check sits with the empty/error case so both surfaces that render
  // this banner -- Explore and the feed -- are gated by this one return.
  if (
    !isWeeklyRotationEnabled ||
    isError ||
    (isSuccess && trackIds.length === 0)
  ) {
    return null
  }

  return (
    <InViewWrapper>
      <Paper row alignItems='center' gap='m' p='m' onPress={handlePress}>
        <Image
          source={weeklyRotationArt}
          style={{ width: ART_SIZE, height: ART_SIZE, borderRadius: 8 }}
        />
        <Flex column gap='xs' style={{ flex: 1 }}>
          <Text variant='label' size='s' color='accent'>
            {messages.weeklyRotationBadge}
          </Text>
          <Text variant='title' size='l' numberOfLines={1}>
            {messages.weeklyRotation}
          </Text>
          <Text variant='body' size='s' color='subdued'>
            {messages.weeklyRotationPitch}
          </Text>
        </Flex>
      </Paper>
    </InViewWrapper>
  )
}
