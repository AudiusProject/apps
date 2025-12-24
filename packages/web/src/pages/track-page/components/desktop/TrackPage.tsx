import { useCallback, useRef, useEffect } from 'react'

import {
  useCurrentUserId,
  useTrackByParams,
  useToggleFavoriteTrack,
  useUser
} from '@audius/common/api'
import { useCurrentTrack, useGatedContentAccess } from '@audius/common/hooks'
import {
  ID,
  Track,
  FavoriteSource,
  Kind,
  PlayableType,
  Name,
  ShareSource,
  RepostSource,
  FollowSource,
  PlaybackSource
} from '@audius/common/models'
import {
  trackPageLineupActions,
  trackPageActions,
  trackPageSelectors,
  tracksSocialActions as socialTracksActions,
  usersSocialActions as socialUsersActions,
  shareModalUIActions,
  playerSelectors,
  playerActions
} from '@audius/common/store'
import { formatDate, route, makeUid } from '@audius/common/utils'
import { Box, Flex } from '@audius/harmony'
import { Id } from '@audius/sdk'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router'

import { make } from 'common/store/analytics/actions'
import { CommentSection } from 'components/comments/CommentSection'
import CoverPhoto from 'components/cover-photo/CoverPhoto'
import { EmptyNavBanner } from 'components/nav-banner/NavBanner'
import { FlushPageContainer } from 'components/page/FlushPageContainer'
import Page from 'components/page/Page'
import { EmptyStatBanner } from 'components/stat-banner/StatBanner'
import { GiantTrackTile } from 'components/track/GiantTrackTile'
import { RemixContestCountdown } from 'components/track/RemixContestCountdown'
import DeletedPage from 'pages/deleted-page/DeletedPage'
import { getTrackDefaults, emptyStringGuard } from 'pages/track-page/utils'
import { parseTrackRoute } from 'utils/route/trackRouteParser'
import { getTrackPageSEOFields } from 'utils/seo'

import { TrackPageLineup } from '../TrackPageLineup'
import { useTrackPageSize } from '../useTrackPageSize'

import { RemixContestSection } from './RemixContestSection'

