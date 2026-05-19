import { useCallback } from 'react'

import { FeedFilter } from '@audius/common/models'
import { FilterButton } from '@audius/harmony'

type FeedFiltersProps = {
  currentFilter: FeedFilter
  onSelectFilter: (filter: FeedFilter) => void
}

const messages = {
  allPosts: 'All Posts',
  originalPosts: 'Original Posts',
  reposts: 'Reposts'
}

const filterOptions = [
  { label: messages.allPosts, value: FeedFilter.ALL },
  { label: messages.originalPosts, value: FeedFilter.ORIGINAL },
  { label: messages.reposts, value: FeedFilter.REPOST }
]

export const FeedFilters = ({
  currentFilter,
  onSelectFilter
}: FeedFiltersProps) => {
  const handleChange = useCallback(
    (value: string) => {
      onSelectFilter(value as FeedFilter)
    },
    [onSelectFilter]
  )

  return (
    <FilterButton
      label={messages.allPosts}
      value={currentFilter}
      variant='replaceLabel'
      onChange={handleChange}
      options={filterOptions}
    />
  )
}
