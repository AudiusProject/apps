import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import type { PlaybackTrack, QueueSource } from '@audius/common/store'
import { playbackActions, playbackSelectors } from '@audius/common/store'
import { useQueryClient } from '@tanstack/react-query'
import { Pressable, View } from 'react-native'
import DraggableFlatList from 'react-native-draggable-flatlist'
import { useDispatch, useSelector } from 'react-redux'

import {
  Divider,
  Flex,
  IconButton,
  IconClose,
  IconDrag,
  IconPause,
  IconPlay,
  PlainButton,
  Text,
  useTheme
} from '@audius/harmony-native'
import { NativeDrawer } from 'app/components/drawer'
import { TrackImage } from 'app/components/image/TrackImage'
import UserBadges from 'app/components/user-badges'
import * as haptics from 'app/haptics'
import { useDrawer } from 'app/hooks/useDrawer'

const { getPlaybackQueue, getPlaybackIndex, getIsPlaying, getQuerySource } =
  playbackSelectors
const {
  playTrackAt,
  removeFromQueue,
  reorder,
  clearUpcoming,
  togglePlay,
  addToQueue
} = playbackActions

const DRAWER_NAME = 'Queue'

const messages = {
  queue: 'Queue',
  upNext: 'Up Next',
  clear: 'Clear',
  emptyQueue: 'Your queue is empty.',
  playingFrom: 'Playing from '
}

const SOURCE_LABELS: Record<string, string> = {
  feed: 'Feed',
  trending: 'Trending',
  trendingUnderground: 'Underground',
  exploreContent: 'Explore',
  premiumTracks: 'Premium Tracks',
  newReleaseAlbums: 'New Releases',
  bestSellingAlbums: 'Best Selling',
  feelingLuckyTracks: 'Feeling Lucky',
  recentlyPlayedTracks: 'Recently Played',
  trackHistory: 'Listening History',
  libraryTracks: 'Your Library',
  favoritedTracks: 'Favorites',
  reposts: 'Reposts',
  profileTracks: 'Profile',
  tracksByPlaylist: 'Playlist',
  tracksByAlbum: 'Album',
  trackPageLineup: 'More tracks',
  search: 'Search'
}

type RowProps = {
  trackId: ID
  variant: 'now-playing' | 'queued' | 'up-next'
  isPlaying?: boolean
  onPlayPause?: () => void
  onPlay?: () => void
  onRemove?: () => void
  drag?: () => void
  onDragHandleLongPress?: () => void
}

const MiniTrackRow = ({
  trackId,
  variant,
  isPlaying,
  onPlayPause,
  onPlay,
  onRemove,
  drag,
  onDragHandleLongPress
}: RowProps) => {
  const { color, spacing } = useTheme()
  const { data: track } = useTrack(trackId, {
    select: (t) => ({
      title: t?.title,
      ownerId: t?.owner_id
    })
  })
  const { data: user } = useUser(track?.ownerId, {
    select: (u) => ({ name: u?.name })
  })

  const isNowPlaying = variant === 'now-playing'

  return (
    <Pressable
      onPress={onPlay}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.s,
        paddingVertical: spacing.s,
        gap: spacing.m
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 4,
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        <TrackImage
          trackId={trackId}
          size={SquareSizes.SIZE_150_BY_150}
          style={{ width: 48, height: 48 }}
          borderRadius='xs'
        />
      </View>

      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
        <Text
          variant='body'
          size='m'
          strength='strong'
          color={isNowPlaying ? 'accent' : 'default'}
          numberOfLines={1}
        >
          {track?.title ?? ''}
        </Text>
        {track?.ownerId ? (
          <Flex direction='row' alignItems='center' gap='xs'>
            <Text
              variant='body'
              size='s'
              color='subdued'
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {user?.name ?? ''}
            </Text>
            <UserBadges userId={track.ownerId} badgeSize='xs' />
          </Flex>
        ) : null}
      </View>

      <Flex direction='row' alignItems='center' gap='l'>
        {isNowPlaying ? (
          <Pressable
            onPress={onPlayPause}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: color.secondary.s400,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isPlaying ? (
              <IconPause size='2xs' color='staticWhite' />
            ) : (
              <IconPlay size='2xs' color='staticWhite' />
            )}
          </Pressable>
        ) : (
          <>
            {onRemove ? (
              <IconButton
                icon={IconClose}
                size='s'
                color='subdued'
                aria-label='Remove from queue'
                onPress={onRemove}
              />
            ) : null}
            {drag ? (
              <Pressable
                onLongPress={() => {
                  onDragHandleLongPress?.()
                  haptics.medium()
                  drag()
                }}
                delayLongPress={150}
                style={{ padding: 4 }}
              >
                <IconDrag size='s' color='subdued' />
              </Pressable>
            ) : null}
          </>
        )}
      </Flex>
    </Pressable>
  )
}

