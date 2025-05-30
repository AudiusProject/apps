import { Component, ComponentType } from 'react'

import { useTrackByParams } from '@audius/common/api'
import {
  Name,
  ShareSource,
  RepostSource,
  FollowSource,
  PlaybackSource,
  FavoriteType,
  PlayableType,
  Status,
  ID,
  Track
} from '@audius/common/models'
import {
  accountSelectors,
  cacheTracksActions as cacheTrackActions,
  lineupSelectors,
  trackPageLineupActions,
  trackPageActions,
  trackPageSelectors,
  queueSelectors,
  tracksSocialActions as socialTracksActions,
  usersSocialActions as socialUsersActions,
  mobileOverflowMenuUIActions,
  shareModalUIActions,
  OverflowAction,
  OverflowSource,
  repostsUserListActions,
  favoritesUserListActions,
  RepostType,
  playerSelectors,
  playerActions
} from '@audius/common/store'
import { formatDate, route } from '@audius/common/utils'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'

import { TrackEvent, make } from 'common/store/analytics/actions'
import * as unfollowConfirmationActions from 'components/unfollow-confirmation-modal/store/actions'
import DeletedPage from 'pages/deleted-page/DeletedPage'
import { SsrContext } from 'ssr/SsrContext'
import { getLocationPathname } from 'store/routing/selectors'
import { AppState } from 'store/types'
import { push, replace } from 'utils/navigation'
import { trackRemixesPage } from 'utils/route'
import { parseTrackRoute, TrackRouteParams } from 'utils/route/trackRouteParser'
import { getTrackPageSEOFields } from 'utils/seo'

import { OwnProps as DesktopTrackPageProps } from './components/desktop/TrackPage'
import { OwnProps as MobileTrackPageProps } from './components/mobile/TrackPage'

const {
  profilePage,
  NOT_FOUND_PAGE,
  FEED_PAGE,
  FAVORITING_USERS_ROUTE,
  REPOSTING_USERS_ROUTE
} = route
const { makeGetCurrent } = queueSelectors
const { getPlaying, getPreviewing } = playerSelectors
const { setFavorite } = favoritesUserListActions
const { setRepost } = repostsUserListActions
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { open } = mobileOverflowMenuUIActions
const { tracksActions } = trackPageLineupActions
const {
  getUser,
  getLineup,
  getRemixParentTrack,
  getStatus,
  getSourceSelector,
  getTrackPermalink
} = trackPageSelectors
const { makeGetLineupMetadatas } = lineupSelectors
const getUserId = accountSelectors.getUserId

const getRemixParentTrackId = (track: Track | null) =>
  track?.remix_of?.tracks?.[0]?.parent_track_id

type OwnProps = {
  children:
    | ComponentType<MobileTrackPageProps>
    | ComponentType<DesktopTrackPageProps>
}

type mapStateProps = ReturnType<typeof makeMapStateToProps>
type TrackPageProviderProps = OwnProps &
  ReturnType<mapStateProps> &
  ReturnType<typeof mapDispatchToProps>

type TrackPageProviderState = {
  pathname: string
  ownerHandle: string | null
  showDeleteConfirmation: boolean
  routeKey: ID
  source: string | undefined
}

const TrackPageProviderWrapper = (props: TrackPageProviderProps) => {
  const params = parseTrackRoute(props.pathname)
  const { data: track } = useTrackByParams(params)

  return <TrackPageProviderClass {...props} track={track as Track | null} />
}

class TrackPageProviderClass extends Component<
  TrackPageProviderProps & { track: Track | null },
  TrackPageProviderState
