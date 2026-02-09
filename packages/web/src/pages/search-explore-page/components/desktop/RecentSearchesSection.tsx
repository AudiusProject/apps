import { Flex } from '@audius/harmony'

import { useIsMobile } from 'hooks/useIsMobile'
import { RecentSearches } from 'pages/search-page/RecentSearches'

import { useExploreSectionTracking } from './useExploreSectionTracking'

export const RecentSearchesSection = () => {
  const { ref, inView } = useExploreSectionTracking('Recent Searches')
  const isMobile = useIsMobile()

  return (
    <Flex ref={ref} justifyContent={isMobile ? undefined : 'center'}>
      {!inView ? null : <RecentSearches />}
    </Flex>
  )
}
