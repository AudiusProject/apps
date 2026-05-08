import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { Name, SquareSizes } from '@audius/common/models'
import type { QueueSource } from '@audius/common/store'
import { playbackActions, playbackSelectors } from '@audius/common/store'
import { useQueryClient } from '@tanstack/react-query'
import { make, useRecord } from 'common/store/analytics/actions'
import { Dimensions, Pressable, View } from 'react-native'
import DraggableFlatList from 'react-native-draggable-flatlist'
import { useDispatch, useSelector } from 'react-redux'

import {
  Divider,
  Flex,
  IconButton,
  IconCaretDown,
  IconCaretUp,
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

const SCREEN_HEIGHT = Dimensions.get('window').height
// Default (non-fullscreen) drawer takes ~85% of the screen so the user can
// still see/dismiss the drawer by tapping the dimmed background, and so the
// drag handle and header are guaranteed to be on-screen regardless of how
// long the queue is.
const COLLAPSED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.85)
// Fixed row height — required so getItemLayout works and initialScrollIndex
// doesn't break scroll bounds.
const ROW_HEIGHT = 64

const messages = {
  queue: 'Queue',
  upNext: 'Up Next',
  clear: 'Clear',
  emptyQueue: 'Your queue is empty.',
  playingFrom: 'Playing from ',
  expand: 'Expand queue',
  collapse: 'Collapse queue'
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
  variant: 'now-playing' | 'past' | 'upcoming' | 'next-from'
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
  const isPast = variant === 'past'

  return (
    <Pressable
      onPress={onPlay}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.s,
        gap: spacing.m,
        height: ROW_HEIGHT,
        opacity: isPast ? 0.6 : 1
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

type ListItem = {
  kind: 'past' | 'now-playing' | 'upcoming'
  trackId: ID
  queueIndex: number
}

const useNextFromSourceMobile = () => {
  const querySource = useSelector(getQuerySource)
  const queue = useSelector(getPlaybackQueue)
  const queryClient = useQueryClient()

  return useMemo<{ trackIds: ID[]; sourceKey: string | null }>(() => {
    if (!querySource) return { trackIds: [], sourceKey: null }
    type LineupItem = { id: number | string; type?: string }
    // Most lineup pages are `LineupItem[]`. The remixes/contest lineup wraps
    // its items in `{ count, tracks: LineupItem[] }` — without this branch,
    // `for (const item of page)` would throw on the object and crash the
    // drawer when a contest track is playing.
    type LineupPage = LineupItem[] | { tracks: LineupItem[] }
    const data = queryClient.getQueryData<{ pages: LineupPage[] }>(
      querySource.queryKey as any
    )
    const sourceKey =
      Array.isArray(querySource.queryKey) && querySource.queryKey[0]
        ? String(querySource.queryKey[0])
        : null
    if (!data?.pages) return { trackIds: [], sourceKey }

    const inQueue = new Set(queue.map((t) => t.trackId))
    const upcoming: ID[] = []
    for (const page of data.pages) {
      const items: LineupItem[] = Array.isArray(page)
        ? page
        : Array.isArray(page?.tracks)
          ? page.tracks
          : []
      for (const item of items) {
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
  const { isOpen, onClose } = useDrawer(DRAWER_NAME)
  const dispatch = useDispatch()
  const queue = useSelector(getPlaybackQueue)
  const index = useSelector(getPlaybackIndex)
  const isPlaying = useSelector(getIsPlaying)
  const { spacing, color } = useTheme()
  const { trackIds: nextFromIds, sourceKey } = useNextFromSourceMobile()
  const record = useRecord()

  const [isFullscreen, setIsFullscreen] = useState(false)
  const listRef = useRef<any>(null)

  // Reset fullscreen state when the drawer fully closes so the next open
  // starts in the collapsed state.
  useEffect(() => {
    if (!isOpen) setIsFullscreen(false)
  }, [isOpen])

  const queueLengthRef = useRef(queue.length)
  useEffect(() => {
    queueLengthRef.current = queue.length
  }, [queue.length])
  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      record(
        make(Name.PLAY_QUEUE_OPEN, {
          source: 'queue',
          queueLength: queueLengthRef.current
        })
      )
    } else if (!isOpen && wasOpenRef.current) {
      record(make(Name.PLAY_QUEUE_CLOSE, { source: 'queue' }))
    }
    wasOpenRef.current = isOpen
  }, [isOpen, record])

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

  // Build full queue list — past, now-playing, and upcoming all rendered so
  // the user can scroll above the now-playing track to see history.
  const listData = useMemo<ListItem[]>(
    () =>
      queue.map((t, i) => ({
        kind:
          i < index
            ? ('past' as const)
            : i === index
              ? ('now-playing' as const)
              : ('upcoming' as const),
        trackId: t.trackId,
        queueIndex: i
      })),
    [queue, index]
  )

  const handleTogglePlay = useCallback(() => {
    dispatch(togglePlay())
  }, [dispatch])

  const handlePlayQueueItem = useCallback(
    (queueIndex: number) => {
      dispatch(playTrackAt({ index: queueIndex }))
      const trackId = queue[queueIndex]?.trackId
      if (trackId !== undefined) {
        record(
          make(Name.PLAY_QUEUE_PLAY_TRACK, {
            source: 'queue',
            trackId: String(trackId),
            position: queueIndex
          })
        )
      }
    },
    [dispatch, queue, record]
  )

  const handleRemove = useCallback(
    (queueIndex: number) => {
      const trackId = queue[queueIndex]?.trackId
      dispatch(removeFromQueue({ index: queueIndex }))
      if (trackId !== undefined) {
        record(
          make(Name.PLAY_QUEUE_REMOVE_TRACK, {
            source: 'queue',
            trackId: String(trackId),
            position: queueIndex
          })
        )
      }
    },
    [dispatch, queue, record]
  )

  const upNextStart = index >= 0 ? index + 1 : 0
  const handleClear = useCallback(() => {
    const upcomingLength = Math.max(queue.length - upNextStart, 0)
    dispatch(clearUpcoming())
    record(
      make(Name.PLAY_QUEUE_CLEAR, {
        source: 'queue',
        queueLength: upcomingLength
      })
    )
  }, [dispatch, queue.length, upNextStart, record])

  // Reorder is only valid for upcoming tracks (anything after the now-playing
  // index). The from/to indices come from the rendered list and align with
  // the underlying queue index because we render the entire queue.
  const handleListReorder = useCallback(
    ({ from, to }: { from: number; to: number }) => {
      if (from === to) return
      if (index < 0) return
      if (from <= index || to <= index) return
      const orderedIndices = Array.from({ length: queue.length }, (_, i) => i)
      const [moved] = orderedIndices.splice(from, 1)
      orderedIndices.splice(to, 0, moved)
      dispatch(reorder({ orderedIndices }))
      const movedTrackId = queue[from]?.trackId
      if (movedTrackId !== undefined) {
        record(
          make(Name.PLAY_QUEUE_REORDER_TRACK, {
            source: 'queue',
            trackId: String(movedTrackId),
            fromPosition: from,
            toPosition: to
          })
        )
      }
    },
    [dispatch, queue, index, record]
  )

  const handleAddNextFromToQueue = useCallback(
    (trackId: ID) => {
      const sourceTag = String(sourceKey ?? 'next-from')
      dispatch(
        addToQueue({
          tracks: [{ trackId, source: sourceTag as unknown as QueueSource }]
        })
      )
      record(
        make(Name.PLAY_QUEUE_ADD_TRACK, {
          source: 'queue',
          trackId: String(trackId),
          from: 'queue'
        })
      )
    },
    [dispatch, sourceKey, record]
  )

  const renderItem = useCallback(
    ({ item, drag }: { item: ListItem; drag: () => void }) => {
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
      if (item.kind === 'past') {
        return (
          <MiniTrackRow
            trackId={item.trackId}
            variant='past'
            onPlay={() => handlePlayQueueItem(item.queueIndex)}
          />
        )
      }
      return (
        <MiniTrackRow
          trackId={item.trackId}
          variant='upcoming'
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

  const isEmpty = queue.length === 0

  const initialScrollIndex =
    index >= 0 && index < listData.length ? index : undefined

  // FlatList row layout — required for initialScrollIndex to behave correctly
  // and avoid clipped scroll bounds.
  const getItemLayout = useCallback(
    (_data: ArrayLike<ListItem> | null | undefined, i: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * i,
      index: i
    }),
    []
  )

  const renderListFooter = useCallback(() => {
    if (nextFromIds.length === 0) return null
    return (
      <View
        style={{
          paddingTop: spacing.l
        }}
      >
        <View style={{ paddingHorizontal: spacing.s, marginBottom: spacing.s }}>
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
            variant='next-from'
            onPlay={() => handleAddNextFromToQueue(trackId)}
          />
        ))}
      </View>
    )
  }, [nextFromIds, sourceKey, spacing.l, spacing.s, handleAddNextFromToQueue])

  return (
    <NativeDrawer
      drawerName={DRAWER_NAME}
      onClose={onClose}
      drawerStyle={{ paddingHorizontal: 0, paddingVertical: 0 }}
      gesturesDisabled={isItemDragging}
    >
      <View
        style={{
          width: '100%',
          height: isFullscreen ? SCREEN_HEIGHT : COLLAPSED_HEIGHT
        }}
      >
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
          pv='m'
        >
          <Text variant='title' size='l' strength='strong' color='default'>
            {messages.queue}
          </Text>
          <Flex direction='row' alignItems='center' gap='m'>
            {!isEmpty ? (
              <PlainButton onPress={handleClear}>{messages.clear}</PlainButton>
            ) : null}
            <IconButton
              icon={isFullscreen ? IconCaretDown : IconCaretUp}
              size='m'
              color='subdued'
              aria-label={isFullscreen ? messages.collapse : messages.expand}
              onPress={() => setIsFullscreen((s) => !s)}
            />
          </Flex>
        </Flex>
        <Divider orientation='horizontal' />

        {isEmpty ? (
          <Flex pv='2xl' alignItems='center'>
            <Text variant='body' size='m' color='subdued'>
              {messages.emptyQueue}
            </Text>
          </Flex>
        ) : (
          <View
            style={{
              flex: 1,
              paddingHorizontal: spacing.s,
              paddingTop: spacing.xs
            }}
          >
            <DraggableFlatList<ListItem>
              ref={listRef as any}
              data={listData}
              keyExtractor={(item) => `q-${item.queueIndex}-${item.trackId}`}
              renderItem={renderItem as any}
              getItemLayout={getItemLayout}
              initialScrollIndex={initialScrollIndex}
              onScrollToIndexFailed={(info) => {
                const wait = setTimeout(() => {
                  listRef.current?.scrollToIndex({
                    index: Math.min(
                      info.index,
                      Math.max(info.highestMeasuredFrameIndex, 0)
                    ),
                    animated: false
                  })
                }, 100)
                return () => clearTimeout(wait)
              }}
              showsVerticalScrollIndicator
              onDragBegin={() => {
                setIsItemDragging(true)
                haptics.medium()
              }}
              onDragEnd={({ from, to }) => {
                handleDragRelease()
                handleListReorder({ from, to })
              }}
              activationDistance={20}
              ListFooterComponent={renderListFooter}
              contentContainerStyle={{ paddingBottom: spacing.l }}
            />
          </View>
        )}
      </View>
    </NativeDrawer>
  )
}
