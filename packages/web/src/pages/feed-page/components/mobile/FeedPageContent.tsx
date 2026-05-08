import { useContext, useEffect, useMemo } from 'react'

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
import { route } from '@audius/common/utils'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import Header from 'components/header/mobile/Header'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import { TrackLineup } from 'components/lineup/TrackLineup'
import { LineupVariant } from 'components/lineup/types'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import { useMainPageHeader } from 'components/nav/mobile/NavContext'
import EmptyFeed from 'pages/feed-page/components/EmptyFeed'
import { FeedTabs } from 'pages/feed-page/components/FeedTabs'
import { BASE_URL } from 'utils/route'

import styles from './FeedPageContent.module.css'

const { FEED_PAGE } = route

const messages = {
  title: 'Your Feed',
  feedTitle: 'Feed',
  feedDescription: 'Listen to what people you follow are sharing'
}

const { getFeedTab } = feedPageSelectors

type FeedPageMobileContentProps = {
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
const FeedPageMobileContent = ({
  containerRef
}: FeedPageMobileContentProps) => {
  const dispatch = useDispatch()
  const feedTab = useSelector(getFeedTab)
  const { data: currentUserId } = useCurrentUserId()

  const isForYou = feedTab === FeedTab.FOR_YOU
  const followingFilter = isForYou
    ? FeedFilter.ALL
    : tabToFilter[feedTab as Exclude<FeedTab, FeedTab.FOR_YOU>]

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
  const handleSelectTab = (tab: FeedTab) => {
    dispatch(discoverPageAction.setFeedTab(tab))
    record(make(Name.FEED_CHANGE_VIEW, { view: tab }))
  }

  useEffect(() => {
    setHeader(
      <Header title={messages.title} className={styles.header}>
        <FeedTabs currentTab={feedTab} onSelectTab={handleSelectTab} />
      </Header>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeader, feedTab])

  // Set Nav-Bar Menu
  useMainPageHeader()

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
