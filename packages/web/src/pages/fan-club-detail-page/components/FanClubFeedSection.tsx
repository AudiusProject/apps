import { useCallback, useEffect, useMemo, useRef } from 'react'

import {
  useFanClubFeed,
  type FanClubFeedItem,
  mapLineupDataToFullLineupItems
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import {
  Name,
  PlaybackSource,
  UID,
  ID,
  ModalSource
} from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import {
  exclusiveTracksPageLineupActions,
  exclusiveTracksPageSelectors,
  playerSelectors,
  queueSelectors
} from '@audius/common/store'
import { Button, Flex, LoadingSpinner, Text } from '@audius/harmony'
import { EntityType } from '@audius/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { TrackTile as TrackTileDesktop } from 'components/track/desktop/TrackTile'
import { TrackTile as MobileTrackTile } from 'components/track/mobile/TrackTile'
import { TrackTileSize } from 'components/track/types'
import { useIsMobile } from 'hooks/useIsMobile'

import { TextPostCard } from './TextPostCard'

const { getBuffering } = playerSelectors
const { makeGetCurrent } = queueSelectors

const messages = {
  title: 'Fan Club Feed',
  loadMore: 'Load More'
}

const FEED_PAGE_SIZE = 10

type FanClubFeedSectionProps = {
  mint: string
}

export const FanClubFeedSection = ({ mint }: FanClubFeedSectionProps) => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
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

  // Extract track items for lineup (playback ordering)
  const trackLineupData = useMemo(
    () =>
      feedItems
        ?.filter(
          (item): item is Extract<FanClubFeedItem, { itemType: 'track' }> =>
            item.itemType === 'track'
        )
        .map((item) => ({ id: item.trackId, type: EntityType.TRACK })) ?? [],
    [feedItems]
  )

  // Lineup state for sequential track playback
  const lineup = useSelector(exclusiveTracksPageSelectors.getLineup)
  const isPlaying = useSelector(playerSelectors.getPlaying)
  const getCurrentQueueItem = useMemo(() => makeGetCurrent(), [])
  const currentQueueItem = useSelector(getCurrentQueueItem)
  const isBuffering = useSelector(getBuffering)
  const playingUid = currentQueueItem?.uid
  const playingSource = currentQueueItem?.source

  // Sync lineup with track data from the feed
  const prevTrackCount = useRef(0)
  useEffect(() => {
    if (trackLineupData.length !== prevTrackCount.current) {
      dispatch(exclusiveTracksPageLineupActions.reset())
      if (trackLineupData.length > 0) {
        const fullTracks = mapLineupDataToFullLineupItems(
          trackLineupData,
          queryClient,
          () => {},
          lineup.prefix
        )
        dispatch(
          exclusiveTracksPageLineupActions.fetchLineupMetadatas(
            0,
            fullTracks.length,
            false,
            { items: fullTracks }
          )
        )
      }
      prevTrackCount.current = trackLineupData.length
    }
  }, [trackLineupData, dispatch, queryClient, lineup.prefix])

  // Playback controls
  const togglePlay = useCallback(
    (uid: UID, id: ID) => {
      if (uid !== playingUid || (uid === playingUid && !isPlaying)) {
        dispatch(exclusiveTracksPageLineupActions.play(uid))
        dispatch(
          make(Name.PLAYBACK_PLAY, {
            id,
            source: PlaybackSource.EXCLUSIVE_TRACKS_PAGE
          })
        )
      } else {
        dispatch(exclusiveTracksPageLineupActions.pause())
        dispatch(
          make(Name.PLAYBACK_PAUSE, {
            id,
            source: PlaybackSource.EXCLUSIVE_TRACKS_PAGE
          })
        )
      }
    },
    [playingUid, isPlaying, dispatch]
  )

  const TrackTile = isMobile ? MobileTrackTile : TrackTileDesktop

  // Precompute mapping from feed index to lineup entry index for tracks
  const feedItemsWithLineupIndex = useMemo(() => {
    let trackIdx = 0
    return (
      feedItems?.map((item) => ({
        ...item,
        lineupIndex: item.itemType === 'track' ? trackIdx++ : -1
      })) ?? []
    )
  }, [feedItems])

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

            // Track item — render using lineup entry for playback state
            const lineupEntry: any = lineup.entries[item.lineupIndex]
            if (!lineupEntry) return null

            return (
              <TrackTile
                key={`track-${item.trackId}`}
                {...lineupEntry}
                uid={lineupEntry.uid}
                id={lineupEntry.id ?? item.trackId}
                index={item.lineupIndex}
                ordered={false}
                togglePlay={togglePlay}
                size={TrackTileSize.LARGE}
                statSize='large'
                isLoading={false}
                isTrending={false}
                source={ModalSource.LineUpTrackTile}
                isBuffering={isBuffering}
                playingSource={playingSource}
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