const { NOT_FOUND_PAGE } = route
const { getPlaying, getPreviewing } = playerSelectors
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { tracksActions } = trackPageLineupActions

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

  // Simple cleanup
  useEffect(() => {
    return () => {
      dispatch(trackPageActions.resetTrackPage())
    }
  }, [dispatch])
  const { isDesktop } = useTrackPageSize()
  const isOwner = track?.owner_id === accountUserId
  const following = user?.does_current_user_follow ?? false
  const isSaved = track?.has_current_user_saved ?? false
  const isReposted = track?.has_current_user_reposted ?? false

  const { isFetchingNFTAccess, hasStreamAccess } = useGatedContentAccess(track)

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

  const onFollow = useCallback(() => {
    if (track) {
      dispatch(
        socialUsersActions.followUser(track.owner_id, FollowSource.TRACK_PAGE)
      )
    }
  }, [track, dispatch])

  const onUnfollow = useCallback(() => {
    if (track) {
      dispatch(
        socialUsersActions.unfollowUser(track.owner_id, FollowSource.TRACK_PAGE)
      )
    }
  }, [track, dispatch])

  const makePublic = useCallback(
    (trackId: ID) => {
      dispatch(trackPageActions.makeTrackPublic(trackId))
    },
    [dispatch]
  )

  const onPlay = () => onHeroPlay({ isPlaying: heroPlaying })
  const onPreview = () =>
    onHeroPlay({ isPlaying: heroPlaying, isPreview: true })
  const onShare = () => (track ? onHeroShare(track.track_id) : null)
  const onRepost = () =>
    track ? onHeroRepost(isReposted, track.track_id) : null

  const commentSectionRef = useRef<HTMLDivElement | null>(null)

  const defaults = getTrackDefaults(track as Track | null)

  const scrollToCommentSection = useCallback(() => {
    if (commentSectionRef.current) {
      commentSectionRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [commentSectionRef])

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

  const renderGiantTrackTile = () => (
    <GiantTrackTile
      loading={loading}
      playing={heroPlaying}
      previewing={previewing}
      trackTitle={defaults.title}
      trackId={defaults.trackId}
      userId={user?.user_id ?? 0}
      artistHandle={emptyStringGuard(user?.handle)}
      tags={defaults.tags}
      description={defaults.description}
      listenCount={defaults.playCount}
      duration={defaults.duration}
      releaseDate={defaults.releaseDate}
      credits={defaults.credits}
      genre={defaults.genre}
      mood={defaults.mood}
      repostCount={defaults.repostCount}
      saveCount={defaults.saveCount}
      isReposted={isReposted}
      isOwner={isOwner}
      currentUserId={accountUserId ?? null}
      isArtistPick={
        track && user ? user.artist_pick_track_id === track.track_id : false
      }
      ddexApp={track?.ddex_app}
      isSaved={isSaved}
      isUnlisted={defaults.isUnlisted}
      isScheduledRelease={defaults.isScheduledRelease}
      isStreamGated={defaults.isStreamGated}
      streamConditions={defaults.streamConditions}
      isDownloadGated={defaults.isDownloadGated}
      downloadConditions={defaults.downloadConditions}
      hasStreamAccess={hasStreamAccess}
      isRemix={!!defaults.remixParentTrackId}
      isPublishing={defaults.isPublishing}
      fieldVisibility={defaults.fieldVisibility}
      coSign={defaults.coSign}
      scrollToCommentSection={scrollToCommentSection}
      // Actions
      onPlay={onPlay}
      onPreview={onPreview}
      onShare={onShare}
      onRepost={onRepost}
      onSave={toggleSaveTrack}
      following={following}
      onFollow={onFollow}
      onUnfollow={onUnfollow}
      onMakePublic={makePublic}
    />
  )

  return (
    <Page
      title={seoFields.title ?? ''}
      description={seoFields.description ?? ''}
      ogDescription={defaults.description}
      canonicalUrl={seoFields.canonicalUrl ?? ''}
      structuredData={seoFields.structuredData}
      entityType='track'
      hashId={track?.track_id ? Id.parse(track.track_id) : undefined}
      variant='flush'
      scrollableSearch
      fromOpacity={1}
      noIndex={defaults.isUnlisted}
    >
      <FlushPageContainer>
        <RemixContestCountdown trackId={track?.track_id ?? 0} />
      </FlushPageContainer>
      <Box w='100%' css={{ position: 'absolute', height: '376px' }}>
        <CoverPhoto loading={loading} userId={user ? user.user_id : null} />
        <EmptyStatBanner />
        <EmptyNavBanner />
      </Box>
      <FlushPageContainer>
        <Flex
          direction='column'
          w='100%'
          pt={200}
          pb={60}
          css={{ position: 'relative' }}
          gap='unit12'
        >
          {renderGiantTrackTile()}
          <RemixContestSection
            trackId={track?.track_id ?? 0}
            isOwner={isOwner}
          />
          <Flex
            gap='2xl'
            w='100%'
            direction={isDesktop ? 'row' : 'column'}
            mh='auto'
            css={{ maxWidth: 1080 }}
            justifyContent='center'
          >
            {isCommentingEnabled ? (
              <Flex flex='3'>
                <CommentSection
                  entityId={defaults.trackId}
                  // @ts-ignore
                  commentSectionRef={commentSectionRef}
                />
              </Flex>
            ) : null}
            <TrackPageLineup
              user={user ?? null}
              trackId={track?.track_id}
              commentsDisabled={track?.comments_disabled}
            />
          </Flex>
        </Flex>
      </FlushPageContainer>
    </Page>
  )
}

export default TrackPage
