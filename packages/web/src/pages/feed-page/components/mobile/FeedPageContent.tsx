import { useContext, useEffect } from 'react'

import { Name, FeedFilter } from '@audius/common/models'
import { feedPageLineupActions as feedActions } from '@audius/common/store'
import { route } from '@audius/common/utils'
import cn from 'classnames'

import { useModalState } from 'common/hooks/useModalState'
import { make, useRecord } from 'common/store/analytics/actions'
import Header from 'components/header/mobile/Header'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import Lineup from 'components/lineup/Lineup'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import { useMainPageHeader } from 'components/nav/mobile/NavContext'
import EmptyFeed from 'pages/feed-page/components/EmptyFeed'
import { FeedPageContentProps } from 'pages/feed-page/types'
import { BASE_URL } from 'utils/route'

import Filters from './FeedFilterButton'
import FeedFilterDrawer from './FeedFilterDrawer'
import styles from './FeedPageContent.module.css'

const { FEED_PAGE } = route

const messages = {
  title: 'Your Feed'
}

const FeedPageMobileContent = ({
  feedTitle,
  feedDescription,
  feed,
  setFeedInView,
  loadMoreFeed,
  playFeedTrack,
  pauseFeedTrack,
  getLineupProps,
  feedFilter,
  setFeedFilter,
  refreshFeedInView,
  resetFeedLineup
}: FeedPageContentProps) => {
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

  const lineupProps = {
    ordered: true,
    ...getLineupProps(feed),
    loadMore: (offset: number, limit: number, overwrite: boolean) =>
      loadMoreFeed(offset, limit, overwrite),
    setInView: setFeedInView,
    playTrack: playFeedTrack,
    pauseTrack: pauseFeedTrack,
    actions: feedActions,
    delineate: true
  }

  const record = useRecord()
  const handleSelectFilter = (filter: FeedFilter) => {
    setModalIsOpen(false)
    setFeedFilter(filter)
    // Clear the lineup
    resetFeedLineup()
    // Tell the store that the feed is still in view so it can be refetched
    setFeedInView(true)
    // Force a refresh for at least 10 tiles
    refreshFeedInView(true, 10)
    record(make(Name.FEED_CHANGE_VIEW, { view: filter }))
  }

  return (
    <MobilePageContainer
      title={feedTitle}
      description={feedDescription}
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
          [styles.playing]: !!lineupProps.playingUid
        })}
      >
        <Lineup {...lineupProps} emptyElement={<EmptyFeed />} />
      </div>
    </MobilePageContainer>
  )
}

export default FeedPageMobileContent