> {
  static contextType = SsrContext
  declare context: React.ContextType<typeof SsrContext>
  state: TrackPageProviderState = {
    pathname: this.props.pathname,
    ownerHandle: null,
    showDeleteConfirmation: false,
    routeKey: parseTrackRoute(this.props.pathname)?.trackId ?? 0,
    source: undefined
  }

  componentDidMount() {
    const params = parseTrackRoute(this.props.pathname)
    // Go to 404 if the track id isn't parsed correctly or if should redirect
    if (!params || (params.trackId && shouldRedirectTrack(params.trackId))) {
      if (this.props.pathname !== '/signup')
        this.props.goToRoute(NOT_FOUND_PAGE)
      return
    }

    this.props.reset()
    // Only fetch lineup data since track data is handled by the hook
    if (params.trackId) {
      this.props.setTrackId(params.trackId)
    } else if (params.slug && params.handle) {
      this.props.setTrackPermalink(`/${params.handle}/${params.slug}`)
    }
    if (params.handle) {
      this.setState({ ownerHandle: params.handle })
    }
  }

  componentDidUpdate(
    prevProps: TrackPageProviderProps & { track: Track | null }
  ) {
    const {
      pathname,
      track,
      status,
      refetchTracksLinup,
      user,
      trackPermalink
    } = this.props
    if (status === Status.ERROR) {
      this.props.goToRoute(NOT_FOUND_PAGE)
    }
    if (user && user.is_deactivated) {
      this.goToProfilePage(user.handle)
    }
    if (!this.context.isMobile) {
      // On componentDidUpdate we try to reparse the URL because if you're on a track page
      // and go to another track page, the component doesn't remount but we need to
      // trigger a re-fetch based on the URL. On mobile, separate page provider components are
      // used so this is a non-issue.
      if (pathname !== this.state.pathname) {
        const params = parseTrackRoute(pathname)
        if (params) {
          this.setState({ pathname })
          this.props.reset()
          // Track data is handled by the hook
          if (params.trackId) {
            this.props.setTrackId(params.trackId)
          } else if (params.slug && params.handle) {
            this.props.setTrackPermalink(`/${params.handle}/${params.slug}`)
          }
          if (params.handle) {
            this.setState({ ownerHandle: params.handle })
          }
        }
      }
    }

    // Set the lineup source in state once it's set in redux
    if (!this.state.source && this.state.routeKey === track?.track_id) {
      this.setState({ source: this.props.source })
    }

    // If the remix of this track changed and we have
    // already fetched the track, refetch the entire lineup
    // because the remix parent track needs to be retrieved
    if (
      prevProps.track &&
      prevProps.track.track_id &&
      track &&
      track.track_id &&
      getRemixParentTrackId(prevProps.track) !== getRemixParentTrackId(track)
    ) {
      refetchTracksLinup()
    }

    if (track) {
      const params = parseTrackRoute(pathname)
      if (params) {
        // Check if we are coming from a non-canonical route and replace route if necessary.
        const { slug, handle } = params
        if (slug === null || handle === null) {
          if (track.permalink) {
            this.props.replaceRoute(track.permalink)
          }
        } else {
          // Reroute to the most recent permalink if necessary in case user edits the track
          // name, which changes the permalink
          if (
            pathname === this.state.pathname &&
            prevProps.track?.track_id === track?.track_id &&
            trackPermalink &&
            trackPermalink !== pathname
          ) {
            // The path is going to change but don't re-fetch as we already have the track
            this.setState({ pathname: trackPermalink })
            this.props.replaceRoute(trackPermalink)
          }
        }
      }
    }
  }

  componentWillUnmount() {
    if (!this.context.isMobile) {
      // Don't reset on mobile because there are two
      // track pages mounted at a time due to animations.
      this.props.resetTrackPage()
    }
  }

  fetchTracks = (params: NonNullable<TrackRouteParams>) => {
    const { track } = this.props
    const { slug, trackId, handle } = params

    // Go to feed if the track is deleted
    if (track && track.track_id === trackId) {
      if (track._marked_deleted) {
        this.props.goToRoute(FEED_PAGE)
        return
      }
    }
    this.props.reset()
    if (trackId) {
      this.props.setTrackId(trackId)
    }
    if (slug && handle) {
      this.props.setTrackPermalink(`/${handle}/${slug}`)
    }
    if (handle) {
      this.setState({ ownerHandle: handle })
    }
  }

  onHeroPlay = ({
    isPlaying,
    isPreview = false
  }: {
    isPlaying: boolean
    isPreview?: boolean
  }) => {
    const {
      play,
      pause,
      stop,
      previewing,
      currentQueueItem,
      moreByArtist: { entries },
      record,
      userId
    } = this.props
    if (!entries || !entries[0]) return
    const track = entries[0]

    const isOwner = track?.owner_id === userId
    const shouldPreview = isPreview && isOwner

    const isSameTrack =
      currentQueueItem.track && currentQueueItem.track.track_id === track.id

    if (previewing !== isPreview || !isSameTrack) {
      stop()
      play(track.uid, { isPreview: shouldPreview })
      record(
        make(Name.PLAYBACK_PLAY, {
          id: `${track.id}`,
          isPreview: shouldPreview,
          source: PlaybackSource.TRACK_PAGE
        })
      )
    } else if (isPlaying) {
      pause()
      record(
        make(Name.PLAYBACK_PAUSE, {
          id: `${track.id}`,
          source: PlaybackSource.TRACK_PAGE
        })
      )
    } else {
      play()
      record(
        make(Name.PLAYBACK_PLAY, {
          id: `${track.id}`,
          isPreview: shouldPreview,
          source: PlaybackSource.TRACK_PAGE
        })
      )
    }
  }

  onHeroRepost = (isReposted: boolean, trackId: ID) => {
    const { repostTrack, undoRepostTrack } = this.props
    if (!isReposted) {
      repostTrack(trackId)
    } else {
      undoRepostTrack(trackId)
    }
  }

  onHeroShare = (trackId: ID) => {
    const { shareTrack } = this.props
    shareTrack(trackId)
  }

  onFollow = () => {
    const { onFollow, track } = this.props
    if (track) onFollow(track.owner_id)
  }

  onUnfollow = () => {
    const { onUnfollow, onConfirmUnfollow, track } = this.props
    if (track) {
      if (this.context.isMobile) {
        onConfirmUnfollow(track.owner_id)
      } else {
        onUnfollow(track.owner_id)
      }
    }
  }

  goToProfilePage = (handle: string) => {
    this.props.goToRoute(profilePage(handle))
  }

  goToAllRemixesPage = () => {
    const { track } = this.props
    if (track) {
      this.props.goToRoute(trackRemixesPage(track.permalink))
    }
  }

  goToFavoritesPage = (trackId: ID) => {
    this.props.setFavoriteTrackId(trackId)
    this.props.goToRoute(FAVORITING_USERS_ROUTE)
  }

  goToRepostsPage = (trackId: ID) => {
    this.props.setRepostTrackId(trackId)
    this.props.goToRoute(REPOSTING_USERS_ROUTE)
  }

  render() {
    const {
      track,
      remixParentTrack,
      user,
      currentQueueItem,
      playing,
      previewing,
      userId
    } = this.props
    const heroPlaying =
      playing &&
      !!track &&
      !!currentQueueItem.track &&
      currentQueueItem.track.track_id === track.track_id

    const desktopProps = {
      // Follow Props
      onFollow: this.onFollow,
      onUnfollow: this.onUnfollow,
      makePublic: this.props.makeTrackPublic
    }
    const releaseDate = track ? track.release_date || track.created_at : ''
    const {
      title = '',
      description = '',
      canonicalUrl = '',
      structuredData
    } = getTrackPageSEOFields({
      title: track?.title,
      permalink: track?.permalink,
      userName: user?.name,
      releaseDate: releaseDate ? formatDate(releaseDate) : ''
    })

    // If the track has a remix parent and it's not deleted and the original's owner is not deactivated.
    const hasValidRemixParent =
      !!getRemixParentTrackId(track) &&
      !!remixParentTrack &&
      remixParentTrack.is_delete === false &&
      !remixParentTrack.user?.is_deactivated

    if ((track?.is_delete || track?._marked_deleted) && user) {
      // Track has not been blocked and is content-available, meaning the owner
      // deleted themselves via transaction.
      const deletedByArtist = !track._blocked && track.is_available

      return (
        <DeletedPage
          title={title}
          description={description}
          canonicalUrl={canonicalUrl}
          structuredData={structuredData}
          playable={{ metadata: track, type: PlayableType.TRACK }}
          user={user}
          deletedByArtist={deletedByArtist}
        />
      )
    }

    const childProps = {
      title,
      description,
      canonicalUrl,
      structuredData,
      heroTrack: track,
      hasValidRemixParent,
      user,
      heroPlaying,
      userId,
      previewing,
      onHeroPlay: this.onHeroPlay,
      onHeroRepost: this.onHeroRepost,
      onHeroShare: this.onHeroShare,
      onClickMobileOverflow: this.props.clickOverflow,
      onConfirmUnfollow: this.props.onConfirmUnfollow,
      goToFavoritesPage: this.goToFavoritesPage,
      goToRepostsPage: this.goToRepostsPage
    }

    return (
      <>
        {/* @ts-ignore lineup has wrong type LineupState<{ id: number }> */}
        <this.props.children
          key={this.state.routeKey}
          {...childProps}
          {...desktopProps}
        />
      </>
    )
  }
}

