import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useCurrentUserId, useDiscoverWeekly } from '@audius/common/api'
import { useAnalytics } from '@audius/common/hooks'
import { exploreMessages } from '@audius/common/messages'
import { ID, Name, PlaybackSource } from '@audius/common/models'
import { playbackActions, playbackSelectors } from '@audius/common/store'
import type { PlaybackTrack } from '@audius/common/store'
import {
  Artwork,
  Button,
  Flex,
  IconPause,
  IconPlay,
  Text
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import discoverWeeklyArt from 'assets/img/discoverWeekly.jpg'
import { make } from 'common/store/analytics/actions'
import Page from 'components/page/Page'
import { RESPONSIVE_TABLE_POLICIES } from 'components/table/responsivePolicies'
import { TrackTableLineup, TracksTableColumn } from 'components/tracks-table'
import { useIsMobile } from 'hooks/useIsMobile'
import { useMainContentRef } from 'pages/MainContentContext'

const messages = {
  title: 'Discover Weekly',
  description:
    'A fresh mix of tracks picked for you, updated every Monday on Audius.'
}

const DISCOVER_WEEKLY_SOURCE = 'DISCOVER_WEEKLY_TRACKS'
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
 * The full Discover Weekly mix.
 *
 * Structured like a collection page -- artwork, title, play-all, track list --
 * but it isn't backed by a collection entity, so it's assembled from the same
 * pieces the History page uses rather than reusing the collection page.
 * Artwork is the bundled asset for the same reason: there's no playlist_id to
 * hang cover art on.
 *
 * The endpoint returns a fixed 30, so there is no pagination.
 */
export const DiscoverWeeklyPage = () => {
  const dispatch = useDispatch()
  const isMobile = useIsMobile()
  const { trackEvent } = useAnalytics()
  const mainContentRef = useMainContentRef()
  const { data: currentUserId } = useCurrentUserId()

  const { trackIds, isPending, isFetching, isLoading } = useDiscoverWeekly({
    limit: PAGE_SIZE
  })

  // Fired once the mix resolves rather than on mount, so trackCount is real
  // and a failed load doesn't register as a page view.
  const hasTrackedView = useRef(false)
  useEffect(() => {
    if (hasTrackedView.current || !trackIds.length) return
    hasTrackedView.current = true
    trackEvent({
      eventName: Name.DISCOVER_WEEKLY_PAGE_VIEW,
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
        source: DISCOVER_WEEKLY_SOURCE
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
      eventName: Name.DISCOVER_WEEKLY_PLAY_ALL,
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

  const isEmpty = !isLoading && trackIds.length === 0

  return (
    <Page title={messages.title} description={messages.description}>
      <Flex
        direction={isMobile ? 'column' : 'row'}
        gap='xl'
        p={isMobile ? 'l' : 'xl'}
        alignItems={isMobile ? 'center' : 'flex-end'}
      >
        <Artwork
          src={discoverWeeklyArt}
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
            {exploreMessages.discoverWeekly}
          </Text>
          <Text variant='body' size='l' color='subdued'>
            {exploreMessages.discoverWeeklySubtitle}
            {trackIds.length
              ? ` · ${exploreMessages.discoverWeeklyTrackCount(trackIds.length)}`
              : ''}
          </Text>
          <Button
            variant='primary'
            iconLeft={isPlaying ? IconPause : IconPlay}
            onClick={handlePlay}
            disabled={isEmpty || isLoading}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
        </Flex>
      </Flex>

      <TrackTableLineup
        source={DISCOVER_WEEKLY_SOURCE}
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
        responsiveColumns={RESPONSIVE_TABLE_POLICIES.discoverWeeklyTracks}
        scrollRef={mainContentRef}
      />
    </Page>
  )
}

export default DiscoverWeeklyPage
