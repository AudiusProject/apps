import { useCallback, useEffect, useRef } from 'react'

import { useWeeklyRotation } from '@audius/common/api'
import { useAnalytics, useFeatureFlag } from '@audius/common/hooks'
import { exploreMessages as messages } from '@audius/common/messages'
import { Name, type WeeklyRotationSurface } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { route } from '@audius/common/utils'
import {
  Artwork,
  Button,
  Flex,
  IconArrowRight,
  Paper,
  Text
} from '@audius/harmony'
import { useInView } from 'react-intersection-observer'
import { useNavigate } from 'react-router'

import weeklyRotationArt from 'assets/img/weeklyRotation.jpg'
import { useIsMobile } from 'hooks/useIsMobile'

const { WEEKLY_ROTATION_PAGE } = route

const ART_SIZE_DESKTOP = 140
const ART_SIZE_MOBILE = 96

type WeeklyRotationBannerProps = {
  /** Surface this renders on; sent with every event. */
  surface: WeeklyRotationSurface
}

/**
 * Promotional banner for Weekly Rotation.
 *
 * Shared across Explore and the feed rather than duplicated, so the two stay
 * visually identical and the analytics differ only by `surface`.
 */
export const WeeklyRotationBanner = ({
  surface
}: WeeklyRotationBannerProps) => {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { trackEvent } = useAnalytics()

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
    triggerOnce: true,
    fallbackInView: true
  })

  const { isEnabled: isWeeklyRotationEnabled } = useFeatureFlag(
    FeatureFlags.WEEKLY_ROTATION
  )

  const { trackIds, isError, isSuccess } = useWeeklyRotation(
    { limit: 30 },
    { enabled: inView && isWeeklyRotationEnabled }
  )

  // Fire once, only when the mix is non-empty, so hidden banners don't count
  // as impressions.
  const hasTrackedView = useRef(false)
  useEffect(() => {
    if (hasTrackedView.current || !inView || !trackIds.length) return
    hasTrackedView.current = true
    trackEvent({
      eventName: Name.WEEKLY_ROTATION_BANNER_VIEW,
      surface,
      source: isMobile ? 'mobile' : 'web',
      trackCount: trackIds.length
    })
  }, [inView, trackIds.length, surface, isMobile, trackEvent])

  const handleClick = useCallback(() => {
    trackEvent({
      eventName: Name.WEEKLY_ROTATION_BANNER_CLICK,
      surface,
      source: isMobile ? 'mobile' : 'web',
      trackCount: trackIds.length
    })
    navigate(WEEKLY_ROTATION_PAGE)
  }, [navigate, trackEvent, surface, isMobile, trackIds.length])

  // Hidden when flagged off or when there's no mix. Gates every surface that
  // renders the banner.
  if (
    !isWeeklyRotationEnabled ||
    isError ||
    (isSuccess && trackIds.length === 0)
  ) {
    return null
  }

  const artSize = isMobile ? ART_SIZE_MOBILE : ART_SIZE_DESKTOP

  return (
    <Flex ref={ref} w='100%' ph={isMobile ? 'l' : undefined}>
      <Paper
        w='100%'
        direction='row'
        alignItems='center'
        gap={isMobile ? 'm' : 'xl'}
        p={isMobile ? 'm' : 'l'}
        border='default'
        onClick={handleClick}
        css={{ cursor: 'pointer' }}
      >
        <Artwork
          src={weeklyRotationArt}
          h={artSize}
          w={artSize}
          css={{ flexShrink: 0 }}
        />
        <Flex direction='column' gap='xs' css={{ minWidth: 0, flex: 1 }}>
          <Text variant='label' size='s' color='accent'>
            {messages.weeklyRotationBadge}
          </Text>
          <Text
            variant={isMobile ? 'title' : 'heading'}
            size={isMobile ? 'l' : 's'}
          >
            {messages.weeklyRotation}
          </Text>
          <Text variant='body' size={isMobile ? 's' : 'l'} color='subdued'>
            {messages.weeklyRotationPitch}
          </Text>
        </Flex>
        {isMobile ? null : (
          <Button
            variant='primary'
            iconRight={IconArrowRight}
            css={{ flexShrink: 0 }}
          >
            {messages.weeklyRotationCta}
          </Button>
        )}
      </Paper>
    </Flex>
  )
}
