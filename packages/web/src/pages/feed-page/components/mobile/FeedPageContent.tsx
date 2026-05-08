import { useContext, useEffect, useMemo } from 'react'

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
import { route } from '@audius/common/utils'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import { make, useRecord } from 'common/store/analytics/actions'
import Header from 'components/header/mobile/Header'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import { TrackLineup } from 'components/lineup/TrackLineup'
import { LineupVariant } from 'components/lineup/types'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import { useMainPageHeader } from 'components/nav/mobile/NavContext'
import EmptyFeed from 'pages/feed-page/components/EmptyFeed'
import { BASE_URL } from 'utils/route'

import Filters from './FeedFilterButton'
import FeedFilterDrawer from './FeedFilterDrawer'
import styles from './FeedPageContent.module.css'

const { FEED_PAGE } = route

const messages = {
  title: 'Your Feed',
  feedTitle: 'Feed',
  feedDescription: 'Listen to what people you follow are sharing'
}

const { getFeedFilter } = feedPageSelectors

type FeedPageMobileContentProps = {
  containerRef?: React.RefObject<HTMLDivElement>
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

  const { setHeader } = useContext(HeaderContext)
  const [modalIsOpen, setModalIsOpen] = useModalState('FeedFilter')

  useEffect(() => {
    setHeader(
      <Header title={messages.title} className={styles.header}>
        <Filters
          currentFilter={feedFilter}
          didOpenModal={() => {
            setModalIsOpen(true)
          }}
          showIcon={false}
        />
      </Header>
    )
  }, [setHeader, feedFilter, setModalIsOpen])

  // Set Nav-Bar Menu
  useMainPageHeader()

  const record = useRecord()
  const handleSelectFilter = (filter: FeedFilter) => {
    setModalIsOpen(false)
    dispatch(discoverPageAction.setFeedFilter(filter))
    record(make(Name.FEED_CHANGE_VIEW, { view: filter }))
  }

  return (
    <MobilePageContainer
      title={messages.feedTitle}
      description={messages.feedDescription}
      canonicalUrl={`${BASE_URL}${FEED_PAGE}`}
      hasDefaultHeader
    >
      <FeedFilterDrawer
        isOpen={modalIsOpen}
        onSelectFilter={handleSelectFilter}
        onClose={() => setModalIsOpen(false)}
      />
      <div
        className={cn(styles.lineupContainer, {
          [styles.playing]: trackIds.length > 0
        })}
      >
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
          ordered
          variant={LineupVariant.MAIN}
          scrollParent={containerRef?.current ?? null}
          emptyElement={<EmptyFeed />}
        />
      </div>
    </MobilePageContainer>
  )
}

export default FeedPageMobileContent
