import React from 'react'

import { useNewAlbumReleases } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { useTheme } from '@audius/harmony-native'
import { CollectionList } from 'app/components/collection-list'

import { useExploreSectionTracking } from '../hooks/useExploreSectionTracking'

import { ExploreSection } from './ExploreSection'

export const NewAlbumReleases = () => {
  const { spacing } = useTheme()
  const { InViewWrapper, inView } =
    useExploreSectionTracking('New Album Releases')

  const { ids, isError, isSuccess } = useNewAlbumReleases(
    { limit: 10 },
    { enabled: inView }
  )

  if (isError || (isSuccess && !ids?.length)) {
    return null
  }

  return (
    <InViewWrapper>
      <ExploreSection title={messages.newAlbumReleases}>
        <CollectionList
          horizontal
          collectionIds={ids}
          carouselSpacing={spacing.l}
        />
      </ExploreSection>
    </InViewWrapper>
  )
}
