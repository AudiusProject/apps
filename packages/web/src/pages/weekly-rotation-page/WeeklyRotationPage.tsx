import { useCallback, useEffect, useMemo, useRef } from 'react'

import {
  useCurrentUserId,
  useUserByHandle,
  useWeeklyRotation
} from '@audius/common/api'
import { useAnalytics, useFeatureFlag } from '@audius/common/hooks'
import { exploreMessages } from '@audius/common/messages'
import {
  FavoriteSource,
  ID,
  Name,
  PlaybackSource,
  RepostSource,
  ShareSource
} from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import {
  playbackActions,
  playbackSelectors,
  shareModalUIActions
} from '@audius/common/store'
import type { PlaybackTrack } from '@audius/common/store'
import {
  formatWeeklyRotationPeriod,
  getWeeklyRotationPeriod,
  getWeeklyRotationQueueSource,
  route
} from '@audius/common/utils'
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

export const WeeklyRotationPage = () => {
  const dispatch = useDispatch()
  const isMobile = useIsMobile()
  const { trackEvent } = useAnalytics()
  const mainContentRef = useMainContentRef()
  const { data: currentUserId } = useCurrentUserId()
  const { handle } = useParams<{ handle?: string }>()

  const { isEnabled: isWeeklyRotationEnabled, isLoaded: isFlagLoaded } =
    useFeatureFlag(FeatureFlags.WEEKLY_ROTATION)

  const { data: handleUser } = useUserByHandle(handle, { enabled: !!handle })
  const targetUserId = handle ? handleUser?.user_id : currentUserId
  const isOwnMix =
    !handle || (handleUser != null && handleUser.user_id === currentUserId)
  const playbackSource = getWeeklyRotationQueueSource(targetUserId)

  const { trackIds, isPending, isFetching, isLoading, isSuccess, isError } =
    useWeeklyRotation(
      { limit: PAGE_SIZE, userId: targetUserId },
      { enabled: isWeeklyRotationEnabled && !!targetUserId }
    )

  const mixProperties = useMemo(
    () => ({
      source: isMobile ? ('mobile' as const) : ('web' as const),
      period: formatWeeklyRotationPeriod(getWeeklyRotationPeriod()),
      isOwnMix,
      ownerUserId: targetUserId ? `${targetUserId}` : undefined
    }),
    [isMobile, isOwnMix, targetUserId]
  )

  const hasTrackedView = useRef(false)
  useEffect(() => {
    if (hasTrackedView.current || (!isSuccess && !isError)) return
    hasTrackedView.current = true
    trackEvent({
      eventName: Name.WEEKLY_ROTATION_PAGE_VIEW,
      ...mixProperties,
      trackCount: trackIds.length,
      status: isError ? 'error' : trackIds.length ? 'success' : 'empty',
      isSignedIn: !!currentUserId
    })
  }, [
    isSuccess,
    isError,
    trackIds.length,
    mixProperties,
    currentUserId,
    trackEvent
  ])

  const isPlaybackActive = useSelector(playbackSelectors.getPlaying)
  const currentPlaybackTrackId = useSelector(
    playbackSelectors.getCurrentTrackId
  )
  const currentPlaybackSource = useSelector(playbackSelectors.getCurrentSource)

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
          source: PlaybackSource.WEEKLY_ROTATION
        })
      )
      return
    }

    trackEvent({
      eventName: Name.WEEKLY_ROTATION_PLAY_ALL,
      ...mixProperties,
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
        source: PlaybackSource.WEEKLY_ROTATION
      })
    )
  }, [
    dispatch,
    isPlaying,
    isQueued,
    currentPlaybackTrackId,
    playbackQueue,
    trackEvent,
    mixProperties
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

  if (!isFlagLoaded) return null
  if (!isWeeklyRotationEnabled) return <Navigate to={EXPLORE_PAGE} replace />

  const title = isOwnMix
    ? exploreMessages.weeklyRotation
    : exploreMessages.weeklyRotationFor(handleUser?.name ?? handle ?? '')

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
        playingSource={PlaybackSource.WEEKLY_ROTATION}
        favoriteSource={FavoriteSource.WEEKLY_ROTATION}
        repostSource={RepostSource.WEEKLY_ROTATION}
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
