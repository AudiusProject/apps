import { useEffect, useContext, useCallback } from 'react'

import {
  useCurrentUserId,
  useTrackByParams,
  useToggleFavoriteTrack,
  useUser
} from '@audius/common/api'
import { useCurrentTrack, useGatedContentAccess } from '@audius/common/hooks'
import {
  FavoriteSource,
  ID,
  Track,
  Kind,
  PlayableType,
  Name,
  ShareSource,
  RepostSource,
  PlaybackSource,
  FavoriteType
} from '@audius/common/models'
import {
  OverflowAction,
  trackPageLineupActions,
  trackPageSelectors,
  tracksSocialActions as socialTracksActions,
  shareModalUIActions,
  favoritesUserListActions,
  repostsUserListActions,
  mobileOverflowMenuUIActions,
  playerSelectors,
  playerActions,
  RepostType
} from '@audius/common/store'
import { formatDate, route, makeUid } from '@audius/common/utils'
import { Flex } from '@audius/harmony'
import { Id } from '@audius/sdk'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

import { make } from 'common/store/analytics/actions'
import { CommentPreview } from 'components/comments/CommentPreview'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, {
  LeftPreset,
  CenterPreset,
  RightPreset
} from 'components/nav/mobile/NavContext'
import { RemixContestCountdown } from 'components/track/RemixContestCountdown'
import DeletedPage from 'pages/deleted-page/DeletedPage'
import { getTrackDefaults } from 'pages/track-page/utils'
import { parseTrackRoute } from 'utils/route/trackRouteParser'
import { getTrackPageSEOFields } from 'utils/seo'

import { TrackPageLineup } from '../TrackPageLineup'

import TrackPageHeader from './TrackHeader'
import { RemixContestSection } from './remix-contests/RemixContestSection'

const { NOT_FOUND_PAGE, FAVORITING_USERS_ROUTE, REPOSTING_USERS_ROUTE } = route
const { getPlaying, getPreviewing } = playerSelectors
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { open } = mobileOverflowMenuUIActions
const { tracksActions } = trackPageLineupActions
const { setFavorite } = favoritesUserListActions
const { setRepost } = repostsUserListActions

const TrackPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const params = parseTrackRoute(location.pathname)
  const { data: track, status } = useTrackByParams(params)
  const { data: user } = useUser(track?.owner_id)
  const { data: accountUserId } = useCurrentUserId()
  const currentTrack = useCurrentTrack()
  const playing = useSelector(getPlaying)
  const previewing = useSelector(getPreviewing)
  const source = useSelector(trackPageSelectors.getSourceSelector)

  const heroPlaying =
    playing &&
    !!track &&
    !!currentTrack &&
    currentTrack.track_id === track.track_id

  // Simple error handling
  useEffect(() => {
    if (status === 'error') {
      navigate(NOT_FOUND_PAGE)
    }
  }, [status, navigate])
  const { setLeft, setCenter, setRight } = useContext(NavContext)!
  useEffect(() => {
    setLeft(LeftPreset.BACK)
    setCenter(CenterPreset.LOGO)
    setRight(RightPreset.KEBAB)
  }, [setLeft, setCenter, setRight])

  const { setHeader } = useContext(HeaderContext)
  useEffect(() => {
    setHeader(null)
  }, [setHeader])

  const isOwner = track ? track.owner_id === accountUserId : false
  const isSaved = track ? track.has_current_user_saved : false
  const isReposted = track ? track.has_current_user_reposted : false
  const isFollowing = user ? user.does_current_user_follow : false

  const { isFetchingNFTAccess, hasStreamAccess, hasDownloadAccess } =
    useGatedContentAccess(track)

  const isCommentingEnabled = !track?.comments_disabled

  const loading = !track || isFetchingNFTAccess

  const toggleSaveTrack = useToggleFavoriteTrack({
    trackId: track?.track_id,
    source: FavoriteSource.TRACK_PAGE
  })

  // Handlers
  const onHeroPlay = useCallback(
    ({
      isPlaying: isPlayingParam,
      isPreview = false
    }: {
      isPlaying: boolean
      isPreview?: boolean
    }) => {
      if (!track) return

      const isOwner = track.owner_id === accountUserId
      const shouldPreview = isPreview && isOwner
      const isSameTrack = currentTrack?.track_id === track.track_id
      const trackUid = makeUid(Kind.TRACKS, track.track_id, source)

      if (previewing !== isPreview || !isSameTrack) {
        dispatch(playerActions.stop({}))
        dispatch(tracksActions.play(trackUid, { isPreview: shouldPreview }))
        dispatch(
          make(Name.PLAYBACK_PLAY, {
            id: `${track.track_id}`,
            isPreview: shouldPreview,
            source: PlaybackSource.TRACK_PAGE
          })
        )
      } else if (isPlayingParam) {
        dispatch(tracksActions.pause())
        dispatch(
          make(Name.PLAYBACK_PAUSE, {
            id: `${track.track_id}`,
            source: PlaybackSource.TRACK_PAGE
          })
        )
      } else {
        dispatch(tracksActions.play())
        dispatch(
          make(Name.PLAYBACK_PLAY, {
            id: `${track.track_id}`,
            isPreview: shouldPreview,
            source: PlaybackSource.TRACK_PAGE
          })
        )
      }
    },
    [track, accountUserId, currentTrack, previewing, dispatch, source]
  )

  const onHeroRepost = useCallback(
    (isReposted: boolean, trackId: ID) => {
      if (!isReposted) {
        dispatch(
          socialTracksActions.repostTrack(trackId, RepostSource.TRACK_PAGE)
        )
      } else {
        dispatch(
          socialTracksActions.undoRepostTrack(trackId, RepostSource.TRACK_PAGE)
        )
      }
    },
    [dispatch]
  )

  const onHeroShare = useCallback(
    (trackId: ID) => {
      dispatch(
        requestOpenShareModal({
          type: 'track',
          trackId,
          source: ShareSource.PAGE
        })
      )
    },
    [dispatch]
  )

  const onClickMobileOverflow = useCallback(
    (trackId: ID, overflowActions: OverflowAction[]) => {
      dispatch(
        open({
          source: 'TRACKS' as any,
          id: trackId,
          overflowActions
        })
      )
    },
    [dispatch]
  )

  const goToFavoritesPage = useCallback(
    (trackId: ID) => {
      dispatch(setFavorite(trackId, FavoriteType.TRACK))
      navigate(FAVORITING_USERS_ROUTE)
    },
    [dispatch, navigate]
  )

  const goToRepostsPage = useCallback(
    (trackId: ID) => {
      dispatch(setRepost(trackId, RepostType.TRACK))
      navigate(REPOSTING_USERS_ROUTE)
    },
    [dispatch, navigate]
  )

  const onPlay = () => onHeroPlay({ isPlaying: heroPlaying })
  const onPreview = () =>
    onHeroPlay({ isPlaying: heroPlaying, isPreview: true })
  const onRepost = isOwner
    ? () => {}
    : () => track && onHeroRepost(isReposted, track.track_id)
  const onShare = () => {
    track && onHeroShare(track.track_id)
  }

  const defaults = getTrackDefaults(track as Track | null)

  // SEO fields
  const releaseDate = track ? track.release_date || track.created_at : ''
  const seoFields = getTrackPageSEOFields({
    title: track?.title,
    permalink: track?.permalink,
    userName: user?.name,
    releaseDate: releaseDate ? formatDate(releaseDate) : ''
  })

  // Handle deleted track
  if ((track?.is_delete || track?._marked_deleted) && user) {
    return (
      <DeletedPage
        title={seoFields.title ?? ''}
        description={seoFields.description ?? ''}
        canonicalUrl={seoFields.canonicalUrl ?? ''}
        structuredData={seoFields.structuredData}
        playable={{
          metadata: (track as Track | null) ?? null,
          type: PlayableType.TRACK
        }}
        user={user ?? null}
        deletedByArtist={!track._blocked && track.is_available}
      />
    )
  }

  return (
    <MobilePageContainer
      title={seoFields.title ?? ''}
      description={seoFields.description ?? ''}
      ogDescription={defaults.description}
      canonicalUrl={seoFields.canonicalUrl ?? ''}
      structuredData={seoFields.structuredData}
      entityType='track'
      hashId={track?.track_id ? Id.parse(track.track_id) : undefined}
      noIndex={defaults.isUnlisted}
    >
      <Flex column p='l' gap='2xl' w='100%'>
        <Flex column gap='l'>
          <RemixContestCountdown trackId={defaults.trackId} />
          <TrackPageHeader
            isLoading={loading}
            isPlaying={heroPlaying}
            isPreviewing={previewing}
            isReposted={isReposted}
            isFollowing={isFollowing}
            title={defaults.title}
            trackId={defaults.trackId}
            userId={track?.owner_id ?? 0}
            tags={defaults.tags}
            description={defaults.description}
            listenCount={defaults.playCount}
            repostCount={defaults.repostCount}
            commentCount={defaults.commentCount}
            commentsDisabled={defaults.commentsDisabled}
            duration={defaults.duration}
            releaseDate={defaults.releaseDate}
            credits={defaults.credits}
            genre={defaults.genre}
            mood={defaults.mood}
            saveCount={defaults.saveCount}
            isOwner={isOwner}
            isSaved={isSaved}
            coSign={defaults.coSign}
            onClickMobileOverflow={onClickMobileOverflow}
            onPlay={onPlay}
            onPreview={onPreview}
            onSave={toggleSaveTrack}
            onShare={onShare}
            onRepost={onRepost}
            isUnlisted={defaults.isUnlisted}
            isStreamGated={defaults.isStreamGated}
            streamConditions={defaults.streamConditions}
            hasStreamAccess={hasStreamAccess}
            hasDownloadAccess={hasDownloadAccess}
            isRemix={!!defaults.remixParentTrackId}
            fieldVisibility={defaults.fieldVisibility}
            goToFavoritesPage={goToFavoritesPage}
            goToRepostsPage={goToRepostsPage}
          />
        </Flex>
        <RemixContestSection trackId={defaults.trackId} isOwner={isOwner} />
        {isCommentingEnabled ? (
          <CommentPreview entityId={defaults.trackId} />
        ) : null}
        <TrackPageLineup
          user={user ?? null}
          trackId={defaults.trackId}
          commentsDisabled={track?.comments_disabled}
        />
      </Flex>
    </MobilePageContainer>
  )
}

export default TrackPage
