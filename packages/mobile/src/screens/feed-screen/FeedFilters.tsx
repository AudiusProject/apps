import { useCallback } from 'react'

import { FeedFilter } from '@audius/common/models'
import { FilterButton, useTheme } from '@audius/harmony-native'
import { View } from 'react-native'

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

type FeedFiltersProps = {
  currentFilter: FeedFilter
  onSelectFilter: (filter: FeedFilter) => void
}

export const FeedFilters = ({
  currentFilter,
  onSelectFilter
}: FeedFiltersProps) => {
  const { spacing, color } = useTheme()

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!value) return
      onSelectFilter(value as FeedFilter)
    },
    [onSelectFilter]
  )

  return (
    <View
      style={{
        backgroundColor: color.background.white,
        paddingHorizontal: spacing.l,
        paddingBottom: spacing.s,
        alignItems: 'flex-start'
      }}
    >
      <FilterButton
        label={messages.allPosts}
        value={currentFilter}
        variant='replaceLabel'
        onChange={handleChange}
        options={filterOptions}
        size='small'
        disableSearch
      />
    </View>
  )
}
