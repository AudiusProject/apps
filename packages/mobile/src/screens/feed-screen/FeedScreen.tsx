import { useMemo } from 'react'

import {
  getFeedQueryKey,
  FEED_INITIAL_PAGE_SIZE,
  FEED_LOAD_MORE_PAGE_SIZE,
  useCurrentUserId,
  useFeed
} from '@audius/common/api'
import { feedPageSelectors } from '@audius/common/store'
import { useSelector } from 'react-redux'

import { Screen, ScreenContent } from 'app/components/core'
import { EndOfLineupNotice } from 'app/components/lineup/EndOfLineupNotice'
import { TrackLineup } from 'app/components/lineup/TrackLineup'
import { OnlineOnly } from 'app/components/offline-placeholder/OnlineOnly'
import { SuggestedFollows } from 'app/components/suggested-follows'
import { MobileRootHeader } from 'app/screens/app-screen/MobileRootHeader'

import { FeedFilterButton } from './FeedFilterButton'

const { getFeedFilter } = feedPageSelectors

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
  const feedFilter = useSelector(getFeedFilter)
  const { data: currentUserId } = useCurrentUserId()

  const feedArgs = useMemo(
    () => ({
      userId: currentUserId,
      filter: feedFilter,
      initialPageSize: FEED_INITIAL_PAGE_SIZE,
      loadMorePageSize: FEED_LOAD_MORE_PAGE_SIZE
    }),
    [feedFilter, currentUserId]
  )

  const {
    trackIds,
    isPending,
    isFetching,
    hasNextPage,
    loadNextPage,
    refetch
  } = useFeed(feedArgs)

  const querySource = useMemo(
    () => ({ queryKey: [...getFeedQueryKey(feedArgs)] as unknown[] }),
    [feedArgs]
  )

  return (
    <Screen
      url='Feed'
      header={() => (
        <MobileRootHeader title={messages.header} showDivider={false}>
          <OnlineOnly>
            <FeedFilterButton />
          </OnlineOnly>
        </MobileRootHeader>
      )}
    >
      <ScreenContent>
        <TrackLineup
          trackIds={trackIds}
          source='DISCOVER_FEED'
          querySource={querySource}
          isPending={isPending}
          isFetching={isFetching}
          hasNextPage={hasNextPage}
          loadNextPage={loadNextPage}
          pageSize={FEED_LOAD_MORE_PAGE_SIZE}
          initialPageSize={FEED_INITIAL_PAGE_SIZE}
          pullToRefresh
          refresh={() => {
            refetch()
          }}
          hideHeaderOnEmpty
          LineupEmptyComponent={<SuggestedFollows />}
          ListFooterComponent={
            <EndOfLineupNotice description={messages.endOfFeed} />
          }
        />
      </ScreenContent>
    </Screen>
  )
}
