import { useCallback, useEffect, useMemo, useRef } from 'react'

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
import { StyleSheet, View } from 'react-native'
import PagerView, {
  type PagerViewOnPageSelectedEvent
} from 'react-native-pager-view'

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

// Page order must match the tab order rendered by FeedTabs. Swiping left
// advances to a higher index (Latest); swiping right returns to For You.
const tabOrder: FeedTab[] = [FeedTab.FOR_YOU, FeedTab.LATEST]

const styles = StyleSheet.create({
  pager: { flex: 1 },
  page: { flex: 1 }
})

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

  const pagerRef = useRef<PagerView>(null)
  const feedTabIndex = tabOrder.indexOf(feedTab)
  // Mirrors the pager's actual on-screen page so we only issue a programmatic
  // page change when state and the pager have genuinely diverged (and so a
  // swipe doesn't trigger a redundant setPage back to where it already is).
  const currentPageRef = useRef(feedTabIndex)

  const commitTab = useCallback(
    (tab: FeedTab) => {
      setFeedTab(tab)
      track(make({ eventName: Name.FEED_CHANGE_VIEW, view: tab }))
    },
    [setFeedTab]
  )

  // Header tap: update state immediately (instant pill highlight); the effect
  // below moves the pager to match.
  const handleSelectTab = useCallback(
    (tab: FeedTab) => {
      commitTab(tab)
    },
    [commitTab]
  )

  const handlePageSelected = useCallback(
    (e: PagerViewOnPageSelectedEvent) => {
      const { position } = e.nativeEvent
      currentPageRef.current = position
      const tab = tabOrder[position]
      // Skip when the pager already matches state. This swallows the initial
      // onPageSelected that PagerView emits on mount (Android) — which would
      // otherwise fire a spurious analytics event and could clobber the
      // persisted tab — and avoids double-committing a header tap.
      if (tab === feedTab) return
      commitTab(tab)
    },
    [feedTab, commitTab]
  )

  // Keep the pager aligned with the persisted tab. Covers the async
  // localStorage load (the stored tab resolves after mount) and header taps,
  // without disturbing swipe gestures, which update currentPageRef first.
  useEffect(() => {
    if (currentPageRef.current !== feedTabIndex) {
      pagerRef.current?.setPageWithoutAnimation(feedTabIndex)
    }
  }, [feedTabIndex])

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

  const forYouLineupProps = {
    // For You is intentionally track-focused: render from `trackIds` only and
    // omit `lineupItems` so TrackLineup falls back to its pure-track mode,
    // dropping playlist/album tiles. The backend `feed/for-you` endpoint has no
    // tracks-only param, so this is filtered client-side. Pagination is
    // unaffected — useForYouFeed still counts full backend pages (tracks +
    // collections) when computing the next offset, so only the rendered set is
    // trimmed, not the fetch window.
    trackIds: forYouFeed.trackIds,
    isPending: forYouFeed.isPending,
    isFetching: forYouFeed.isFetching,
    hasNextPage: forYouFeed.hasNextPage,
    loadNextPage: forYouFeed.loadNextPage,
    pageSize: FOR_YOU_LOAD_MORE_PAGE_SIZE,
    initialPageSize: FOR_YOU_INITIAL_PAGE_SIZE
  }
  const followLineupProps = {
    trackIds: followFeed.trackIds,
    lineupItems: followFeed.data,
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
        {/* Horizontal pager: swipe left/right toggles between For You and
            Latest, mirroring the tab headers above. Both lineups stay mounted
            so each retains its own scroll position. */}
        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={feedTabIndex}
          onPageSelected={handlePageSelected}
        >
          <View key={FeedTab.FOR_YOU} style={styles.page}>
            <TrackLineup
              source='DISCOVER_FEED'
              pullToRefresh={false}
              hideHeaderOnEmpty
              LineupEmptyComponent={<SuggestedFollows />}
              ListFooterComponent={
                <EndOfLineupNotice description={messages.endOfFeed} />
              }
              {...forYouLineupProps}
            />
          </View>
          <View key={FeedTab.LATEST} style={styles.page}>
            <TrackLineup
              source='DISCOVER_FEED'
              pullToRefresh
              hideHeaderOnEmpty
              LineupEmptyComponent={<SuggestedFollows />}
              ListFooterComponent={
                <EndOfLineupNotice description={messages.endOfFeed} />
              }
              {...followLineupProps}
            />
          </View>
        </PagerView>
      </ScreenContent>
    </Screen>
  )
}
