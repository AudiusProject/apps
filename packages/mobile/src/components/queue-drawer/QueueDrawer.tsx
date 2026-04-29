import { Fragment, useCallback, useMemo, useState } from 'react'

import { useTrackHistory } from '@audius/common/api'
import {
  playbackActions,
  playbackSelectors,
  QueueSource
} from '@audius/common/store'
import type { PlaybackTrack } from '@audius/common/store'
import { FlatList, Pressable, View } from 'react-native'
import DraggableFlatList, {
  OpacityDecorator
} from 'react-native-draggable-flatlist'
import { useDispatch, useSelector } from 'react-redux'

import {
  Divider,
  Flex,
  IconButton,
  IconClose,
  LoadingSpinner,
  PlainButton,
  Text,
  useTheme
} from '@audius/harmony-native'
import { NativeDrawer } from 'app/components/drawer'
import { TrackListItem } from 'app/components/track-list/TrackListItem'
import * as haptics from 'app/haptics'
import { useDrawer } from 'app/hooks/useDrawer'

const { getPlaybackQueue, getPlaybackIndex } = playbackSelectors
const {
  playTrackAt,
  removeFromQueue,
  reorder,
  clearUpcoming,
  togglePlay,
  playFrom
} = playbackActions

const DRAWER_NAME = 'Queue'

const messages = {
  queue: 'Queue',
  history: 'History',
  nowPlaying: 'Now playing',
  upNext: 'Up Next',
  clear: 'Clear',
  emptyQueue: 'Your queue is empty.',
  emptyHistory: "You haven't played any tracks yet."
}

type Tab = 'queue' | 'history'

const TabButton = ({
  label,
  active,
  onPress
}: {
  label: string
  active: boolean
  onPress: () => void
}) => {
  const { color, spacing } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityState={{ selected: active }}
      style={{
        position: 'relative',
        paddingVertical: spacing.m,
        paddingHorizontal: spacing.s
      }}
    >
      <Text
        variant='title'
        size='m'
        strength='strong'
        color={active ? 'default' : 'subdued'}
      >
        {label}
      </Text>
      {active ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: -1,
            height: 3,
            backgroundColor: color.secondary.s400,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20
          }}
        />
      ) : null}
    </Pressable>
  )
}

