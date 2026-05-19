import { FeedFilter } from '@audius/common/models'
import { feedPageSelectors, modalsActions } from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import { Flex, IconLeading, SelectablePill } from '@audius/harmony-native'

import { FEED_FILTER_MODAL } from './FeedFilterDrawer'

export const FeedFilterButton = () => {
  const dispatch = useDispatch()
  const feedFilter = useSelector(feedPageSelectors.getFeedFilter)

  const hasActiveFilters = (feedFilter ?? FeedFilter.ALL) !== FeedFilter.ALL

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
