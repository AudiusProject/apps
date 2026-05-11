import { useCallback, useMemo } from 'react'

import {
  getFeedQueryKey,
  FEED_INITIAL_PAGE_SIZE,
  FEED_LOAD_MORE_PAGE_SIZE,
  useCurrentUserId,
  useFeed,
  useForYouFeed,
  FOR_YOU_INITIAL_PAGE_SIZE,
  FOR_YOU_LOAD_MORE_PAGE_SIZE
} from '@audius/common/api'
import { Name, FeedFilter, FeedTab } from '@audius/common/models'
import { feedPageActions, feedPageSelectors } from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import { Screen, ScreenContent } from 'app/components/core'
import { EndOfLineupNotice } from 'app/components/lineup/EndOfLineupNotice'
import { TrackLineup } from 'app/components/lineup/TrackLineup'
import { SuggestedFollows } from 'app/components/suggested-follows'
import { MobileRootHeader } from 'app/screens/app-screen/MobileRootHeader'
import { make, track } from 'app/services/analytics'

import { FeedFilters } from './FeedFilters'
import { FeedTabs } from './FeedTabs'

const { getFeedTab, getFeedFilter } = feedPageSelectors
const { setFeedTab, setFeedFilter } = feedPageActions

const messages = {
  header: 'Your Feed',
  endOfFeed: "Looks like you've reached the end of your feed..."
}

// Note: the feed API returns both tracks and collections (playlist reposts).
// The new TrackLineup renders tracks only, so collections are filtered out by
// `trackIds` on the hook side. This is a known limitation introduced by the
// tanquery migration — collection feed rendering will be restored if/when
// TrackLineup learns to render mixed feeds.
export const FeedScreen = () => {
  const dispatch = useDispatch()
  const persistedTab = useSelector(getFeedTab)
  const feedFilter = useSelector(getFeedFilter)
  const { data: currentUserId } = useCurrentUserId()

  // Coerce legacy persisted FeedTab values (FOLLOWING / UPLOADS_ONLY) to
  // CHRONOLOGICAL after the For You / Chronological refactor.
  const feedTab =
    persistedTab === FeedTab.FOR_YOU ? FeedTab.FOR_YOU : FeedTab.CHRONOLOGICAL
  const isForYou = feedTab === FeedTab.FOR_YOU

  const feedArgs = useMemo(
    () => ({
      userId: currentUserId,
      filter: feedFilter,
      initialPageSize: FEED_INITIAL_PAGE_SIZE,
      loadMorePageSize: FEED_LOAD_MORE_PAGE_SIZE
    }),
    [feedFilter, currentUserId]
  )
  const followFeed = useFeed(feedArgs, { enabled: !isForYou })
  const forYouFeed = useForYouFeed(
    {
      initialPageSize: FOR_YOU_INITIAL_PAGE_SIZE,
      loadMorePageSize: FOR_YOU_LOAD_MORE_PAGE_SIZE
    },
    { enabled: isForYou }
  )

  const followQuerySource = useMemo(
    () => ({ queryKey: [...getFeedQueryKey(feedArgs)] as unknown[] }),
    [feedArgs]
  )

  const handleSelectTab = useCallback(
    (tab: FeedTab) => {
      dispatch(setFeedTab(tab))
      track(make({ eventName: Name.FEED_CHANGE_VIEW, view: tab }))
    },
    [dispatch]
  )

  const handleSelectFilter = useCallback(
    (filter: FeedFilter) => {
      dispatch(setFeedFilter(filter))
      track(make({ eventName: Name.FEED_CHANGE_VIEW, view: filter }))
    },
    [dispatch]
  )

  const lineupProps = isForYou
    ? {
        trackIds: forYouFeed.trackIds,
        isPending: forYouFeed.isPending,
        isFetching: forYouFeed.isFetching,
        hasNextPage: forYouFeed.hasNextPage,
        loadNextPage: forYouFeed.loadNextPage,
        pageSize: FOR_YOU_LOAD_MORE_PAGE_SIZE,
        initialPageSize: FOR_YOU_INITIAL_PAGE_SIZE,
        refetch: undefined as undefined | (() => void),
        querySource: undefined as { queryKey: unknown[] } | undefined
      }
    : {
        trackIds: followFeed.trackIds,
        isPending: followFeed.isPending,
        isFetching: followFeed.isFetching,
        hasNextPage: followFeed.hasNextPage,
        loadNextPage: followFeed.loadNextPage,
        pageSize: FEED_LOAD_MORE_PAGE_SIZE,
        initialPageSize: FEED_INITIAL_PAGE_SIZE,
        refetch: () => {
          followFeed.refetch()
        },
        querySource: followQuerySource
      }

  return (
    <Screen
      url='Feed'
      header={() => (
        <MobileRootHeader title={messages.header} showDivider={false} />
      )}
    >
      <ScreenContent>
        <FeedTabs currentTab={feedTab} onSelectTab={handleSelectTab} />
        {isForYou ? null : (
          <FeedFilters
            currentFilter={feedFilter}
            onSelectFilter={handleSelectFilter}
          />
        )}
        <TrackLineup
          key={`feed-${feedTab}`}
          source='DISCOVER_FEED'
          pullToRefresh={!isForYou}
          hideHeaderOnEmpty
          LineupEmptyComponent={<SuggestedFollows />}
          ListFooterComponent={
            <EndOfLineupNotice description={messages.endOfFeed} />
          }
          {...lineupProps}
        />
      </ScreenContent>
    </Screen>
  )
}
