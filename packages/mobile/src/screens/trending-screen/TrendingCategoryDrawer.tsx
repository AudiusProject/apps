import { useCallback } from 'react'

import { modalsActions, trendingPageActions } from '@audius/common/store'
import { useDispatch } from 'react-redux'

import ActionDrawer from 'app/components/action-drawer/ActionDrawer'

export const TRENDING_CATEGORY_MODAL = 'TrendingCategory' as const

const messages = {
  tracks: 'Tracks',
  underground: 'Underground'
}

export const TrendingCategoryDrawer = () => {
  const dispatch = useDispatch()

  const handleSelect = useCallback(
    (category: 'tracks' | 'underground') => () => {
      dispatch(
        modalsActions.setVisibility({
          modal: TRENDING_CATEGORY_MODAL,
          visible: false
        })
      )
      dispatch(trendingPageActions.setTrendingCategory(category))
    },
    [dispatch]
  )

  const rows = [
    { text: messages.tracks, callback: handleSelect('tracks') },
    { text: messages.underground, callback: handleSelect('underground') }
  ]

  return <ActionDrawer modalName={TRENDING_CATEGORY_MODAL} rows={rows} />
}
