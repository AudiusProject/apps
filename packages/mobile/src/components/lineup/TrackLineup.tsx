import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement
} from 'react'

import type { LineupData } from '@audius/common/api'
import { useCollections } from '@audius/common/api'
import {
  Kind,
  Name,
  type FavoriteSource,
  type ID,
  type PlaybackSource,
  type RepostSource,
  type UID
} from '@audius/common/models'
import { playbackActions, playbackSelectors } from '@audius/common/store'
import type {
  CommonState,
  PlaybackQuerySource,
  PlaybackTrack
} from '@audius/common/store'
import { makeStableUid } from '@audius/common/utils'
import { EntityType } from '@audius/sdk'
import { range } from 'lodash'
import type {
  SectionList as RNSectionList,
  SectionListProps,
  ViewStyle
} from 'react-native'
import { StyleSheet, View } from 'react-native'
import { useDispatch, useStore } from 'react-redux'

import { TrackRow } from '@audius/harmony-native'
import { SectionList } from 'app/components/core'
import { useBottomChinHeight } from 'app/components/core/BottomChin'
import {
  TrackTile,
  TrackRowTile,
  CollectionTile,
  LineupTileSkeleton
} from 'app/components/lineup-tile'
import { useScrollToTop } from 'app/hooks/useScrollToTop'
import { make, track } from 'app/services/analytics'

const { makeGetCurrent } = playbackSelectors
const { getPlaying } = playbackSelectors

const LOAD_MORE_THRESHOLD = 1

const styles = StyleSheet.create({
  root: { flex: 1 },
  item: { padding: 16, paddingBottom: 0 }
})

type LoadingItem = { _loading: true }
type TrackEntry = { kind: 'track'; trackId: ID; uid: UID; key: string }
type CollectionEntry = { kind: 'collection'; collectionId: ID; key: string }
type Entry = TrackEntry | CollectionEntry
type RenderItem = Entry | LoadingItem

type Section = {
  data: RenderItem[]
}

const SkeletonTileView = memo(function SkeletonTileView(props: {
  itemStyles?: ViewStyle
  isRow?: boolean
  rank?: number
}) {
  if (props.isRow) return <TrackRow isLoading rank={props.rank} />
  return (
    <View style={[styles.item, props.itemStyles]}>
      <LineupTileSkeleton />
    </View>
  )
})

export type TrackLineupProps = {
  trackIds: ID[]

  lineupItems?: LineupData[]

  source: string

  querySource?: PlaybackQuerySource

  isPending?: boolean
  isFetching?: boolean
  hasNextPage?: boolean
  loadNextPage?: () => void
  refresh?: () => void
  refreshing?: boolean

  pageSize?: number
  initialPageSize?: number
  maxEntries?: number
  isTrending?: boolean
  tileVariant?: 'tile' | 'row'
  rankIconCount?: number
  showArtistPick?: boolean
  header?: SectionListProps<unknown>['ListHeaderComponent']
  LineupEmptyComponent?: SectionListProps<unknown>['ListEmptyComponent']
  ListFooterComponent?: SectionListProps<unknown>['ListFooterComponent']
  hideHeaderOnEmpty?: boolean
  contentContainerStyle?: SectionListProps<unknown>['contentContainerStyle']
  onScroll?: SectionListProps<unknown>['onScroll']
  itemStyles?: ViewStyle
  pullToRefresh?: boolean
  disableTopTabScroll?: boolean
  onPressItem?: (id: ID) => void
  playbackSource?: PlaybackSource
  favoriteSource?: FavoriteSource
  repostSource?: RepostSource

  delineatorMap?: Record<number, ReactElement>
}

