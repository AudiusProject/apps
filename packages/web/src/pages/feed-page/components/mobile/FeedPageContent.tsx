import { useContext, useEffect, useRef } from 'react'

import { useHasAccount } from '@audius/common/api'
import { useCurrentTrack } from '@audius/common/hooks'
import { Name, FeedFilter } from '@audius/common/models'
import {
  lineupSelectors,
  feedPageLineupActions as feedActions,
  feedPageSelectors,
  feedPageActions as discoverPageAction,
  queueSelectors,
  playerSelectors
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import { make, useRecord } from 'common/store/analytics/actions'
import Header from 'components/header/mobile/Header'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import Lineup from 'components/lineup/Lineup'
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

const { getSource, getUid } = queueSelectors
const { getPlaying, getBuffering } = playerSelectors
const { getDiscoverFeedLineup, getFeedFilter } = feedPageSelectors
const { makeGetLineupMetadatas } = lineupSelectors

type FeedPageMobileContentProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

const FeedPageMobileContent = ({
  containerRef
}: FeedPageMobileContentProps) => {
  const dispatch = useDispatch()
  const currentTrack = useCurrentTrack()
  const hasAccount = useHasAccount()

  const getFeedLineup = useRef(
    makeGetLineupMetadatas(getDiscoverFeedLineup)
  ).current
  const feed = useSelector((state: any) => getFeedLineup(state))
  const source = useSelector(getSource)
  const uid = useSelector(getUid)
  const playing = useSelector(getPlaying)
  const buffering = useSelector(getBuffering)
  const feedFilter = useSelector(getFeedFilter)

  // Cleanup on unmount - only reset if there was no account (because the lineups could contain stale content)
  useEffect(() => {
    return () => {
      if (!hasAccount) {
        dispatch(feedActions.reset())
      }
    }
  }, [dispatch, hasAccount])

  const getLineupProps = (lineup: any) => {
    return {
      lineup,
      playingUid: uid,
      playingSource: source ?? '',
      playingTrackId: currentTrack?.track_id ?? null,
      playing,
      buffering,
      scrollParent: containerRef?.current ?? null,
      selfLoad: true
    }
  }

  const setFeedInView = (inView: boolean) => {
    dispatch(feedActions.setInView(inView))
  }

  const loadMoreFeed = (offset: number, limit: number, overwrite: boolean) => {
    dispatch(feedActions.fetchLineupMetadatas(offset, limit, overwrite))
  }

  const playFeedTrack = (uid: string) => {
    dispatch(feedActions.play(uid))
  }

  const pauseFeedTrack = () => {
    dispatch(feedActions.pause())
  }

  const setFeedFilter = (filter: FeedFilter) => {
    dispatch(discoverPageAction.setFeedFilter(filter))
  }

  const resetFeedLineup = () => {
    dispatch(feedActions.reset())
  }

  const refreshFeedInView = (overwrite: boolean, limit?: number) => {
    dispatch(feedActions.refreshInView(overwrite, null, limit))
  }
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
          [styles.playing]: !!lineupProps.playingUid
        })}
      >
        <Lineup {...lineupProps} emptyElement={<EmptyFeed />} />
      </div>
    </MobilePageContainer>
  )
}

export default FeedPageMobileContent
