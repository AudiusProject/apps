import { useCallback, useEffect, useMemo, useRef } from 'react'

import {
  useCurrentUserId,
  useUserByHandle,
  useWeeklyRotation
} from '@audius/common/api'
import { useAnalytics, useFeatureFlag } from '@audius/common/hooks'
import { exploreMessages } from '@audius/common/messages'
import { ID, Name, PlaybackSource, ShareSource } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import {
  playbackActions,
  playbackSelectors,
  shareModalUIActions
} from '@audius/common/store'
import type { PlaybackTrack } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Artwork,
  Button,
  Flex,
  IconPause,
  IconPlay,
  IconShare,
  Text
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useParams } from 'react-router'

import weeklyRotationArt from 'assets/img/weeklyRotation.jpg'
import { make } from 'common/store/analytics/actions'
import Page from 'components/page/Page'
import { RESPONSIVE_TABLE_POLICIES } from 'components/table/responsivePolicies'
import { TrackTableLineup, TracksTableColumn } from 'components/tracks-table'
import { useIsMobile } from 'hooks/useIsMobile'
import { useMainContentRef } from 'pages/MainContentContext'
import { fullWeeklyRotationPage } from 'utils/route'
import { getWeeklyRotationOgImageUrl } from 'utils/weeklyRotationPeriod'

const messages = {
  title: 'Weekly Rotation',
  description:
    'A fresh mix of tracks picked for you, updated every Wednesday on Audius.',
  share: 'Share'
}

const { EXPLORE_PAGE } = route
const { requestOpen: requestOpenShareModal } = shareModalUIActions

const WEEKLY_ROTATION_SOURCE = 'WEEKLY_ROTATION_TRACKS'
const PAGE_SIZE = 30
const ARTWORK_SIZE = 200

const columns: TracksTableColumn[] = [
  'trackName',
  'releaseDate',
  'length',
  'plays',
  'reposts',
  'overflowActions'
]

/**
 * The full Weekly Rotation mix.
 *
 * Structured like a collection page (artwork, title, play-all, track list) but
 * it isn't backed by a collection entity, so it's assembled from the same
 * pieces the History page uses rather than reusing the collection page.
 * Artwork is the bundled asset for the same reason: there's no playlist_id to
 * hang cover art on.
 *
 * `/explore/weekly-rotation` shows the signed-in user's mix;
 * `/explore/weekly-rotation/:handle` shows that user's mix (public, works
 * signed out).
 *
 * The endpoint returns a fixed 30, so there is no pagination.
 */
