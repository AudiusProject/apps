import { useMemo, useRef } from 'react'

import {
  getFeedQueryKey,
  FEED_INITIAL_PAGE_SIZE,
  FEED_LOAD_MORE_PAGE_SIZE,
  useCurrentUserId,
  useFeed
} from '@audius/common/api'
import { Name, FeedFilter } from '@audius/common/models'
import {
  feedPageSelectors,
  feedPageActions as discoverPageAction
} from '@audius/common/store'
import { FilterButton, Flex, IconFeed } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import { MIN_DESKTOP_CONTENT_WIDTH_PX } from 'common/utils/layout'
import { Header } from 'components/header/desktop/Header'
import EndOfLineup from 'components/lineup/EndOfLineup'
import { TrackLineup } from 'components/lineup/TrackLineup'
import { LineupVariant } from 'components/lineup/types'
import Page from 'components/page/Page'
import { useIsContainerNarrow } from 'hooks/useIsContainerNarrow'
import EmptyFeed from 'pages/feed-page/components/EmptyFeed'

import { FeedFilters } from './FeedFilters'

const messages = {
  feedHeaderTitle: 'Feed',
  feedTitle: 'Feed',
  feedDescription: 'Listen to what people you follow are sharing'
}

const { getFeedFilter } = feedPageSelectors

type FeedPageContentProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

const feedFilterOptions = [
  { label: 'All Posts', value: FeedFilter.ALL },
  { label: 'Original Posts', value: FeedFilter.ORIGINAL },
  { label: 'Reposts', value: FeedFilter.REPOST }
]

// Note: the feed API returns both tracks and collections (playlist reposts).
// The new TrackLineup renders tracks only, so collections are filtered out by
// `trackIds` on the hook side. This is a known limitation introduced by the
// tanquery migration — collection feed rendering will be restored if/when
// TrackLineup learns to render mixed feeds.
const FeedPageContent = ({ containerRef }: FeedPageContentProps) => {
  const dispatch = useDispatch()
  const titleRowRef = useRef<HTMLDivElement>(null)
  const isCondensedHeader = useIsContainerNarrow(titleRowRef, 560)
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
    isError,
    hasNextPage,
    loadNextPage
  } = useFeed(feedArgs)

  const querySource = useMemo(
    () => ({ queryKey: [...getFeedQueryKey(feedArgs)] as unknown[] }),
    [feedArgs]
  )

  const record = useRecord()

  const didSelectFilter = (filter: FeedFilter) => {
    if (containerRef?.current?.scrollTo) {
      containerRef.current.scrollTo(0, 0)
    }
    dispatch(discoverPageAction.setFeedFilter(filter))
    record(make(Name.FEED_CHANGE_VIEW, { view: filter }))
  }

  const header = (
    <Header
      titleRowRef={titleRowRef}
      icon={IconFeed}
      primary={messages.feedHeaderTitle}
      rightDecorator={
        isCondensedHeader ? (
          <FilterButton
            label='All Posts'
            value={feedFilter}
            variant='replaceLabel'
            onChange={(value) => didSelectFilter(value as FeedFilter)}
            options={feedFilterOptions}
          />
        ) : (
          <FeedFilters
            currentFilter={feedFilter}
            didSelectFilter={didSelectFilter}
          />
        )
      }
    />
  )

  return (
    <Page
      title={messages.feedTitle}
      description={messages.feedDescription}
      size='large'
      header={header}
    >
      <Flex w='100%' css={{ minWidth: MIN_DESKTOP_CONTENT_WIDTH_PX }}>
        <TrackLineup
          key={`feed-${feedFilter}`}
          aria-label='feed'
          trackIds={trackIds}
          source='DISCOVER_FEED'
          querySource={querySource}
          isPending={isPending}
          isFetching={isFetching}
          isError={isError}
          hasNextPage={hasNextPage}
          loadNextPage={loadNextPage}
          pageSize={FEED_LOAD_MORE_PAGE_SIZE}
          initialPageSize={FEED_INITIAL_PAGE_SIZE}
          variant={LineupVariant.MAIN}
          scrollParent={containerRef?.current ?? null}
          emptyElement={<EmptyFeed />}
          endOfLineupElement={<EndOfLineup />}
        />
      </Flex>
    </Page>
  )
}

export default FeedPageContent
