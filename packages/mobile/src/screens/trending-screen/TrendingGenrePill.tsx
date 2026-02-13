import { useCallback } from 'react'

import {
  modalsActions,
  trendingPageActions,
  trendingPageLineupActions,
  trendingPageSelectors
} from '@audius/common/store'
import { ALL_GENRES, Genre } from '@audius/common/utils'
import { useDispatch, useSelector } from 'react-redux'

import { IconCloseAlt, SelectablePill } from '@audius/harmony-native'

import { MODAL_NAME } from './TrendingFilterDrawer'

const { getTrendingGenre } = trendingPageSelectors
const { setTrendingGenre } = trendingPageActions
const { setVisibility } = modalsActions
const { trendingWeekActions, trendingMonthActions, trendingAllTimeActions } =
  trendingPageLineupActions

export const TrendingGenrePill = () => {
  const dispatch = useDispatch()
  const genre = useSelector(getTrendingGenre) ?? ALL_GENRES

  const isSelected = genre !== ALL_GENRES

  const handlePress = useCallback(() => {
    if (genre === ALL_GENRES) {
      dispatch(setVisibility({ modal: MODAL_NAME, visible: true }))
    }
  }, [dispatch, genre])

  const handleChange = useCallback(
    (_value: string, selected: boolean) => {
      if (!selected) {
        dispatch(setTrendingGenre(null))
        dispatch(trendingWeekActions.reset())
        dispatch(trendingMonthActions.reset())
        dispatch(trendingAllTimeActions.reset())
      }
    },
    [dispatch]
  )

  return (
    <SelectablePill
      type='radio'
      size='large'
      value={genre}
      label={genre}
      isSelected={isSelected}
      onChange={handleChange}
      onPress={handlePress}
      icon={isSelected ? IconCloseAlt : undefined}
      disableUnselectAnimation
    />
  )
}