export const WeeklyRotationPage = () => {
  const dispatch = useDispatch()
  const isMobile = useIsMobile()
  const { trackEvent } = useAnalytics()
  const mainContentRef = useMainContentRef()
  const { data: currentUserId } = useCurrentUserId()
  const { handle } = useParams<{ handle?: string }>()

  // The route stays registered while the flag is off so shared links redirect
  // instead of 404ing.
  const { isEnabled: isWeeklyRotationEnabled, isLoaded: isFlagLoaded } =
    useFeatureFlag(FeatureFlags.WEEKLY_ROTATION)

  // The mix belongs to the handle's user if present, otherwise the viewer.
  const { data: handleUser } = useUserByHandle(handle, { enabled: !!handle })
  const targetUserId = handle ? handleUser?.user_id : currentUserId
  const isOwnMix =
    !handle || (handleUser != null && handleUser.user_id === currentUserId)
  // Per-owner source so your own mix and a shared one don't share play state.
  const playbackSource = `${WEEKLY_ROTATION_SOURCE}:${targetUserId ?? ''}`

  const { trackIds, isPending, isFetching, isLoading } = useWeeklyRotation(
    { limit: PAGE_SIZE, userId: targetUserId },
    { enabled: isWeeklyRotationEnabled && !!targetUserId }
  )

  // Fired once the mix resolves rather than on mount, so trackCount is real
  // and a failed load doesn't register as a page view.
  const hasTrackedView = useRef(false)
  useEffect(() => {
    if (hasTrackedView.current || !trackIds.length) return
    hasTrackedView.current = true
    trackEvent({
      eventName: Name.WEEKLY_ROTATION_PAGE_VIEW,
      source: isMobile ? 'mobile' : 'web',
      trackCount: trackIds.length
    })
  }, [trackIds.length, isMobile, trackEvent])

  const isPlaybackActive = useSelector(playbackSelectors.getPlaying)
  const currentPlaybackTrackId = useSelector(
    playbackSelectors.getCurrentTrackId
  )
  const currentPlaybackSource = useSelector(playbackSelectors.getCurrentSource)

  // The header button only reflects and controls playback of this mix.
  const isQueued =
    currentPlaybackSource === playbackSource &&
    currentPlaybackTrackId != null &&
    trackIds.includes(currentPlaybackTrackId)
  const isPlaying = isPlaybackActive && isQueued

  const playbackQueue: PlaybackTrack[] = useMemo(
    () =>
      trackIds.map((id) => ({
        trackId: id,
        source: playbackSource
      })),
    [trackIds, playbackSource]
  )

  // Toggle when the mix is what's loaded, otherwise start the queue from the
  // top.
  const handlePlay = useCallback(() => {
    if (playbackQueue.length === 0) return
    const firstId = playbackQueue[0].trackId as ID

    if (isQueued) {
      dispatch(
        isPlaying ? playbackActions.togglePlay() : playbackActions.play()
      )
      dispatch(
        make(isPlaying ? Name.PLAYBACK_PAUSE : Name.PLAYBACK_PLAY, {
          id: `${currentPlaybackTrackId}`,
          source: PlaybackSource.PLAYLIST_PAGE
        })
      )
      return
    }

    trackEvent({
      eventName: Name.WEEKLY_ROTATION_PLAY_ALL,
      source: isMobile ? 'mobile' : 'web',
      trackCount: playbackQueue.length
    })
    dispatch(
      playbackActions.playFrom({
        tracks: playbackQueue,
        startIndex: 0,
        querySource: null
      })
    )
    dispatch(
      make(Name.PLAYBACK_PLAY, {
        id: `${firstId}`,
        source: PlaybackSource.PLAYLIST_PAGE
      })
    )
  }, [
    dispatch,
    isPlaying,
    isQueued,
    currentPlaybackTrackId,
    playbackQueue,
    trackEvent,
    isMobile
  ])

  const handleShare = useCallback(() => {
    if (!targetUserId) return
    dispatch(
      requestOpenShareModal({
        type: 'weeklyRotation',
        userId: targetUserId,
        source: ShareSource.PAGE
      })
    )
  }, [dispatch, targetUserId])

  const isEmpty = !isLoading && trackIds.length === 0

  // Nothing until remote config resolves, so an enabled user doesn't get
  // bounced to Explore on the first frame.
  if (!isFlagLoaded) return null
  if (!isWeeklyRotationEnabled) return <Navigate to={EXPLORE_PAGE} replace />

  const title = isOwnMix
    ? exploreMessages.weeklyRotation
    : exploreMessages.weeklyRotationFor(handleUser?.name ?? handle ?? '')

  // Only the handle route gets an OG card and canonical URL; the bare route is
  // per-viewer.
  const metaTags = handle
    ? {
        title,
        description: messages.description,
        image: getWeeklyRotationOgImageUrl(handle),
        canonicalUrl: fullWeeklyRotationPage(handle),
        thumbnail: false
      }
    : { title: messages.title, description: messages.description }

  return (
    <Page {...metaTags}>
      <Flex
        direction={isMobile ? 'column' : 'row'}
        gap='xl'
        p={isMobile ? 'l' : 'xl'}
        alignItems={isMobile ? 'center' : 'flex-end'}
      >
        <Artwork
          src={weeklyRotationArt}
          h={ARTWORK_SIZE}
          w={ARTWORK_SIZE}
          css={{ flexShrink: 0 }}
        />
        <Flex
          direction='column'
          gap='m'
          alignItems={isMobile ? 'center' : 'flex-start'}
        >
          <Text
            variant='display'
            size='s'
            textAlign={isMobile ? 'center' : undefined}
          >
            {title}
          </Text>
          <Text variant='body' size='l' color='subdued'>
            {exploreMessages.weeklyRotationSubtitle}
            {trackIds.length
              ? ` · ${exploreMessages.weeklyRotationTrackCount(trackIds.length)}`
              : ''}
          </Text>
          <Flex gap='s' wrap='wrap' justifyContent='center'>
            <Button
              variant='primary'
              iconLeft={isPlaying ? IconPause : IconPlay}
              onClick={handlePlay}
              disabled={isEmpty || isLoading}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button
              variant='secondary'
              iconLeft={IconShare}
              onClick={handleShare}
              disabled={!targetUserId || isEmpty}
            >
              {messages.share}
            </Button>
          </Flex>
        </Flex>
      </Flex>

      <TrackTableLineup
        source={playbackSource}
        trackIds={trackIds}
        isPending={isPending}
        isFetching={isFetching}
        isInitialLoading={isLoading}
        hasNextPage={false}
        loadNextPage={() => {}}
        pageSize={PAGE_SIZE}
        columns={columns}
        userId={currentUserId}
        showArtistInTrackNameColumn
        responsiveColumns={RESPONSIVE_TABLE_POLICIES.weeklyRotationTracks}
        scrollRef={mainContentRef}
      />
    </Page>
  )
}

export default WeeklyRotationPage
