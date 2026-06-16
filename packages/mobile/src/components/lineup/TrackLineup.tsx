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
  type ID,
  type PlaybackSource,
  type UID
} from '@audius/common/models'
import { playbackActions, playbackSelectors } from '@audius/common/store'
import type { PlaybackQuerySource, PlaybackTrack } from '@audius/common/store'
import { makeStableUid } from '@audius/common/utils'
import { EntityType } from '@audius/sdk'
import { range } from 'lodash'
import type {
  SectionList as RNSectionList,
  SectionListProps,
  ViewStyle
} from 'react-native'
import { StyleSheet, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { SectionList } from 'app/components/core'
import {
  TrackTile,
  CollectionTile,
  LineupTileSkeleton
} from 'app/components/lineup-tile'
import { useScrollToTop } from 'app/hooks/useScrollToTop'

const { makeGetCurrent } = playbackSelectors
const { getPlaying } = playbackSelectors
const { getCurrentTrackId: getPlaybackCurrentTrackId } = playbackSelectors

// Threshold for `onEndReachedThreshold` (fraction of viewport length).
// 1.0 means "fetch when one full viewport of content remains below" so the
// next page request is in flight well before the user actually hits the
// bottom of the list.
const LOAD_MORE_THRESHOLD = 1

const styles = StyleSheet.create({
  root: { flex: 1 },
  item: { padding: 16, paddingBottom: 0 }
})

type LoadingItem = { _loading: true }
type TrackEntry = { kind: 'track'; trackId: ID; uid: UID }
type CollectionEntry = { kind: 'collection'; collectionId: ID }
type Entry = TrackEntry | CollectionEntry
type RenderItem = Entry | LoadingItem

type Section = {
  data: RenderItem[]
}

const SkeletonTileView = memo(function SkeletonTileView(props: {
  itemStyles?: ViewStyle
}) {
  return (
    <View style={[styles.item, props.itemStyles]}>
      <LineupTileSkeleton />
    </View>
  )
})

export type TrackLineupProps = {
  // Ordered list of track IDs to render. Tiles read full track data from the
  // tanquery cache (primed by whatever hook produced this list).
  trackIds: ID[]

  // Optional mixed track/collection list. When provided, the lineup renders
  // collection tiles inline for `PLAYLIST`/`ALBUM` entries and track tiles
  // for `TRACK` entries (the For You feed uses this). When omitted the
  // lineup behaves as a pure track lineup driven by `trackIds`.
  lineupItems?: LineupData[]

  // Opaque string that tags the queue entries this lineup produces. Must
  // match the source used by the playback saga's shadow into legacy queue
  // so PlayBar-style comparisons continue working.
  source: string

  // Optional tanquery source so the playback saga can paginate when the
  // queue approaches its end during continuous playback.
  querySource?: PlaybackQuerySource

  // Loading state (from the tanquery hook driving this lineup).
  isPending?: boolean
  isFetching?: boolean
  hasNextPage?: boolean
  loadNextPage?: () => void
  refresh?: () => void
  refreshing?: boolean

  // Render config.
  pageSize?: number
  initialPageSize?: number
  maxEntries?: number
  isTrending?: boolean
  rankIconCount?: number
  showArtistPick?: boolean
  header?: SectionListProps<unknown>['ListHeaderComponent']
  LineupEmptyComponent?: SectionListProps<unknown>['ListEmptyComponent']
  ListFooterComponent?: SectionListProps<unknown>['ListFooterComponent']
  hideHeaderOnEmpty?: boolean
  itemStyles?: ViewStyle
  pullToRefresh?: boolean
  disableTopTabScroll?: boolean
  onPressItem?: (id: ID) => void
  playbackSource?: PlaybackSource

  /**
   * Map of indices (into `trackIds`) to JSX elements rendered after the
   * tile at that index. Mirrors the web TrackLineup / legacy
   * TanQueryLineup delineator pattern — used for inline section labels
   * (e.g. WINNERS / SUBMISSIONS headers on the contest submissions
   * lineup).
   */
  delineatorMap?: Record<number, ReactElement>
}

/**
 * Tanquery-first replacement for the legacy mobile `<Lineup>` /
 * `<TanQueryLineup>`. Takes an array of track IDs and dispatches through
 * the new playback slice on tile interactions. No redux lineup state.
 */
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
  rankIconCount = 0,
  showArtistPick = false,
  header,
  LineupEmptyComponent,
  ListFooterComponent,
  hideHeaderOnEmpty,
  itemStyles,
  pullToRefresh,
  disableTopTabScroll,
  onPressItem,
  delineatorMap
}: TrackLineupProps) => {
  const dispatch = useDispatch()
  const ref = useRef<RNSectionList>(null)

  const getCurrentQueueItem = useMemo(() => makeGetCurrent(), [])
  const currentLegacy = useSelector(getCurrentQueueItem)
  const isPlaying = useSelector(getPlaying)
  // playback slice is the source of truth when present; subscribed here so
  // tiles re-render when the current track changes.
  useSelector(getPlaybackCurrentTrackId)

  const uidFor = useCallback(
    (id: ID) => makeStableUid(Kind.TRACKS, id, source),
    [source]
  )
  // Build a single ordered list of mixed track/collection entries. When the
  // caller passes `lineupItems` (mixed feed) we use it verbatim; otherwise we
  // wrap the legacy `trackIds` so the rest of the component is uniform.
  const visibleItems: LineupData[] = useMemo(() => {
    const source =
      lineupItems ?? trackIds.map((id) => ({ id, type: EntityType.TRACK }))
    const end = Math.min(source.length, maxEntries)
    return source.slice(0, end)
  }, [lineupItems, trackIds, maxEntries])

  // Collection entries contribute their tracks to the playback queue inline,
  // in feed order, so a playlist/album tile is playable (tap to start) and is
  // traversed by next/previous rather than skipped. We only need the ordered
  // track ids, which live on each collection's playlist_contents — fetched
  // from cache (already primed by the rendered CollectionTiles).
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
      const currentTrackId = currentLegacy?.trackId ?? null
      const currentSource = currentLegacy?.source ?? null
      const isSameTile = currentTrackId === id && currentSource === source
      if (isSameTile && isPlaying) {
        dispatch(playbackActions.togglePlay())
        return
      }
      if (isSameTile && !isPlaying) {
        dispatch(playbackActions.play())
        return
      }
      // For a collection tile, locate the track within that collection's queue
      // segment (a track id can otherwise appear more than once in the queue).
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
    },
    [
      dispatch,
      tracksForPlayback,
      querySource,
      currentLegacy?.trackId,
      currentLegacy?.source,
      source,
      isPlaying
    ]
  )

  const entries: Entry[] = useMemo(
    () =>
      visibleItems.map((item) =>
        item.type === EntityType.TRACK
          ? {
              kind: 'track' as const,
              trackId: item.id,
              uid: uidFor(item.id)
            }
          : { kind: 'collection' as const, collectionId: item.id }
      ),
    [visibleItems, uidFor]
  )

  // Synchronous "load more was triggered" flag — set the moment the scroll
  // handler fires so skeletons render on the next frame, without waiting for
  // the parent's tanquery `isFetching` to propagate. Cleared once the parent
  // either delivers more entries or finishes fetching.
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
      if (entries.length === 0 && isPending) {
        return Math.min(maxEntries, initialPageSize ?? pageSize)
      }
      if (isFetching || isLoadMoreTriggered) {
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

  const renderItem = useCallback(
    ({ item, index }: { item: RenderItem; index: number }) => {
      if ((item as LoadingItem)._loading) {
        return <SkeletonTileView itemStyles={itemStyles} />
      }
      const entry = item as Entry
      const delineator = delineatorMap?.[index] ?? null
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
      isTrending,
      togglePlay,
      onPressItem,
      showArtistPick,
      delineatorMap
    ]
  )

  // Single, synchronous load-more entry point. Flipping the local flag in the
  // same tick as dispatching the parent's `loadNextPage` makes the skeletons
  // render on the very next frame, instead of after a debounce window plus
  // the round-trip through tanquery's `isFetching`.
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

  const isEmpty = !isPending && !isFetching && entries.length === 0
  const pullToRefreshProps = pullToRefresh
    ? { onRefresh: isEmpty ? undefined : refresh, refreshing: !!refreshing }
    : {}

  return (
    <View style={styles.root}>
      <SectionList
        {...pullToRefreshProps}
        ref={ref}
        ListHeaderComponent={hideHeaderOnEmpty && isEmpty ? undefined : header}
        ListFooterComponent={hasNextPage ? null : ListFooterComponent}
        hidePlayBarChin={true}
        ListEmptyComponent={LineupEmptyComponent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={LOAD_MORE_THRESHOLD}
        sections={isEmpty ? [] : sections}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item: any, index: number) => {
          if ((item as LoadingItem)._loading) return `skeleton-${index}`
          const entry = item as Entry
          return entry.kind === 'track'
            ? `track-${entry.uid}-${index}`
            : `collection-${entry.collectionId}-${index}`
        }}
        renderItem={renderItem}
        scrollIndicatorInsets={{ right: Number.MIN_VALUE }}
      />
    </View>
  )
}
