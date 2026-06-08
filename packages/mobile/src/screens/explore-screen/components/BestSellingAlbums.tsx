import React from 'react'

import { useBestSellingAlbums } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { useTheme } from '@audius/harmony-native'
import { CollectionList } from 'app/components/collection-list'

import { useExploreSectionTracking } from '../hooks/useExploreSectionTracking'

import { ExploreSection } from './ExploreSection'

export const BestSellingAlbums = () => {
  const { spacing } = useTheme()
  const { InViewWrapper, inView } = useExploreSectionTracking(
    'Best Selling Albums'
  )

  const { ids, isError, isSuccess } = useBestSellingAlbums(
    { limit: 10 },
    { enabled: inView }
  )

  if (isError || (isSuccess && !ids?.length)) {
    return null
  }

  return (
    <InViewWrapper>
      <ExploreSection title={messages.bestSellingAlbums}>
        <CollectionList
          horizontal
          collectionIds={ids}
          carouselSpacing={spacing.l}
        />
      </ExploreSection>
    </InViewWrapper>
  )
}
