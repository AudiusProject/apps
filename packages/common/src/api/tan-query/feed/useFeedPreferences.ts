import { useCallback } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedFilter, FeedTab } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { useQueryContext } from '../utils'

const FEED_TAB_LS_KEY = 'feed-page:tab'
const FEED_FILTER_LS_KEY = 'feed-page:filter'

const isFeedTab = (value: string | null): value is FeedTab =>
  value === FeedTab.FOR_YOU || value === FeedTab.LATEST

const isFeedFilter = (value: string | null): value is FeedFilter =>
  value === FeedFilter.ALL ||
  value === FeedFilter.ORIGINAL ||
  value === FeedFilter.REPOST

/**
 * Persisted active tab on the Feed page (For You vs Latest). Backed by
 * the tan-query cache so reads in any component see the same value, with
 * localStorage as the durable store.
 */
export const useFeedTab = (): [FeedTab, (tab: FeedTab) => void] => {
  const queryClient = useQueryClient()
  const { localStorage } = useQueryContext()

  const { data: tab = FeedTab.FOR_YOU } = useQuery({
    queryKey: [QUERY_KEYS.feedTab],
    queryFn: async () => {
      const stored = await localStorage.getItem(FEED_TAB_LS_KEY)
      // Migrate the pre-rename persisted value so existing users land on the
      // same tab they had selected.
      if (stored === 'CHRONOLOGICAL') return FeedTab.LATEST
      return isFeedTab(stored) ? stored : FeedTab.FOR_YOU
    },
    staleTime: Infinity,
    gcTime: Infinity
  })

  const setTab = useCallback(
    (next: FeedTab) => {
      queryClient.setQueryData([QUERY_KEYS.feedTab], next)
      localStorage.setItem(FEED_TAB_LS_KEY, next)
    },
    [queryClient, localStorage]
  )

  return [tab, setTab]
}

/**
 * Persisted post-type filter for the Latest feed. Same tan-query
 * shared-store pattern as {@link useFeedTab}.
 */
export const useFeedFilter = (): [FeedFilter, (filter: FeedFilter) => void] => {
  const queryClient = useQueryClient()
  const { localStorage } = useQueryContext()

  const { data: filter = FeedFilter.ALL } = useQuery({
    queryKey: [QUERY_KEYS.feedFilter],
    queryFn: async () => {
      const stored = await localStorage.getItem(FEED_FILTER_LS_KEY)
      return isFeedFilter(stored) ? stored : FeedFilter.ALL
    },
    staleTime: Infinity,
    gcTime: Infinity
  })

  const setFilter = useCallback(
    (next: FeedFilter) => {
      queryClient.setQueryData([QUERY_KEYS.feedFilter], next)
      localStorage.setItem(FEED_FILTER_LS_KEY, next)
    },
    [queryClient, localStorage]
  )

  return [filter, setFilter]
}
