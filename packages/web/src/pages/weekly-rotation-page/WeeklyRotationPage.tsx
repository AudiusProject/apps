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
 * Structured like a collection page -- artwork, title, play-all, track list --
 * but it isn't backed by a collection entity, so it's assembled from the same
 * pieces the History page uses rather than reusing the collection page.
 * Artwork is the bundled asset for the same reason: there's no playlist_id to
 * hang cover art on.
 *
 * Two routes land here. `/explore/weekly-rotation` is the signed-in user's own
 * mix; `/explore/weekly-rotation/:handle` is a shared link to someone else's,
 * which is what Share produces. The endpoint is public, so the shared page
 * works signed out. Opening your own handle's link is the same as the bare
 * route.
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

  // The route stays registered while the flag is off -- the URL is public and
  // shareable, so a link that predates the rollout should land somewhere real
  // rather than 404.
  const { isEnabled: isWeeklyRotationEnabled, isLoaded: isFlagLoaded } =
    useFeatureFlag(FeatureFlags.WEEKLY_ROTATION)

  // With a handle in the URL the mix belongs to that user; otherwise to the
  // viewer. Resolving the handle to a user is what the share modal, the
  // header, and the query all key off.
  const { data: handleUser } = useUserByHandle(handle, { enabled: !!handle })
  const targetUserId = handle ? handleUser?.user_id : currentUserId
  const isOwnMix = !handle || handleUser?.user_id === currentUserId

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

  const isPlaying = useSelector(playbackSelectors.getPlaying)
  const currentPlaybackTrackId = useSelector(
    playbackSelectors.getCurrentTrackId
  )

  const playbackQueue: PlaybackTrack[] = useMemo(
    () =>
      trackIds.map((id) => ({
        trackId: id,
        source: WEEKLY_ROTATION_SOURCE
      })),
    [trackIds]
  )

  // Mirrors the History page's play-all: toggle when we're already on the
  // first track, otherwise start the queue from the top.
  const handlePlay = useCallback(() => {
    if (playbackQueue.length === 0) return
    const firstId = playbackQueue[0].trackId as ID

    if (currentPlaybackTrackId === firstId) {
      dispatch(
        isPlaying ? playbackActions.togglePlay() : playbackActions.play()
      )
      dispatch(
        make(isPlaying ? Name.PLAYBACK_PAUSE : Name.PLAYBACK_PLAY, {
          id: `${firstId}`,
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
    currentPlaybackTrackId,
    playbackQueue,
    trackEvent,
    isMobile
  ])

  // The share modal resolves the owner's handle from the id, so the bare
  // route shares the viewer's own mix under their handle.
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

  // Only the handle route gets the collage card and a canonical URL: the bare
  // route is per-viewer and shouldn't be indexed as anyone's mix.
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
        source={WEEKLY_ROTATION_SOURCE}
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
