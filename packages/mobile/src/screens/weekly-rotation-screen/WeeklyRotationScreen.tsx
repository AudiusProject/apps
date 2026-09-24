import React, { useCallback, useEffect, useMemo, useRef } from 'react'

import {
  useCurrentUserId,
  useUserByHandle,
  useWeeklyRotation
} from '@audius/common/api'
import { useAnalytics } from '@audius/common/hooks'
import { exploreMessages } from '@audius/common/messages'
import {
  FavoriteSource,
  Name,
  PlaybackSource,
  RepostSource,
  ShareSource
} from '@audius/common/models'
import {
  playbackActions,
  playbackSelectors,
  shareModalUIActions
} from '@audius/common/store'
import type { PlaybackTrack } from '@audius/common/store'
import {
  formatWeeklyRotationPeriod,
  getWeeklyRotationPeriod,
  getWeeklyRotationQueueSource
} from '@audius/common/utils'
import { Image } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  Button,
  Flex,
  IconButton,
  IconPause,
  IconPlay,
  IconShare,
  Paper,
  Text
} from '@audius/harmony-native'
import weeklyRotationArt from 'app/assets/images/weeklyRotation.jpg'
import { Screen, ScreenContent } from 'app/components/core'
import { TrackLineup } from 'app/components/lineup/TrackLineup'
import { useRoute } from 'app/hooks/useRoute'
import { make, track } from 'app/services/analytics'

const { requestOpen: requestOpenShareModal } = shareModalUIActions

const messages = {
  title: 'Weekly Rotation',
  share: 'Share'
}

const ART_SIZE = 120

/**
 * The full Weekly Rotation mix. Mirrors the web page: artwork header, then the
 * track list.
 *
 * Shows the signed-in user's mix, or the `handle` param's user's mix (deep
 * link `/explore/weekly-rotation/:handle`).
 *
 * The endpoint returns a fixed 30, so there is no pagination.
 */
export const WeeklyRotationScreen = () => {
  const { params } = useRoute<'WeeklyRotationScreen'>()
  const handle = params?.handle
  const { data: currentUserId } = useCurrentUserId()
  const { data: handleUser } = useUserByHandle(handle, { enabled: !!handle })
  const targetUserId = handle ? handleUser?.user_id : currentUserId
  const isOwnMix =
    !handle || (handleUser != null && handleUser.user_id === currentUserId)
  const playbackSource = getWeeklyRotationQueueSource(targetUserId)

  const { trackIds, isPending, isFetching, isSuccess, isError } =
    useWeeklyRotation(
      { limit: 30, userId: targetUserId },
      { enabled: !!targetUserId }
    )
  const { trackEvent } = useAnalytics()
  const dispatch = useDispatch()

  const mixProperties = useMemo(
    () => ({
      source: 'mobile' as const,
      period: formatWeeklyRotationPeriod(getWeeklyRotationPeriod()),
      isOwnMix,
      ownerUserId: targetUserId ? `${targetUserId}` : undefined
    }),
    [isOwnMix, targetUserId]
  )

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

  // Mirrors the web page's play-all: toggle when the mix is what's loaded,
  // otherwise start the queue from the top.
  const handlePlay = useCallback(() => {
    if (playbackQueue.length === 0) return

    if (isQueued) {
      dispatch(
        isPlaying ? playbackActions.togglePlay() : playbackActions.play()
      )
      track(
        make({
          eventName: isPlaying ? Name.PLAYBACK_PAUSE : Name.PLAYBACK_PLAY,
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
    track(
      make({
        eventName: Name.PLAYBACK_PLAY,
        id: `${playbackQueue[0].trackId}`,
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

  // Fired once the mix resolves, so trackCount and status are real.
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

  const title = isOwnMix
    ? exploreMessages.weeklyRotation
    : exploreMessages.weeklyRotationFor(handleUser?.name ?? handle ?? '')

  const topbarRight = (
    <IconButton
      icon={IconShare}
      onPress={handleShare}
      color='subdued'
      disabled={!targetUserId || !trackIds.length}
      aria-label={messages.share}
      ripple
    />
  )

  const header = (
    <Flex ph='l' pt='l'>
      <Paper row gap='l' alignItems='center' p='l'>
        <Image
          source={weeklyRotationArt}
          style={{ width: ART_SIZE, height: ART_SIZE, borderRadius: 8 }}
        />
        <Flex column gap='xs' style={{ flex: 1 }}>
          <Text variant='title' size='l'>
            {title}
          </Text>
          <Text variant='body' size='s' color='subdued'>
            {exploreMessages.weeklyRotationSubtitle}
          </Text>
          {trackIds.length ? (
            <Text variant='body' size='s' color='subdued'>
              {exploreMessages.weeklyRotationTrackCount(trackIds.length)}
            </Text>
          ) : null}
          <Button
            variant='primary'
            size='small'
            iconLeft={isPlaying ? IconPause : IconPlay}
            onPress={handlePlay}
            disabled={!trackIds.length}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
        </Flex>
      </Paper>
    </Flex>
  )

  return (
    <Screen
      title={messages.title}
      topbarRight={topbarRight}
      variant='secondary'
    >
      <ScreenContent>
        <TrackLineup
          trackIds={trackIds}
          source={playbackSource}
          playbackSource={PlaybackSource.WEEKLY_ROTATION}
          favoriteSource={FavoriteSource.WEEKLY_ROTATION}
          repostSource={RepostSource.WEEKLY_ROTATION}
          isPending={isPending}
          isFetching={isFetching}
          hasNextPage={false}
          loadNextPage={() => {}}
          pageSize={30}
          header={header}
        />
      </ScreenContent>
    </Screen>
  )
}
