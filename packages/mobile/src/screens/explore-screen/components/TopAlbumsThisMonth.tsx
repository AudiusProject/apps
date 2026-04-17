import React from 'react'

import { useTrendingAlbums } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { useTheme } from '@audius/harmony-native'
import { CollectionList } from 'app/components/collection-list'

import { useExploreSectionTracking } from '../hooks/useExploreSectionTracking'

import { ExploreSection } from './ExploreSection'

export const TopAlbumsThisMonth = () => {
  const { spacing } = useTheme()
  const { InViewWrapper, inView } = useExploreSectionTracking(
    'Top Albums This Month'
  )

  const { ids, isError, isSuccess } = useTrendingAlbums(
    { time: 'month', limit: 10 },
    { enabled: inView }
  )

  if (isError || (isSuccess && !ids?.length)) {
    return null
  }

  return (
    <InViewWrapper>
      <ExploreSection title={messages.topAlbumsThisMonth}>
        <CollectionList
          horizontal
          collectionIds={ids}
          carouselSpacing={spacing.l}
        />
      </ExploreSection>
    </InViewWrapper>
  )
}