const QueueTabContent = () => {
  const dispatch = useDispatch()
  const queue = useSelector(getPlaybackQueue)
  const index = useSelector(getPlaybackIndex)

  const nowPlaying = index >= 0 && index < queue.length ? queue[index] : null
  const upNext = useMemo<PlaybackTrack[]>(
    () => (index >= 0 ? queue.slice(index + 1) : []),
    [queue, index]
  )
  const upNextStart = index >= 0 ? index + 1 : 0

  const handleTogglePlay = useCallback(() => {
    dispatch(togglePlay())
  }, [dispatch])

  const handlePlayUpNext = useCallback(
    (_uid: string, trackId: number) => {
      const queueIndex = queue.findIndex(
        (t, i) => i >= upNextStart && t.trackId === trackId
      )
      if (queueIndex < 0) return
      dispatch(playTrackAt({ index: queueIndex }))
    },
    [dispatch, queue, upNextStart]
  )

  const handleRemove = useCallback(
    (relativeIndex: number) => {
      dispatch(removeFromQueue({ index: upNextStart + relativeIndex }))
    },
    [dispatch, upNextStart]
  )

  const handleReorder = useCallback(
    ({ from, to }: { from: number; to: number }) => {
      if (from === to) return
      const orderedUids = queue
        .map((t) => t.uid)
        .filter((uid): uid is string => !!uid)
      if (orderedUids.length !== queue.length) return
      const headLen = upNextStart
      const head = orderedUids.slice(0, headLen)
      const tail = orderedUids.slice(headLen)
      const [moved] = tail.splice(from, 1)
      tail.splice(to, 0, moved)
      dispatch(reorder({ orderedUids: [...head, ...tail] }))
    },
    [dispatch, queue, upNextStart]
  )

  const handleClear = useCallback(() => {
    dispatch(clearUpcoming())
  }, [dispatch])

  if (queue.length === 0) {
    return (
      <Flex pv='2xl' alignItems='center'>
        <Text variant='body' size='m' color='subdued'>
          {messages.emptyQueue}
        </Text>
      </Flex>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {nowPlaying ? (
        <Fragment>
          <Flex ph='m' pb='s'>
            <Text variant='title' size='m' color='default'>
              {messages.nowPlaying}
            </Text>
          </Flex>
          <TrackListItem
            id={nowPlaying.trackId}
            index={index}
            togglePlay={handleTogglePlay}
          />
        </Fragment>
      ) : null}

      {upNext.length > 0 ? (
        <View style={{ flex: 1, marginTop: 8 }}>
          <Flex
            direction='row'
            alignItems='center'
            justifyContent='space-between'
            ph='m'
            pb='s'
          >
            <Text variant='title' size='m' color='default'>
              {messages.upNext}
            </Text>
            <PlainButton onPress={handleClear}>{messages.clear}</PlainButton>
          </Flex>
          <DraggableFlatList
            data={upNext.map((t) => t.trackId)}
            keyExtractor={(item, i) => `${item}-${i}`}
            onDragBegin={() => haptics.medium()}
            onDragEnd={({ from, to }) => handleReorder({ from, to })}
            activationDistance={20}
            renderItem={({ item, getIndex, drag }) => {
              const i = getIndex() ?? 0
              return (
                <OpacityDecorator>
                  <TrackListItem
                    id={item as number}
                    index={i}
                    isReorderable
                    onDrag={drag}
                    togglePlay={handlePlayUpNext}
                    onRemove={handleRemove}
                    trackItemAction='remove'
                  />
                </OpacityDecorator>
              )
            }}
          />
        </View>
      ) : null}
    </View>
  )
}

const HistoryTabContent = () => {
  const dispatch = useDispatch()
  const { trackIds, isPending, isFetching } = useTrackHistory({ pageSize: 50 })
  const isLoading = isPending && isFetching

  const handlePlayHistory = useCallback(
    (_uid: string, trackId: number) => {
      const startIndex = trackIds.findIndex((id) => id === trackId)
      if (startIndex < 0) return
      const tracks = trackIds.map((id) => ({
        trackId: id,
        source: QueueSource.HISTORY_TRACKS
      }))
      dispatch(playFrom({ tracks, startIndex, querySource: null }))
    },
    [dispatch, trackIds]
  )

  if (isLoading) {
    return (
      <Flex pv='2xl' alignItems='center'>
        <LoadingSpinner />
      </Flex>
    )
  }

  if (trackIds.length === 0) {
    return (
      <Flex pv='2xl' alignItems='center'>
        <Text variant='body' size='m' color='subdued'>
          {messages.emptyHistory}
        </Text>
      </Flex>
    )
  }

  return (
    <FlatList
      data={trackIds}
      keyExtractor={(item, i) => `${item}-${i}`}
      renderItem={({ item, index: i }) => (
        <TrackListItem
          id={item}
          index={i}
          togglePlay={handlePlayHistory}
          trackItemAction='overflow'
        />
      )}
    />
  )
}

export const QueueDrawer = () => {
  const { onClose } = useDrawer(DRAWER_NAME)
  const [tab, setTab] = useState<Tab>('queue')

  return (
    <NativeDrawer
      drawerName={DRAWER_NAME}
      onClose={onClose}
      isFullscreen
      drawerStyle={{ paddingHorizontal: 0, paddingVertical: 0 }}
    >
      <View style={{ flex: 1, width: '100%' }}>
        <Flex
          direction='row'
          alignItems='center'
          justifyContent='space-between'
          ph='l'
          pv='m'
        >
          <Flex direction='row' gap='m'>
            <TabButton
              label={messages.queue}
              active={tab === 'queue'}
              onPress={() => setTab('queue')}
            />
            <TabButton
              label={messages.history}
              active={tab === 'history'}
              onPress={() => setTab('history')}
            />
          </Flex>
          <IconButton
            icon={IconClose}
            color='subdued'
            size='m'
            aria-label='Close queue'
            onPress={onClose}
          />
        </Flex>
        <Divider orientation='horizontal' />
        <View style={{ flex: 1, paddingTop: 8 }}>
          {tab === 'queue' ? <QueueTabContent /> : <HistoryTabContent />}
        </View>
      </View>
    </NativeDrawer>
  )
}