type UpNextItem = {
  kind: 'up-next'
  trackId: ID
}
type QueuedItem = {
  kind: 'queued'
  trackId: ID
  queueIndex: number
}
type NowPlayingItem = {
  kind: 'now-playing'
  trackId: ID
}
type ListItem = NowPlayingItem | QueuedItem | UpNextItem

const useNextFromSourceMobile = () => {
  const querySource = useSelector(getQuerySource)
  const queue = useSelector(getPlaybackQueue)
  const queryClient = useQueryClient()

  return useMemo<{ trackIds: ID[]; sourceKey: string | null }>(() => {
    if (!querySource) return { trackIds: [], sourceKey: null }
    const data = queryClient.getQueryData<{
      pages: Array<Array<{ id: number | string; type?: string }>>
    }>(querySource.queryKey as any)
    const sourceKey =
      Array.isArray(querySource.queryKey) && querySource.queryKey[0]
        ? String(querySource.queryKey[0])
        : null
    if (!data?.pages) return { trackIds: [], sourceKey }

    const inQueue = new Set(queue.map((t) => t.trackId))
    const upcoming: ID[] = []
    for (const page of data.pages) {
      for (const item of page) {
        if (!item) continue
        if (item.type && item.type !== 'track') continue
        const id = typeof item.id === 'number' ? item.id : Number(item.id)
        if (!Number.isFinite(id)) continue
        if (inQueue.has(id)) continue
        upcoming.push(id)
        if (upcoming.length >= 10) break
      }
      if (upcoming.length >= 10) break
    }
    return { trackIds: upcoming, sourceKey }
  }, [querySource, queue, queryClient])
}

const sourceLabel = (key: string | null) =>
  SOURCE_LABELS[key ?? ''] ?? 'Up Next'

