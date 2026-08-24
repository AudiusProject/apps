import { useDiscoverWeekly } from '@audius/common/api'
import { Flex } from '@audius/harmony'

import { CollectionCardSkeleton } from 'components/collection'
import { useIsMobile } from 'hooks/useIsMobile'

import { DiscoverWeeklyCard } from './DiscoverWeeklyCard'
import { useExploreSectionTracking } from './useExploreSectionTracking'

/**
 * Deliberately not wrapped in a Carousel like the sibling sections: there is
 * exactly one card, so the scroll affordance is dead weight and a section
 * heading would just repeat the card's own title.
 */
export const DiscoverWeeklySection = () => {
  const { ref, inView } = useExploreSectionTracking('Discover Weekly')
  const isMobile = useIsMobile()
  const { trackIds, isLoading, isError, isSuccess } = useDiscoverWeekly(
    { limit: 30 },
    { enabled: inView }
  )

  if (isError || (isSuccess && trackIds.length === 0)) {
    return null
  }

  return (
    <Flex ref={ref} ph={isMobile ? 'l' : undefined} w='100%'>
      {!inView || isLoading || !trackIds.length ? (
        <CollectionCardSkeleton size={isMobile ? 'xs' : 's'} noShimmer />
      ) : (
        <DiscoverWeeklyCard trackIds={trackIds} />
      )}
    </Flex>
  )
}
