import { useFeedFilter } from '@audius/common/api'
import { FeedFilter } from '@audius/common/models'
import { modalsActions } from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { Flex, IconLeading, SelectablePill } from '@audius/harmony-native'

import { FEED_FILTER_MODAL } from './FeedFilterDrawer'

type FeedFilterButtonProps = {
  size?: 'small' | 'large'
}

export const FeedFilterButton = ({ size = 'large' }: FeedFilterButtonProps) => {
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
        size={size}
        isSelected={hasActiveFilters}
        isControlled
        onPress={handleOpenFilter}
        accessibilityLabel='Open filter'
      />
    </Flex>
  )
}