export const QueueDrawer = () => {
  const { onClose } = useDrawer(DRAWER_NAME)
  const dispatch = useDispatch()
  const queue = useSelector(getPlaybackQueue)
  const index = useSelector(getPlaybackIndex)
  const isPlaying = useSelector(getIsPlaying)
  const { spacing, color } = useTheme()
  const { trackIds: nextFromIds, sourceKey } = useNextFromSourceMobile()

  // Suspend the parent drawer's swipe-to-dismiss gesture while the user is
  // reordering items. Without this, the drawer's PanResponder claims the
  // vertical drag and the drawer slides instead of the row.
  const [isItemDragging, setIsItemDragging] = useState(false)
  const dragResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleDragHandleLongPress = useCallback(() => {
    if (dragResetTimeout.current) {
      clearTimeout(dragResetTimeout.current)
      dragResetTimeout.current = null
    }
    setIsItemDragging(true)
  }, [])
  const handleDragRelease = useCallback(() => {
    // Defer slightly so the drawer's PanResponder can't grab the tail end of
    // the gesture as the finger lifts.
    if (dragResetTimeout.current) clearTimeout(dragResetTimeout.current)
    dragResetTimeout.current = setTimeout(() => {
      setIsItemDragging(false)
      dragResetTimeout.current = null
    }, 150)
  }, [])
  useEffect(() => {
    return () => {
      if (dragResetTimeout.current) clearTimeout(dragResetTimeout.current)
    }
  }, [])

  const nowPlaying: PlaybackTrack | null =
    index >= 0 && index < queue.length ? queue[index] : null
  const upNextStart = index >= 0 ? index + 1 : 0
  const queuedTracks = useMemo<PlaybackTrack[]>(
    () => (index >= 0 ? queue.slice(index + 1) : []),
    [queue, index]
  )

  const queuedListData = useMemo<QueuedItem[]>(
    () =>
      queuedTracks.map((t, i) => ({
        kind: 'queued' as const,
        trackId: t.trackId,
        queueIndex: upNextStart + i
      })),
    [queuedTracks, upNextStart]
  )

  const handleTogglePlay = useCallback(() => {
    dispatch(togglePlay())
  }, [dispatch])

  const handlePlayQueueItem = useCallback(
    (queueIndex: number) => {
      dispatch(playTrackAt({ index: queueIndex }))
    },
    [dispatch]
  )

  const handleRemove = useCallback(
    (queueIndex: number) => {
      dispatch(removeFromQueue({ index: queueIndex }))
    },
    [dispatch]
  )

  const handleClear = useCallback(() => {
    dispatch(clearUpcoming())
  }, [dispatch])

  const handleReorder = useCallback(
    ({ from, to }: { from: number; to: number }) => {
      if (from === to) return
      const orderedIndices = Array.from({ length: queue.length }, (_, i) => i)
      const movable = orderedIndices.slice(upNextStart)
      const [moved] = movable.splice(from, 1)
      movable.splice(to, 0, moved)
      dispatch(
        reorder({
          orderedIndices: [...orderedIndices.slice(0, upNextStart), ...movable]
        })
      )
    },
    [dispatch, queue.length, upNextStart]
  )

  const handleAddNextFromToQueue = useCallback(
    (trackId: ID) => {
      const sourceTag = String(sourceKey ?? 'next-from')
      dispatch(
        addToQueue({
          tracks: [{ trackId, source: sourceTag as unknown as QueueSource }]
        })
      )
    },
    [dispatch, sourceKey]
  )

  const renderQueuedItem = useCallback(
    ({
      item,
      drag
    }: {
      item: QueuedItem | { kind: 'now-playing'; trackId: ID }
      drag: () => void
    }) => {
      if (item.kind === 'now-playing') {
        return (
          <MiniTrackRow
            trackId={item.trackId}
            variant='now-playing'
            isPlaying={isPlaying}
            onPlayPause={handleTogglePlay}
          />
        )
      }
      return (
        <MiniTrackRow
          trackId={item.trackId}
          variant='queued'
          onPlay={() => handlePlayQueueItem(item.queueIndex)}
          onRemove={() => handleRemove(item.queueIndex)}
          drag={drag}
          onDragHandleLongPress={handleDragHandleLongPress}
        />
      )
    },
    [
      isPlaying,
      handleTogglePlay,
      handlePlayQueueItem,
      handleRemove,
      handleDragHandleLongPress
    ]
  )

  const draggableData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = []
    if (nowPlaying) {
      items.push({ kind: 'now-playing', trackId: nowPlaying.trackId })
    }
    items.push(...queuedListData)
    return items
  }, [nowPlaying, queuedListData])

  const isEmpty = queue.length === 0

  return (
    <NativeDrawer
      drawerName={DRAWER_NAME}
      onClose={onClose}
      drawerStyle={{ paddingHorizontal: 0, paddingVertical: 0 }}
      gesturesDisabled={isItemDragging}
    >
      <View style={{ width: '100%', paddingBottom: spacing.l }}>
        <Flex alignItems='center' pt='s' pb='xs'>
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: color.neutral.n200
            }}
          />
        </Flex>
        <Flex
          direction='row'
          alignItems='center'
          justifyContent='space-between'
          ph='l'
          pv='l'
        >
          <Text variant='title' size='l' strength='strong' color='default'>
            {messages.queue}
          </Text>
          {!isEmpty ? (
            <PlainButton onPress={handleClear}>{messages.clear}</PlainButton>
          ) : null}
        </Flex>
        <Divider orientation='horizontal' />

        {isEmpty ? (
          <Flex pv='2xl' alignItems='center'>
            <Text variant='body' size='m' color='subdued'>
              {messages.emptyQueue}
            </Text>
          </Flex>
        ) : (
          <View style={{ paddingHorizontal: spacing.s }}>
            <DraggableFlatList<ListItem>
              data={draggableData}
              keyExtractor={(item, i) =>
                item.kind === 'now-playing'
                  ? `np-${item.trackId}`
                  : item.kind === 'queued'
                    ? `q-${item.queueIndex}`
                    : `un-${item.trackId}-${i}`
              }
              renderItem={renderQueuedItem as any}
              onDragBegin={() => {
                setIsItemDragging(true)
                haptics.medium()
              }}
              onDragEnd={({ from, to }) => {
                handleDragRelease()
                // The first item is always the now-playing track (not draggable).
                // Adjust indices to match the queuedListData (which excludes
                // now-playing).
                const adjFrom = nowPlaying ? from - 1 : from
                const adjTo = nowPlaying ? to - 1 : to
                if (adjFrom < 0 || adjTo < 0) return
                handleReorder({ from: adjFrom, to: adjTo })
              }}
              activationDistance={20}
              scrollEnabled
            />
          </View>
        )}

        {nextFromIds.length > 0 ? (
          <View
            style={{
              paddingHorizontal: spacing.s,
              paddingTop: spacing.m
            }}
          >
            <View
              style={{ paddingHorizontal: spacing.s, marginBottom: spacing.s }}
            >
              <Text variant='title' size='m' color='default'>
                {messages.upNext}
              </Text>
              <Text variant='body' size='s' color='subdued'>
                {messages.playingFrom}
                <Text variant='body' size='s' color='accent'>
                  {sourceLabel(sourceKey)}
                </Text>
              </Text>
            </View>
            {nextFromIds.map((trackId) => (
              <MiniTrackRow
                key={`nf-${trackId}`}
                trackId={trackId}
                variant='up-next'
                onPlay={() => handleAddNextFromToQueue(trackId)}
              />
            ))}
          </View>
        ) : null}
      </View>
    </NativeDrawer>
  )
}
