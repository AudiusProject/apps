import { useMemo, useRef } from 'react'

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
import { FeedTabs } from 'pages/feed-page/components/FeedTabs'

const messages = {
  feedHeaderTitle: 'Feed',
  feedTitle: 'Feed',
  feedDescription: 'Listen to what people you follow are sharing'
}

const { getFeedTab } = feedPageSelectors

type FeedPageContentProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

const tabToFilter: Record<Exclude<FeedTab, FeedTab.FOR_YOU>, FeedFilter> = {
  [FeedTab.FOLLOWING]: FeedFilter.ALL,
  [FeedTab.UPLOADS_ONLY]: FeedFilter.ORIGINAL
}

// Note: the feed API returns both tracks and collections (playlist reposts).
// The new TrackLineup renders tracks only, so collections are filtered out by
// `trackIds` on the hook side. This is a known limitation introduced by the
// tanquery migration — collection feed rendering will be restored if/when
// TrackLineup learns to render mixed feeds.
const FeedPageContent = ({ containerRef }: FeedPageContentProps) => {
  const dispatch = useDispatch()
  const titleRowRef = useRef<HTMLDivElement>(null)
  const feedTab = useSelector(getFeedTab)
  const { data: currentUserId } = useCurrentUserId()

  const isForYou = feedTab === FeedTab.FOR_YOU
  const followingFilter = isForYou
    ? FeedFilter.ALL
    : tabToFilter[feedTab as Exclude<FeedTab, FeedTab.FOR_YOU>]

  // Following / Uploads-Only lineup. Disabled while For You is active.
  const feedArgs = useMemo(
    () => ({
      userId: currentUserId,
      filter: followingFilter,
      initialPageSize: FEED_INITIAL_PAGE_SIZE,
      loadMorePageSize: FEED_LOAD_MORE_PAGE_SIZE
    }),
    [followingFilter, currentUserId]
  )
  const followFeed = useFeed(feedArgs, { enabled: !isForYou })

  // For You lineup.
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

  const record = useRecord()
  const onSelectTab = (tab: FeedTab) => {
    if (containerRef?.current?.scrollTo) {
      containerRef.current.scrollTo(0, 0)
    }
    dispatch(discoverPageAction.setFeedTab(tab))
    record(make(Name.FEED_CHANGE_VIEW, { view: tab }))
  }

  const header = (
    <Header
      titleRowRef={titleRowRef}
      icon={IconFeed}
      primary={messages.feedHeaderTitle}
      rightDecorator={
        <FeedTabs currentTab={feedTab} onSelectTab={onSelectTab} />
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
        pageSize: FOR_YOU_LOAD_MORE_PAGE_SIZE,
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
        pageSize: FEED_LOAD_MORE_PAGE_SIZE,
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