export const TrackLineup = ({
  trackIds,
  lineupItems,
  source,
  querySource,
  isPending = false,
  isFetching = false,
  hasNextPage = false,
  loadNextPage,
  refresh,
  refreshing,
  pageSize = 10,
  initialPageSize,
  maxEntries = Infinity,
  isTrending = false,
  tileVariant = 'tile',
  rankIconCount = 0,
  showArtistPick = false,
  header,
  LineupEmptyComponent,
  ListFooterComponent,
  hideHeaderOnEmpty,
  contentContainerStyle,
  onScroll,
  itemStyles,
  pullToRefresh,
  disableTopTabScroll,
  onPressItem,
  playbackSource,
  favoriteSource,
  repostSource,
  delineatorMap
}: TrackLineupProps) => {
  const dispatch = useDispatch()
  const ref = useRef<RNSectionList>(null)

  const store = useStore<CommonState>()
  const getCurrentQueueItem = useMemo(() => makeGetCurrent(), [])

  const uidFor = useCallback(
    (id: ID) => makeStableUid(Kind.TRACKS, id, source),
    [source]
  )
  const visibleItems: LineupData[] = useMemo(() => {
    const source =
      lineupItems ?? trackIds.map((id) => ({ id, type: EntityType.TRACK }))
    const end = Math.min(source.length, maxEntries)
    return source.slice(0, end)
  }, [lineupItems, trackIds, maxEntries])

  const collectionIds = useMemo(
    () =>
      visibleItems.filter((i) => i.type !== EntityType.TRACK).map((i) => i.id),
    [visibleItems]
  )
  const { byId: collectionsById } = useCollections(collectionIds)

  const tracksForPlayback: PlaybackTrack[] = useMemo(() => {
    const queue: PlaybackTrack[] = []
    for (const item of visibleItems) {
      if (item.type === EntityType.TRACK) {
        queue.push({ trackId: item.id, source })
      } else {
        const trackIds =
          collectionsById[item.id]?.playlist_contents?.track_ids ?? []
        for (const { track } of trackIds) {
          queue.push({ trackId: track, source, collectionId: item.id })
        }
      }
    }
    return queue
  }, [visibleItems, collectionsById, source])

  const togglePlay = useCallback(
    ({
      id,
      collectionId
    }: {
      uid?: UID
      id: ID
      source?: PlaybackSource
      collectionId?: ID
    }) => {
      const state = store.getState()
      const currentLegacy = getCurrentQueueItem(state)
      const isPlaying = getPlaying(state)
      const currentTrackId = currentLegacy?.trackId ?? null
      const currentSource = currentLegacy?.source ?? null
      const isSameTile = currentTrackId === id && currentSource === source
      const recordPlayback = (play: boolean) => {
        if (!playbackSource) return
        const properties = { id: `${id}`, source: playbackSource }
        track(
          make(
            play
              ? { eventName: Name.PLAYBACK_PLAY, ...properties }
              : { eventName: Name.PLAYBACK_PAUSE, ...properties }
          )
        )
      }
      if (isSameTile && isPlaying) {
        dispatch(playbackActions.togglePlay())
        recordPlayback(false)
        return
      }
      if (isSameTile && !isPlaying) {
        dispatch(playbackActions.play())
        recordPlayback(true)
        return
      }
      const startIndex =
        collectionId != null
          ? tracksForPlayback.findIndex(
              (t) => t.collectionId === collectionId && t.trackId === id
            )
          : tracksForPlayback.findIndex(
              (t) => t.collectionId == null && t.trackId === id
            )
      if (startIndex < 0) return
      dispatch(
        playbackActions.playFrom({
          tracks: tracksForPlayback,
          startIndex,
          querySource: querySource ?? null
        })
      )
      recordPlayback(true)
    },
    [
      dispatch,
      tracksForPlayback,
      querySource,
      store,
      getCurrentQueueItem,
      source,
      playbackSource
    ]
  )

  const entries: Entry[] = useMemo(() => {
    const seen = new Map<string, number>()
    const keyFor = (base: string) => {
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)
      return count === 0 ? base : `${base}-${count}`
    }
    return visibleItems.map((item) =>
      item.type === EntityType.TRACK
        ? {
            kind: 'track' as const,
            trackId: item.id,
            uid: uidFor(item.id),
            key: keyFor(`track-${item.id}`)
          }
        : {
            kind: 'collection' as const,
            collectionId: item.id,
            key: keyFor(`collection-${item.id}`)
          }
    )
  }, [visibleItems, uidFor])

  const [isLoadMoreTriggered, setIsLoadMoreTriggered] = useState(false)
  const prevEntriesLengthRef = useRef(entries.length)
  useEffect(() => {
    if (entries.length !== prevEntriesLengthRef.current) {
      prevEntriesLengthRef.current = entries.length
      setIsLoadMoreTriggered(false)
    }
  }, [entries.length])
  useEffect(() => {
    if (!isFetching) setIsLoadMoreTriggered(false)
  }, [isFetching])

  const sections: Section[] = useMemo(() => {
    const getSkeletonCount = () => {
      if (entries.length === 0 && (isPending || isFetching)) {
        return Math.min(maxEntries, initialPageSize ?? pageSize)
      }
      if (isLoadMoreTriggered) {
        return Math.min(maxEntries, pageSize)
      }
      return 0
    }
    const skeletons = range(getSkeletonCount()).map(
      () => ({ _loading: true }) as LoadingItem
    )
    const data: RenderItem[] = [...entries, ...skeletons]
    if (data.length === 0) return []
    return [{ data }]
  }, [
    entries,
    isPending,
    isFetching,
    isLoadMoreTriggered,
    initialPageSize,
    pageSize,
    maxEntries
  ])

  const isRow = tileVariant === 'row'

  const renderItem = useCallback(
    ({ item, index }: { item: RenderItem; index: number }) => {
      if ((item as LoadingItem)._loading) {
        return (
          <SkeletonTileView
            itemStyles={itemStyles}
            isRow={isRow}
            rank={isTrending ? index + 1 : undefined}
          />
        )
      }
      const entry = item as Entry
      const delineator = delineatorMap?.[index] ?? null
      if (isRow && entry.kind === 'track') {
        return (
          <>
            <TrackRowTile
              id={entry.trackId}
              uid={entry.uid}
              index={index}
              isTrending={isTrending}
              togglePlay={togglePlay}
              onPress={onPressItem}
              showArtistPick={showArtistPick}
            />
            {delineator}
          </>
        )
      }
      return (
        <>
          <View style={[styles.item, itemStyles]}>
            {entry.kind === 'track' ? (
              <TrackTile
                id={entry.trackId}
                uid={entry.uid}
                index={index}
                isTrending={isTrending}
                togglePlay={togglePlay}
                onPress={onPressItem}
                showArtistPick={showArtistPick}
                favoriteSource={favoriteSource}
                repostSource={repostSource}
              />
            ) : (
              <CollectionTile
                id={entry.collectionId}
                index={index}
                isTrending={isTrending}
                togglePlay={togglePlay}
              />
            )}
          </View>
          {delineator}
        </>
      )
    },
    [
      itemStyles,
      isRow,
      isTrending,
      togglePlay,
      onPressItem,
      showArtistPick,
      favoriteSource,
      repostSource,
      delineatorMap
    ]
  )

  const handleLoadMore = useCallback(() => {
    if (!hasNextPage || isFetching || isLoadMoreTriggered) return
    if (!loadNextPage) return
    setIsLoadMoreTriggered(true)
    loadNextPage()
  }, [hasNextPage, isFetching, isLoadMoreTriggered, loadNextPage])

  const scrollToTop = useCallback(() => {
    if (entries.length === 0) return
    ref.current?.scrollToLocation({
      sectionIndex: 0,
      itemIndex: 0,
      animated: true
    })
  }, [entries.length])

  useScrollToTop(scrollToTop, disableTopTabScroll)

  const bottomChin = useBottomChinHeight()
  const listContentStyle = useMemo(
    () => [{ paddingBottom: bottomChin }, contentContainerStyle],
    [bottomChin, contentContainerStyle]
  )

  const isEmpty = !isPending && !isFetching && entries.length === 0
  const pullToRefreshProps = pullToRefresh
    ? { onRefresh: isEmpty ? undefined : refresh, refreshing: !!refreshing }
    : {}

  return (
    <View style={styles.root}>
      <SectionList
        {...pullToRefreshProps}
        ref={ref}
        contentContainerStyle={listContentStyle}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={hideHeaderOnEmpty && isEmpty ? undefined : header}
        ListFooterComponent={hasNextPage ? null : ListFooterComponent}
        hideBottomChin={true}
        ListEmptyComponent={LineupEmptyComponent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={LOAD_MORE_THRESHOLD}
        windowSize={11}
        sections={isEmpty ? [] : sections}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item: any, index: number) => {
          if ((item as LoadingItem)._loading) return `skeleton-${index}`
          return (item as Entry).key
        }}
        renderItem={renderItem}
        scrollIndicatorInsets={{ right: Number.MIN_VALUE }}
      />
    </View>
  )
}
