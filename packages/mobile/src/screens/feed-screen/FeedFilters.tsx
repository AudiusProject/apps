import { FeedFilter } from '@audius/common/models'
import { ScrollView, View } from 'react-native'

import { Flex, SelectablePill, useTheme } from '@audius/harmony-native'

const filterLabels: Record<FeedFilter, string> = {
  [FeedFilter.ALL]: 'All Posts',
  [FeedFilter.ORIGINAL]: 'Original Posts',
  [FeedFilter.REPOST]: 'Reposts'
}

const filters: FeedFilter[] = [
  FeedFilter.ALL,
  FeedFilter.ORIGINAL,
  FeedFilter.REPOST
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
  return (
    <View
      style={{
        backgroundColor: color.background.white,
        paddingBottom: spacing.s
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.l }}
      >
        <Flex direction='row' alignItems='center' gap='s'>
          {filters.map((filter) => (
            <SelectablePill
              key={filter}
              type='radio'
              size='small'
              value={filter}
              label={filterLabels[filter]}
              isSelected={currentFilter === filter}
              onChange={(value, isSelected) => {
                if (!isSelected) return
                onSelectFilter(value as FeedFilter)
              }}
              disableUnselectAnimation
            />
          ))}
        </Flex>
      </ScrollView>
    </View>
  )
}
