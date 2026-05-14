import { ChangeEvent, useCallback } from 'react'

import { FeedFilter } from '@audius/common/models'
import { Flex, SelectablePill } from '@audius/harmony'

type FeedFiltersProps = {
  currentFilter: FeedFilter
  onSelectFilter: (filter: FeedFilter) => void
}

const messages = {
  allPosts: 'All Posts',
  originalPosts: 'Original Posts',
  reposts: 'Reposts'
}

const filterToLabel: Record<FeedFilter, string> = {
  [FeedFilter.ALL]: messages.allPosts,
  [FeedFilter.ORIGINAL]: messages.originalPosts,
  [FeedFilter.REPOST]: messages.reposts
}

const filters: FeedFilter[] = [
  FeedFilter.ALL,
  FeedFilter.ORIGINAL,
  FeedFilter.REPOST
]

export const FeedFilters = ({
  currentFilter,
  onSelectFilter
}: FeedFiltersProps) => {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onSelectFilter(e.target.value as FeedFilter)
    },
    [onSelectFilter]
  )

  return (
    <Flex gap='s' role='radiogroup' onChange={handleChange} pb='l'>
      {filters.map((filter) => (
        <SelectablePill
          name='feed-filter'
          key={filter}
          type='radio'
          value={filter}
          label={filterToLabel[filter]}
          isSelected={currentFilter === filter}
          size='small'
        />
      ))}
    </Flex>
  )
}
