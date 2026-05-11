import { useCallback, useMemo, useRef } from 'react'

import {
  getFeedQueryKey,
  FEED_INITIAL_PAGE_SIZE,
  useCurrentUserId,
  useFeed,
  useForYouFeed,
  FOR_YOU_INITIAL_PAGE_SIZE
} from '@audius/common/api'
import { Name, FeedFilter, FeedTab } from '@audius/common/models'
import {
  feedPageSelectors,
  feedPageActions as discoverPageAction
} from '@audius/common/store'
import { Flex, IconFeed } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import { MIN_DESKTOP_CONTENT_WIDTH_PX } from 'common/utils/layout'
import { Header } from 'components/header/desktop/Header'
import EndOfLineup from 'components/lineup/EndOfLineup'
import { TrackLineup } from 'components/lineup/TrackLineup'
import { LineupVariant } from 'components/lineup/types'
import Page from 'components/page/Page'
import EmptyFeed from 'pages/feed-page/components/EmptyFeed'
import { FeedFilters } from 'pages/feed-page/components/FeedFilters'
import { FeedTabs } from 'pages/feed-page/components/FeedTabs'

const messages = {
  feedHeaderTitle: 'Your Feed',
  feedTitle: 'Feed',
  feedDescription: 'Listen to what people you follow are sharing'
}

const { getFeedTab, getFeedFilter } = feedPageSelectors

type FeedPageContentProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

// Note: the feed API returns both tracks and collections (playlist reposts).
// The new TrackLineup renders tracks only, so collections are filtered out by
// `trackIds` on the hook side. This is a known limitation introduced by the
// tanquery migration — collection feed rendering will be restored if/when
// TrackLineup learns to render mixed feeds.
const FeedPageContent = ({ containerRef }: FeedPageContentProps) => {
  const dispatch = useDispatch()
  const titleRowRef = useRef<HTMLDivElement>(null)
  const persistedTab = useSelector(getFeedTab)
  const feedFilter = useSelector(getFeedFilter)
  const { data: currentUserId } = useCurrentUserId()

  // Desktop viewports + fast trackpad / wheel scroll need bigger pages than
  // the shared default (mobile-tuned) so successive load-mores keep up with a
  // user scrolling deep into the lineup.
  const desktopLoadMorePageSize = 10

  // Coerce legacy persisted FeedTab values (FOLLOWING / UPLOADS_ONLY) to
  // CHRONOLOGICAL after the For You / Chronological refactor.
  const feedTab =
    persistedTab === FeedTab.FOR_YOU ? FeedTab.FOR_YOU : FeedTab.CHRONOLOGICAL
  const isForYou = feedTab === FeedTab.FOR_YOU

  // Chronological lineup. Disabled while For You is active.
  const feedArgs = useMemo(
    () => ({
      userId: currentUserId,
      filter: feedFilter,
      initialPageSize: FEED_INITIAL_PAGE_SIZE,
      loadMorePageSize: desktopLoadMorePageSize
    }),
    [feedFilter, currentUserId]
  )
  const followFeed = useFeed(feedArgs, { enabled: !isForYou })

  // For You lineup.
  const forYouFeed = useForYouFeed(
    {
      initialPageSize: FOR_YOU_INITIAL_PAGE_SIZE,
      loadMorePageSize: desktopLoadMorePageSize
    },
    { enabled: isForYou }
  )

  const followQuerySource = useMemo(
    () => ({ queryKey: [...getFeedQueryKey(feedArgs)] as unknown[] }),
    [feedArgs]
  )

  const record = useRecord()
  const onSelectTab = useCallback(
    (tab: FeedTab) => {
      if (containerRef?.current?.scrollTo) {
        containerRef.current.scrollTo(0, 0)
      }
      dispatch(discoverPageAction.setFeedTab(tab))
      record(make(Name.FEED_CHANGE_VIEW, { view: tab }))
    },
    [containerRef, dispatch, record]
  )

  const onSelectFilter = useCallback(
    (filter: FeedFilter) => {
      dispatch(discoverPageAction.setFeedFilter(filter))
      record(make(Name.FEED_CHANGE_VIEW, { view: filter }))
    },
    [dispatch, record]
  )

  const header = (
    <Header
      titleRowRef={titleRowRef}
      icon={IconFeed}
      primary={messages.feedHeaderTitle}
      rightDecorator={
        <FeedTabs currentTab={feedTab} onSelectTab={onSelectTab} />
      }
      bottomBar={
        isForYou ? null : (
          <FeedFilters
            currentFilter={feedFilter}
            onSelectFilter={onSelectFilter}
          />
        )
      }
    />
  )

  const lineupProps = isForYou
    ? {
        trackIds: forYouFeed.trackIds,
        isPending: forYouFeed.isPending,
        isFetching: forYouFeed.isFetching,
        isError: forYouFeed.isError,
        hasNextPage: forYouFeed.hasNextPage,
        loadNextPage: forYouFeed.loadNextPage,
        pageSize: desktopLoadMorePageSize,
        initialPageSize: FOR_YOU_INITIAL_PAGE_SIZE,
        querySource: undefined
      }
    : {
        trackIds: followFeed.trackIds,
        isPending: followFeed.isPending,
        isFetching: followFeed.isFetching,
        isError: followFeed.isError,
        hasNextPage: followFeed.hasNextPage,
        loadNextPage: followFeed.loadNextPage,
        pageSize: desktopLoadMorePageSize,
        initialPageSize: FEED_INITIAL_PAGE_SIZE,
        querySource: followQuerySource
      }

  return (
    <Page
      title={messages.feedTitle}
      description={messages.feedDescription}
      size='large'
      header={header}
    >
      <Flex w='100%' css={{ minWidth: MIN_DESKTOP_CONTENT_WIDTH_PX }}>
        <TrackLineup
          key={`feed-${feedTab}`}
          aria-label='feed'
          source='DISCOVER_FEED'
          variant={LineupVariant.MAIN}
          scrollParent={containerRef?.current ?? null}
          emptyElement={<EmptyFeed />}
          endOfLineupElement={<EndOfLineup />}
          {...lineupProps}
        />
      </Flex>
    </Page>
  )
}

export default FeedPageContent
