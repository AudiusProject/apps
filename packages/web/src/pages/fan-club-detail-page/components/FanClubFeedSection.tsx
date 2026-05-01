import { useCallback, useMemo } from 'react'

import { useFanClubFeed, type FanClubFeedItem } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { Name, PlaybackSource, ID, ModalSource } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { playbackActions, playbackSelectors } from '@audius/common/store'
import type { PlaybackTrack } from '@audius/common/store'
import { Button, Flex, LoadingSpinner, Text } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { TrackTile as TrackTileDesktop } from 'components/track/desktop/TrackTile'
import { TrackTile as MobileTrackTile } from 'components/track/mobile/TrackTile'
import { TrackTileSize } from 'components/track/types'
import { useIsMobile } from 'hooks/useIsMobile'

import { TextPostCard } from './TextPostCard'

const { getPlaying } = playbackSelectors
const { makeGetCurrent } = playbackSelectors

const messages = {
  title: 'Fan Club Feed',
  loadMore: 'Load More'
}

const FEED_PAGE_SIZE = 10
const FAN_CLUB_SOURCE = 'EXCLUSIVE_TRACKS_PAGE'

type FanClubFeedSectionProps = {
  mint: string
}

export const FanClubFeedSection = ({ mint }: FanClubFeedSectionProps) => {
  const dispatch = useDispatch()
  const isMobile = useIsMobile()
  const { isEnabled: isTextPostsEnabled } = useFeatureFlag(
    FeatureFlags.FAN_CLUB_TEXT_POST_POSTING
  )

  // Single chronological feed for both tracks and text posts
  const {
    data: feedItems,
    isPending: isFeedPending,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useFanClubFeed({
    mint,
    sortMethod: 'newest',
    pageSize: FEED_PAGE_SIZE,
    enabled: !!mint
  })

  const isPlaying = useSelector(getPlaying)
  const getCurrentQueueItem = useMemo(() => makeGetCurrent(), [])
  const currentQueueItem = useSelector(getCurrentQueueItem)
  const playingTrackId = currentQueueItem?.trackId ?? null
  const playingSource = currentQueueItem?.source ?? null

  // Build the play queue from track items (text posts aren't playable).
  const tracksForPlayback: PlaybackTrack[] = useMemo(() => {
    return (feedItems ?? [])
      .filter(
        (item): item is Extract<FanClubFeedItem, { itemType: 'track' }> =>
          item.itemType === 'track'
      )
      .map((item) => ({
        trackId: item.trackId,
        source: FAN_CLUB_SOURCE
      }))
  }, [feedItems])

  const feedItemsWithLineupIndex = useMemo(() => {
    let trackIdx = 0
    return (
      feedItems?.map((item) => ({
        ...item,
        lineupIndex: item.itemType === 'track' ? trackIdx++ : -1
      })) ?? []
    )
  }, [feedItems])

  const togglePlay = useCallback(
    (id: ID) => {
      const isSameTile =
        playingTrackId === id && playingSource === FAN_CLUB_SOURCE
      if (isSameTile && isPlaying) {
        dispatch(playbackActions.togglePlay())
        dispatch(
          make(Name.PLAYBACK_PAUSE, {
            id,
            source: PlaybackSource.EXCLUSIVE_TRACKS_PAGE
          })
        )
        return
      }
      if (isSameTile && !isPlaying) {
        dispatch(playbackActions.play())
        dispatch(
          make(Name.PLAYBACK_PLAY, {
            id,
            source: PlaybackSource.EXCLUSIVE_TRACKS_PAGE
          })
        )
        return
      }
      const startIndex = tracksForPlayback.findIndex((t) => t.trackId === id)
      if (startIndex < 0) return
      dispatch(
        playbackActions.playFrom({
          tracks: tracksForPlayback,
          startIndex
        })
      )
      dispatch(
        make(Name.PLAYBACK_PLAY, {
          id,
          source: PlaybackSource.EXCLUSIVE_TRACKS_PAGE
        })
      )
    },
    [playingTrackId, playingSource, isPlaying, dispatch, tracksForPlayback]
  )

  const TrackTile = isMobile ? MobileTrackTile : TrackTileDesktop
  const hasContent = feedItemsWithLineupIndex.length > 0

  if (!hasContent && !isFeedPending) return null

  return (
    <Flex column gap='l' w='100%'>
      <Flex alignItems='center' gap='s' w='100%'>
        <Text variant='heading' size='m' color='default'>
          {messages.title}
        </Text>
      </Flex>

      {isFeedPending ? (
        <Flex justifyContent='center' pv='l'>
          <LoadingSpinner />
        </Flex>
      ) : (
        <Flex column gap='m'>
          {feedItemsWithLineupIndex.map((item) => {
            if (item.itemType === 'text_post') {
              if (!isTextPostsEnabled) return null
              return (
                <TextPostCard
                  key={`post-${item.commentId}`}
                  commentId={item.commentId}
                  mint={mint}
                />
              )
            }

            const isActive =
              playingTrackId === item.trackId &&
              playingSource === FAN_CLUB_SOURCE

            return (
              // @ts-ignore - track tile accepts extra props
              <TrackTile
                key={`track-${item.trackId}`}
                id={item.trackId}
                index={item.lineupIndex}
                ordered={false}
                togglePlay={togglePlay}
                size={TrackTileSize.LARGE}
                statSize='large'
                isLoading={false}
                isTrending={false}
                isFeed={false}
                isActive={isActive}
                hasLoaded={() => {}}
                source={ModalSource.LineUpTrackTile}
              />
            )
          })}

          {hasNextPage ? (
            <Flex justifyContent='center'>
              <Button
                variant='secondary'
                size='small'
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? <LoadingSpinner /> : messages.loadMore}
              </Button>
            </Flex>
          ) : null}
        </Flex>
      )}
    </Flex>
  )
}
