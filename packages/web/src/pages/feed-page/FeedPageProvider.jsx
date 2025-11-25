import { PureComponent } from 'react'

import { useHasAccount } from '@audius/common/api'
import { useCurrentTrack } from '@audius/common/hooks'
import {
  lineupSelectors,
  feedPageLineupActions as feedActions,
  feedPageSelectors,
  feedPageActions as discoverPageAction,
  queueSelectors,
  playerSelectors
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import { connect } from 'react-redux'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'

import { HistoryContext } from 'app/HistoryProvider'
import { openSignOn } from 'common/store/pages/signon/actions'
import { useIsMobile } from 'hooks/useIsMobile'
import { getPathname } from 'utils/route'
const { TRENDING_PAGE } = route
const { getSource } = queueSelectors
const { getPlaying, getBuffering, getUid } = playerSelectors
const { getDiscoverFeedLineup, getFeedFilter } = feedPageSelectors
const { makeGetLineupMetadatas } = lineupSelectors

const messages = {
  feedTitle: 'Feed',
  feedDescription: 'Listen to what people you follow are sharing'
}

/**
 *  FeedPageProvider encapsulates the buisness logic
 *  around a connected FeedPage, injecting props into
 *  children as `FeedPageContentProps`.
 */
class FeedPageProvider extends PureComponent {
  static contextType = HistoryContext

  goToTrending = () => {
    this.props.goToRoute(TRENDING_PAGE)
  }

  goToSignUp = () => {
    this.props.openSignOn(false)
  }

  matchesRoute = (route) => {
    return matchPath(route, getPathname(this.props.location))
  }

  componentWillUnmount() {
    // Only reset to if we're not on mobile (mobile should
    // preserve the current tab + state) or there was no
    // account (because the lineups could contain stale content).
    if (!this.props.isMobile || !this.props.hasAccount) {
      this.props.resetFeedLineup()
    }
  }

  getLineupProps = (lineup) => {
    const {
      playing,
      buffering,
      uid: playingUid,
      source,
      currentTrack
    } = this.props
    return {
      lineup,
      playingUid,
      playingSource: source,
      playingTrackId: currentTrack ? currentTrack.track_id : null,
      playing,
      buffering,
      scrollParent: this.props.containerRef,
      selfLoad: true
    }
  }

  render() {
    const childProps = {
      feedTitle: messages.feedTitle,
      feedDescription: messages.feedDescription,
      feedIsMain: this.props.feedIsMain,
      feed: this.props.feed,

      refreshFeedInView: this.props.refreshFeedInView,
      hasAccount: this.props.hasAccount,
      goToSignUp: this.goToSignUp,
      goToGenreSelection: this.goToGenreSelection,
      setFeedInView: this.props.setFeedInView,
      loadMoreFeed: this.props.loadMoreFeed,
      playFeedTrack: this.props.playFeedTrack,
      pauseFeedTrack: this.props.pauseFeedTrack,
      switchView: this.switchView,
      getLineupProps: this.getLineupProps,
      setFeedFilter: this.props.setFeedFilter,
      feedFilter: this.props.feedFilter,
      resetFeedLineup: this.props.resetFeedLineup,

      makeLoadMore: this.props.makeLoadMore,
      makePlayTrack: this.props.makePlayTrack,
      makePauseTrack: this.props.makePauseTrack,
      makeSetInView: this.props.makeSetInView
    }

    return <this.props.children {...childProps} />
  }
}

const makeMapStateToProps = () => {
  const getFeedLineup = makeGetLineupMetadatas(getDiscoverFeedLineup)

  const mapStateToProps = (state) => ({
    feed: getFeedLineup(state),
    source: getSource(state),
    uid: getUid(state),
    playing: getPlaying(state),
    buffering: getBuffering(state),
    feedFilter: getFeedFilter(state)
  })
  return mapStateToProps
}

const mapDispatchToProps = (dispatch) => ({
  dispatch,
  openSignOn: (signIn) => dispatch(openSignOn(signIn)),
  resetFeedLineup: () => dispatch(feedActions.reset()),
  setFeedFilter: (filter) => dispatch(discoverPageAction.setFeedFilter(filter)),

  // Feed Lineup Actions
  setFeedInView: (inView) => dispatch(feedActions.setInView(inView)),
  loadMoreFeed: (offset, limit, overwrite) => {
    dispatch(feedActions.fetchLineupMetadatas(offset, limit, overwrite))
  },
  refreshFeedInView: (overwrite, limit) =>
    dispatch(feedActions.refreshInView(overwrite, null, limit)),
  playFeedTrack: (uid) => dispatch(feedActions.play(uid)),
  pauseFeedTrack: () => dispatch(feedActions.pause())
})

const FeedPageProviderWrapper = (props) => {
  const isMobile = useIsMobile()
  const currentTrack = useCurrentTrack()
  const hasAccount = useHasAccount()
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <FeedPageProvider
      isMobile={isMobile}
      currentTrack={currentTrack}
      hasAccount={hasAccount}
      location={location}
      goToRoute={(route) => navigate(route)}
      replaceRoute={(route) => navigate(route, { replace: true })}
      {...props}
    />
  )
}

export default connect(
  makeMapStateToProps,
  mapDispatchToProps
)(FeedPageProviderWrapper)
