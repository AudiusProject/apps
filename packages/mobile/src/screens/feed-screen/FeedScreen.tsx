import { useCallback, useMemo } from 'react'

import {
  getFeedQueryKey,
  FEED_INITIAL_PAGE_SIZE,
  FEED_LOAD_MORE_PAGE_SIZE,
  useCurrentUserId,
  useFeed,
  useFeedFilter,
  useFeedTab,
  useForYouFeed,
  FOR_YOU_INITIAL_PAGE_SIZE,
  FOR_YOU_LOAD_MORE_PAGE_SIZE
} from '@audius/common/api'
import { Name, FeedTab } from '@audius/common/models'

import { Screen, ScreenContent } from 'app/components/core'
import { EndOfLineupNotice } from 'app/components/lineup/EndOfLineupNotice'
import { TrackLineup } from 'app/components/lineup/TrackLineup'
import { SuggestedFollows } from 'app/components/suggested-follows'
import { MobileRootHeader } from 'app/screens/app-screen/MobileRootHeader'
import { make, track } from 'app/services/analytics'

import { FeedFilterButton } from './FeedFilterButton'
import { FeedTabs } from './FeedTabs'

const messages = {
  header: 'Your Feed',
  endOfFeed: "Looks like you've reached the end of your feed..."
}

export const FeedScreen = () => {
  const [feedTab, setFeedTab] = useFeedTab()
  const [feedFilter] = useFeedFilter()
  const { data: currentUserId } = useCurrentUserId()

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
      setFeedTab(tab)
      track(make({ eventName: Name.FEED_CHANGE_VIEW, view: tab }))
    },
    [setFeedTab]
  )

  // Memoized so the header isn't a new function reference on every render —
  // otherwise Screen's setOptions runs each parent re-render and React
  // Navigation rebuilds the header, remounting AccountPictureHeader and
  // re-firing the profile-picture image-fetch path.
  const renderHeader = useCallback(
    () => (
      <MobileRootHeader title={messages.header} showDivider={false}>
        {isForYou ? null : <FeedFilterButton />}
      </MobileRootHeader>
    ),
    [isForYou]
  )

  const lineupProps = isForYou
    ? {
        trackIds: forYouFeed.trackIds,
        lineupItems: forYouFeed.data,
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
    <Screen url='Feed' header={renderHeader}>
      <ScreenContent>
        <FeedTabs currentTab={feedTab} onSelectTab={handleSelectTab} />
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
