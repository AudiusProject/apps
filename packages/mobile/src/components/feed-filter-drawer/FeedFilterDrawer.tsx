import { useCallback, useMemo } from 'react'

import { QUERY_KEYS } from '@audius/common/api'
import { Name, FeedFilter } from '@audius/common/models'
import { feedPageActions } from '@audius/common/store'
import { useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import ActionDrawer from 'app/components/action-drawer'
import { Text } from 'app/components/core'
import { make, track } from 'app/services/analytics'

const { setFeedFilter } = feedPageActions

const MODAL_NAME = 'FeedFilter'

export const messages = {
  title: 'What do you want to see in your feed?',
  filterAll: 'All Posts',
  filterOriginal: 'Original Posts',
  filterReposts: 'Reposts'
}

export const FeedFilterDrawer = () => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()

  const handleSelectFilter = useCallback(
    (filter: FeedFilter) => {
      dispatch(setFeedFilter(filter))
      // Invalidate the feed tan-query so it refetches with the new filter
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.feed]
      })
      track(make({ eventName: Name.FEED_CHANGE_VIEW, view: filter }))
    },
    [dispatch, queryClient]
  )

  const rows = useMemo(
    () => [
      {
        text: messages.filterAll,
        callback: () => handleSelectFilter(FeedFilter.ALL)
      },
      {
        text: messages.filterOriginal,
        callback: () => handleSelectFilter(FeedFilter.ORIGINAL)
      },
      {
        text: messages.filterReposts,
        callback: () => handleSelectFilter(FeedFilter.REPOST)
      }
    ],
    [handleSelectFilter]
  )

  return (
    <ActionDrawer
      modalName={MODAL_NAME}
      title={
        <Text color='neutral' textTransform='none'>
          {messages.title}
        </Text>
      }
      rows={rows}
    />
  )
}
