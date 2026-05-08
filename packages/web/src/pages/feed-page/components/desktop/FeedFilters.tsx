import { ChangeEvent, useCallback } from 'react'

import { FeedFilter } from '@audius/common/models'
import { Flex, SelectablePill } from '@audius/harmony'

type FeedFiltersProps = {
  currentFilter: FeedFilter
  didSelectFilter: (filter: FeedFilter) => void
}

const messages = {
  allPosts: 'All Posts',
  originalPosts: 'Original Posts',
  reposts: 'Reposts'
}

const filterToTitle = {
  [FeedFilter.ALL]: messages.allPosts,
  [FeedFilter.ORIGINAL]: messages.originalPosts,
  [FeedFilter.REPOST]: messages.reposts
}

const filters = [FeedFilter.ALL, FeedFilter.ORIGINAL, FeedFilter.REPOST]

/**
 * FeedFilters are the row of selectable pills on the feed for filtering the feed by repost, original, and all.
 */
export const FeedFilters = (props: FeedFiltersProps) => {
  const { currentFilter, didSelectFilter } = props

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      didSelectFilter(e.target.value as FeedFilter)
    },
    [didSelectFilter]
  )

  return (
    <Flex gap='s' role='radiogroup' onChange={handleChange}>
      {filters.map((filter) => (
        <SelectablePill
          name='feed-filter'
          key={filter}
          type='radio'
          value={filter}
          label={filterToTitle[filter]}
          isSelected={currentFilter === filter}
          size='large'
        />
      ))}
    </Flex>
  )
}
