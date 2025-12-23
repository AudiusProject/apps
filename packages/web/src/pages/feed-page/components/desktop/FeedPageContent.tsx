import { useEffect, useRef } from 'react'

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
import { IconFeed } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import { Header } from 'components/header/desktop/Header'
import EndOfLineup from 'components/lineup/EndOfLineup'
import Lineup from 'components/lineup/Lineup'
import {
  getLoadMoreTrackCount,
  INITIAL_LOAD_TRACKS_MULTIPLIER
} from 'components/lineup/LineupProvider'
import { LineupVariant } from 'components/lineup/types'
import Page from 'components/page/Page'
import EmptyFeed from 'pages/feed-page/components/EmptyFeed'

import { FeedFilters } from './FeedFilters'

const messages = {
  feedHeaderTitle: 'Your Feed',
  feedTitle: 'Feed',
  feedDescription: 'Listen to what people you follow are sharing'
}

const { getSource, getUid } = queueSelectors
const { getPlaying, getBuffering } = playerSelectors
const { getDiscoverFeedLineup, getFeedFilter } = feedPageSelectors
const { makeGetLineupMetadatas } = lineupSelectors

type FeedPageContentProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

const FeedPageContent = ({ containerRef }: FeedPageContentProps) => {
  const dispatch = useDispatch()
  const currentTrack = useCurrentTrack()

  const getFeedLineup = useRef(
    makeGetLineupMetadatas(getDiscoverFeedLineup)
  ).current
  const feed = useSelector((state: any) => getFeedLineup(state))
  const source = useSelector(getSource)
  const uid = useSelector(getUid)
  const playing = useSelector(getPlaying)
  const buffering = useSelector(getBuffering)
  const feedFilter = useSelector(getFeedFilter)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(feedActions.reset())
    }
  }, [dispatch])

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
  const mainLineupProps = {
    variant: LineupVariant.MAIN
  }

  const feedLineupProps = {
    ...getLineupProps(feed),
    setInView: setFeedInView,
    loadMore: loadMoreFeed,
    playTrack: playFeedTrack,
    pauseTrack: pauseFeedTrack,
    delineate: false,
    actions: feedActions
  }
  const record = useRecord()

  const didSelectFilter = (filter: FeedFilter) => {
    if (feedLineupProps.scrollParent && feedLineupProps.scrollParent.scrollTo) {
      feedLineupProps.scrollParent.scrollTo(0, 0)
    }
    setFeedFilter(filter)
    resetFeedLineup()
    const fetchLimit = getLoadMoreTrackCount(
      mainLineupProps.variant,
      INITIAL_LOAD_TRACKS_MULTIPLIER
    )
    const fetchOffset = 0
    loadMoreFeed(fetchOffset, fetchLimit, true)
    record(make(Name.FEED_CHANGE_VIEW, { view: filter }))
  }

  const header = (
    <Header
      icon={IconFeed}
      primary={messages.feedHeaderTitle}
      rightDecorator={
        <FeedFilters
          currentFilter={feedFilter}
          didSelectFilter={didSelectFilter}
        />
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
      <Lineup
        emptyElement={<EmptyFeed />}
        endOfLineup={<EndOfLineup />}
        {...feedLineupProps}
        {...mainLineupProps}
      />
    </Page>
  )
}

export default FeedPageContent
