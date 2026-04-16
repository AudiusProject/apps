import { useExploreContent } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { Box } from '@audius/harmony'

import { ContestCard, ContestCardSkeleton } from 'components/contest-card'

import { Carousel } from './Carousel'
import { useExploreSectionTracking } from './useExploreSectionTracking'

const CARD_WIDTH = 320
const SKELETON_COUNT = 6

export const FeaturedRemixContestsSection = () => {
  const { ref, inView } = useExploreSectionTracking('Featured Remix Contests')

  const { data, isPending, isError, isSuccess } = useExploreContent({
    enabled: inView
  })

  if (isError || (isSuccess && !data?.featuredRemixContests?.length)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.contests}>
      {!inView || !data?.featuredRemixContests || isPending
        ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <Box key={i} w={CARD_WIDTH} css={{ flexShrink: 0 }}>
              <ContestCardSkeleton variant='grid' />
            </Box>
          ))
        : data.featuredRemixContests.map((trackId) => (
            <Box key={trackId} w={CARD_WIDTH} css={{ flexShrink: 0 }}>
              <ContestCard trackId={trackId} variant='grid' />
            </Box>
          ))}
    </Carousel>
  )
}
