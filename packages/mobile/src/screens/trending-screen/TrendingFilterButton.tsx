import { useCallback } from 'react'

import { modalsActions, trendingPageSelectors } from '@audius/common/store'
import { ALL_GENRES } from '@audius/common/utils'
import { useDispatch, useSelector } from 'react-redux'

import { FilterButton } from '@audius/harmony-native'

import { MODAL_NAME } from './TrendingFilterDrawer'

const { getTrendingGenre } = trendingPageSelectors
const { setVisibility } = modalsActions

export const TrendingFilterButton = () => {
  const dispatch = useDispatch()
  const trendingGenre = useSelector(getTrendingGenre) ?? ALL_GENRES

  const handlePress = useCallback(() => {
    dispatch(setVisibility({ modal: MODAL_NAME, visible: true }))
  }, [dispatch])

  return (
    <FilterButton
      label={trendingGenre}
      value={trendingGenre}
      onPress={handlePress}
      size='small'
    />
  )
}