const REDIRECT_TRACK_ID_RANGE = [416972, 418372]
const shouldRedirectTrack = (trackId: ID) =>
  trackId >= REDIRECT_TRACK_ID_RANGE[0] && trackId <= REDIRECT_TRACK_ID_RANGE[1]

function makeMapStateToProps() {
  const getMoreByArtistLineup = makeGetLineupMetadatas(getLineup)
  const getCurrentQueueItem = makeGetCurrent()

  const mapStateToProps = (state: AppState) => {
    return {
      source: getSourceSelector(state),
      trackPermalink: getTrackPermalink(state),
      remixParentTrack: getRemixParentTrack(state),
      user: getUser(state),
      status: getStatus(state),
      moreByArtist: getMoreByArtistLineup(state),
      userId: getUserId(state),

      currentQueueItem: getCurrentQueueItem(state),
      playing: getPlaying(state),
      previewing: getPreviewing(state),
      pathname: getLocationPathname(state)
    }
  }
  return mapStateToProps
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    setTrackId: (trackId: number) =>
      dispatch(trackPageActions.setTrackId(trackId)),
    setTrackPermalink: (permalink: string) =>
      dispatch(trackPageActions.setTrackPermalink(permalink)),
    resetTrackPage: () => dispatch(trackPageActions.resetTrackPage()),
    makeTrackPublic: (trackId: ID) =>
      dispatch(trackPageActions.makeTrackPublic(trackId)),

    goToRoute: (route: string) => dispatch(push(route)),
    replaceRoute: (route: string) => dispatch(replace(route)),
    reset: (source?: string) => dispatch(tracksActions.reset(source)),
    play: (uid?: string, options: { isPreview?: boolean } = {}) =>
      dispatch(tracksActions.play(uid, options)),
    stop: () => {
      dispatch(playerActions.stop({}))
    },
    recordPlayMoreByArtist: (trackId: ID) => {
      const trackEvent: TrackEvent = make(Name.TRACK_PAGE_PLAY_MORE, {
        id: trackId
      })
      dispatch(trackEvent)
    },
    pause: () => dispatch(tracksActions.pause()),
    shareTrack: (trackId: ID) =>
      dispatch(
        requestOpenShareModal({
          type: 'track',
          trackId,
          source: ShareSource.PAGE
        })
      ),
    repostTrack: (trackId: ID) =>
      dispatch(
        socialTracksActions.repostTrack(trackId, RepostSource.TRACK_PAGE)
      ),
    undoRepostTrack: (trackId: ID) =>
      dispatch(
        socialTracksActions.undoRepostTrack(trackId, RepostSource.TRACK_PAGE)
      ),
    editTrack: (trackId: ID, formFields: any) =>
      dispatch(cacheTrackActions.editTrack(trackId, formFields)),
    onFollow: (userId: ID) =>
      dispatch(socialUsersActions.followUser(userId, FollowSource.TRACK_PAGE)),
    onUnfollow: (userId: ID) =>
      dispatch(
        socialUsersActions.unfollowUser(userId, FollowSource.TRACK_PAGE)
      ),
    onConfirmUnfollow: (userId: ID) =>
      dispatch(unfollowConfirmationActions.setOpen(userId)),
    clickOverflow: (trackId: ID, overflowActions: OverflowAction[]) =>
      dispatch(
        open({ source: OverflowSource.TRACKS, id: trackId, overflowActions })
      ),
    setRepostTrackId: (trackId: ID) =>
      dispatch(setRepost(trackId, RepostType.TRACK)),
    setFavoriteTrackId: (trackId: ID) =>
      dispatch(setFavorite(trackId, FavoriteType.TRACK)),
    record: (event: TrackEvent) => dispatch(event),
    refetchTracksLinup: () => dispatch(trackPageActions.refetchLineup())
  }
}

export default connect(
  makeMapStateToProps,
  mapDispatchToProps
)(TrackPageProviderWrapper)
