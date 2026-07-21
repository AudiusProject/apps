import { useCallback, useContext, useEffect, useMemo } from 'react'

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
import { Name, FeedTab, type FeedFilter } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { Flex } from '@audius/harmony'
import cn from 'classnames'

import { make, useRecord } from 'common/store/analytics/actions'
import Header from 'components/header/mobile/Header'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import { TrackLineup } from 'components/lineup/TrackLineup'
import { LineupVariant } from 'components/lineup/types'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import { useMainPageHeader } from 'components/nav/mobile/NavContext'
import EmptyFeed from 'pages/feed-page/components/EmptyFeed'
import { FeedFilters } from 'pages/feed-page/components/FeedFilters'
import { FeedTabs } from 'pages/feed-page/components/FeedTabs'
import { BASE_URL } from 'utils/route'

import styles from './FeedPageContent.module.css'

const { FEED_PAGE } = route

const messages = {
  title: 'Your Feed',
  feedTitle: 'Feed',
  feedDescription: 'Listen to what people you follow are sharing'
}

type FeedPageMobileContentProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

const FeedPageMobileContent = ({
  containerRef
}: FeedPageMobileContentProps) => {
  const [feedTab, setFeedTab] = useFeedTab()
  const [feedFilter, setFeedFilter] = useFeedFilter()
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

  const { setHeader } = useContext(HeaderContext)

  const record = useRecord()
  const handleSelectTab = useCallback(
    (tab: FeedTab) => {
      setFeedTab(tab)
      record(make(Name.FEED_CHANGE_VIEW, { view: tab }))
    },
    [setFeedTab, record]
  )

  const handleSelectFilter = useCallback(
    (filter: FeedFilter) => {
      setFeedFilter(filter)
      record(make(Name.FEED_CHANGE_VIEW, { view: filter }))
    },
    [setFeedFilter, record]
  )

  useEffect(() => {
    setHeader(
      <Header title={messages.title} className={styles.header}>
        <Flex
          w='100%'
          gap='s'
          alignItems='center'
          justifyContent='space-between'
        >
          <FeedTabs currentTab={feedTab} onSelectTab={handleSelectTab} />
          {isForYou ? null : (
            <FeedFilters
              currentFilter={feedFilter}
              onSelectFilter={handleSelectFilter}
            />
          )}
        </Flex>
      </Header>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeader, feedTab, feedFilter, isForYou])

  // Set Nav-Bar Menu
  useMainPageHeader()

  const lineupProps = isForYou
    ? {
        trackIds: forYouFeed.trackIds,
        lineupItems: forYouFeed.data,
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
        lineupItems: followFeed.data,
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
    <MobilePageContainer
      title={messages.feedTitle}
      description={messages.feedDescription}
      canonicalUrl={`${BASE_URL}${FEED_PAGE}`}
      hasDefaultHeader
    >
      <div
        className={cn(styles.lineupContainer, {
          [styles.playing]: lineupProps.trackIds.length > 0
        })}
      >
        <TrackLineup
          key={`feed-${feedTab}`}
          aria-label='feed'
          source='DISCOVER_FEED'
          feedType={feedTab}
          ordered
          variant={LineupVariant.MAIN}
          scrollParent={containerRef?.current ?? null}
          emptyElement={<EmptyFeed />}
          {...lineupProps}
        />
      </div>
    </MobilePageContainer>
  )
}

export default FeedPageMobileContent
