import { useFeedFilter } from '@audius/common/api'
import { FeedFilter } from '@audius/common/models'
import { modalsActions } from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { Flex, IconLeading, SelectablePill } from '@audius/harmony-native'

import { FEED_FILTER_MODAL } from './FeedFilterDrawer'

export const FeedFilterButton = () => {
  const dispatch = useDispatch()
  const [feedFilter] = useFeedFilter()

  const hasActiveFilters = feedFilter !== FeedFilter.ALL

  const handleOpenFilter = () => {
    dispatch(
      modalsActions.setVisibility({
        modal: FEED_FILTER_MODAL,
        visible: true
      })
    )
  }

  return (
    <Flex>
      <SelectablePill
        type='button'
        icon={IconLeading}
        size='large'
        isSelected={hasActiveFilters}
        isControlled
        onPress={handleOpenFilter}
        accessibilityLabel='Open filter'
      />
    </Flex>
  )
}
