import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement
} from 'react'

import {
  Kind,
  type ID,
  type PlaybackSource,
  type UID
} from '@audius/common/models'
import { playbackActions, playbackSelectors } from '@audius/common/store'
import type { PlaybackQuerySource, PlaybackTrack } from '@audius/common/store'
import { makeStableUid } from '@audius/common/utils'
import { range } from 'lodash'
import type {
  SectionList as RNSectionList,
  SectionListProps,
  ViewStyle
} from 'react-native'
import { StyleSheet, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { SectionList } from 'app/components/core'
import { TrackTile, LineupTileSkeleton } from 'app/components/lineup-tile'
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
type Entry = { trackId: ID; uid: UID }
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

  const visibleTrackIds = useMemo(() => {
    const end = Math.min(trackIds.length, maxEntries)
    return trackIds.slice(0, end)
  }, [trackIds, maxEntries])

  const tracksForPlayback: PlaybackTrack[] = useMemo(
    () =>
      visibleTrackIds.map((id) => ({
        trackId: id,
        source,
        uid: uidFor(id)
      })),
    [visibleTrackIds, source, uidFor]
  )

  const togglePlay = useCallback(
    ({ id }: { uid: UID; id: ID; source: PlaybackSource }) => {
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
      const startIndex = visibleTrackIds.indexOf(id)
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
      visibleTrackIds,
      querySource,
      currentLegacy?.trackId,
      currentLegacy?.source,
      source,
      isPlaying
    ]
  )

  const entries: Entry[] = useMemo(
    () => visibleTrackIds.map((id) => ({ trackId: id, uid: uidFor(id) })),
    [visibleTrackIds, uidFor]
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
            <TrackTile
              id={entry.trackId}
              uid={entry.uid}
              index={index}
              isTrending={isTrending}
              togglePlay={togglePlay}
              onPress={onPressItem}
              showArtistPick={showArtistPick}
            />
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
        keyExtractor={(item: any, index: number) =>
          (item as LoadingItem)._loading
            ? `skeleton-${index}`
            : `${(item as Entry).uid}-${index}`
        }
        renderItem={renderItem}
        scrollIndicatorInsets={{ right: Number.MIN_VALUE }}
      />
    </View>
  )
}
