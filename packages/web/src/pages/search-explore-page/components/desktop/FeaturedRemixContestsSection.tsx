import { useExploreContent } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { exploreMessages as messages } from '@audius/common/messages'
import { FeatureFlags } from '@audius/common/services'
import { Box } from '@audius/harmony'

import { ContestCard, ContestCardSkeleton } from 'components/contest-card'
import {
  RemixContestCard,
  RemixContestCardSkeleton
} from 'components/remix-contest-card'
import { useIsMobile } from 'hooks/useIsMobile'

import { Carousel } from './Carousel'
import { useExploreSectionTracking } from './useExploreSectionTracking'

const NEW_CARD_WIDTH = 320
const SKELETON_COUNT = 6

export const FeaturedRemixContestsSection = () => {
  const { ref, inView } = useExploreSectionTracking('Featured Remix Contests')

  const { data, isPending, isError, isSuccess } = useExploreContent({
    enabled: inView
  })
  const isMobile = useIsMobile()
  const { isEnabled: isContestsPageEnabled } = useFeatureFlag(
    FeatureFlags.CONTESTS_PAGE
  )

  if (isError || (isSuccess && !data?.featuredRemixContests?.length)) {
    return null
  }

  const showLoading = !inView || !data?.featuredRemixContests || isPending

  return (
    <Carousel
      ref={ref}
      title={
        isContestsPageEnabled ? messages.contests : messages.featuredRemixContests
      }
    >
      {isContestsPageEnabled
        ? showLoading
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <Box key={i} w={NEW_CARD_WIDTH} css={{ flexShrink: 0 }}>
                <ContestCardSkeleton variant='grid' />
              </Box>
            ))
          : data.featuredRemixContests.map((trackId) => (
              <Box key={trackId} w={NEW_CARD_WIDTH} css={{ flexShrink: 0 }}>
                <ContestCard trackId={trackId} variant='grid' />
              </Box>
            ))
        : showLoading
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <RemixContestCardSkeleton
                key={i}
                size={isMobile ? 'xs' : 's'}
                noShimmer
              />
            ))
          : data.featuredRemixContests.map((id) => (
              <RemixContestCard key={id} id={id} size='s' />
            ))}
    </Carousel>
  )
}
