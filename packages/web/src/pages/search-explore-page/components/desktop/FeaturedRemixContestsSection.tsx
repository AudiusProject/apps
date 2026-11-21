import { useAllRemixContests, useExploreContent } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { route } from '@audius/common/utils'
import { Box } from '@audius/harmony'

import { ContestCard, ContestCardSkeleton } from 'components/contest-card'

import { Carousel } from './Carousel'
import { CONTEST_CARD_WIDTH } from './constants'
import { useExploreSectionTracking } from './useExploreSectionTracking'

const SKELETON_COUNT = 6
const PRIME_BATCH_SIZE = 30

export const FeaturedRemixContestsSection = () => {
  const { ref, inView } = useExploreSectionTracking('Featured Remix Contests')

  const { data, isPending, isError, isSuccess } = useExploreContent({
    enabled: inView
  })

  useAllRemixContests({ pageSize: PRIME_BATCH_SIZE }, { enabled: inView })

  if (isError || (isSuccess && !data?.featuredRemixContests?.length)) {
    return null
  }

  const showLoading = !inView || !data?.featuredRemixContests || isPending

  return (
    <Carousel
      ref={ref}
      title={messages.contests}
      viewAllLink={route.CONTESTS_PAGE}
    >
      {showLoading
        ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <Box key={i} w={CONTEST_CARD_WIDTH} css={{ flexShrink: 0 }}>
              <ContestCardSkeleton variant='grid' />
            </Box>
          ))
        : data.featuredRemixContests.map((trackId) => (
            <Box key={trackId} w={CONTEST_CARD_WIDTH} css={{ flexShrink: 0 }}>
              <ContestCard trackId={trackId} variant='grid' />
            </Box>
          ))}
    </Carousel>
  )
}
