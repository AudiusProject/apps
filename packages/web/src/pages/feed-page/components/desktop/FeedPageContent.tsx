import { useCallback, useMemo, useRef } from 'react'

import {
  getFeedQueryKey,
  FEED_INITIAL_PAGE_SIZE,
  useCurrentUserId,
  useFeed,
  useFeedFilter,
  useFeedTab,
  useForYouFeed,
  FOR_YOU_INITIAL_PAGE_SIZE
} from '@audius/common/api'
import { Name, FeedTab, type FeedFilter } from '@audius/common/models'
import { Flex, IconFeed } from '@audius/harmony'

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

type FeedPageContentProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

const FeedPageContent = ({ containerRef }: FeedPageContentProps) => {
  const titleRowRef = useRef<HTMLDivElement>(null)
  const [feedTab, setFeedTab] = useFeedTab()
  const [feedFilter, setFeedFilter] = useFeedFilter()
  const { data: currentUserId } = useCurrentUserId()

  // Desktop viewports + fast trackpad / wheel scroll need bigger pages than
  // the shared default (mobile-tuned) so successive load-mores keep up with a
  // user scrolling deep into the lineup.
  const desktopLoadMorePageSize = 10

  const isForYou = feedTab === FeedTab.FOR_YOU

  // Latest lineup. Disabled while For You is active.
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
      setFeedTab(tab)
      record(make(Name.FEED_CHANGE_VIEW, { view: tab }))
    },
    [containerRef, setFeedTab, record]
  )

  const onSelectFilter = useCallback(
    (filter: FeedFilter) => {
      setFeedFilter(filter)
      record(make(Name.FEED_CHANGE_VIEW, { view: filter }))
    },
    [setFeedFilter, record]
  )

  const header = (
    <Header
      titleRowRef={titleRowRef}
      icon={IconFeed}
      primary={messages.feedHeaderTitle}
      bottomBar={
        <Flex
          w='100%'
          alignItems='center'
          justifyContent='space-between'
          gap='m'
          pb='l'
        >
          <FeedTabs currentTab={feedTab} onSelectTab={onSelectTab} />
          {isForYou ? null : (
            <FeedFilters
              currentFilter={feedFilter}
              onSelectFilter={onSelectFilter}
            />
          )}
        </Flex>
      }
    />
  )

  // Both feed hooks expose the mixed `LineupData[]` the API returns
  // (tracks + collection reposts). TrackLineup branches per entry, so
  // collections show up inline wherever the backend puts them.
  const lineupProps = isForYou
    ? {
        trackIds: forYouFeed.trackIds,
        lineupItems: forYouFeed.data,
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
        lineupItems: followFeed.data,
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
          feedType={feedTab}
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
