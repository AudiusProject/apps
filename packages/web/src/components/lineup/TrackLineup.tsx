import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { LineupData } from '@audius/common/api'
import { usePlayTrack, usePauseTrack } from '@audius/common/hooks'
import { FeedTab, ID, PlaybackSource, Name } from '@audius/common/models'
import { playbackActions, playbackSelectors } from '@audius/common/store'
import type {
  PlaybackTrack,
  PlaybackQuerySource,
  QueueSource
} from '@audius/common/store'
import { Divider, Flex } from '@audius/harmony'
import { EntityType } from '@audius/sdk'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { CollectionTile as DesktopCollectionTile } from 'components/track/desktop/CollectionTile'
import { TrackTile as TrackTileDesktop } from 'components/track/desktop/TrackTile'
import { CollectionTile as MobileCollectionTile } from 'components/track/mobile/CollectionTile'
import { TrackTile as MobileTrackTile } from 'components/track/mobile/TrackTile'
import { TrackTileSize, TileProps } from 'components/track/types'
import { useIsContainerNarrow } from 'hooks/useIsContainerNarrow'
import { useIsMobile } from 'hooks/useIsMobile'

import styles from './Lineup.module.css'
import { LineupVariant } from './types'

const NARROW_CONTAINER_THRESHOLD_PX = 600
// Fallback used until the scroll parent has been measured. Sized so the next
// page request fires well before the user reaches the literal bottom of the
// list. Effective threshold is `LOAD_MORE_VIEWPORTS * scrollParent.clientHeight`
// once measured.
const DEFAULT_LOAD_MORE_THRESHOLD = 1600
// Number of viewports of "remaining content" that should trigger loading the
// next page. Larger values give a bigger buffer for fast desktop scrolling so
// skeletons paint comfortably before the user reaches the bottom. Matches the
// effect of mobile's `onEndReachedThreshold` but on the larger desktop viewport
// we need more headroom to keep up with fling scrolls.
const LOAD_MORE_VIEWPORTS = 2

const { getPlaying: getPlayerPlaying } = playbackSelectors
const { makeGetCurrent } = playbackSelectors
const { getCurrentTrackId: getPlaybackCurrentTrackId } = playbackSelectors

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
  isError?: boolean
  hasNextPage?: boolean
  loadNextPage?: () => void

  // Render config.
  pageSize?: number
  initialPageSize?: number
  variant?: LineupVariant
  ordered?: boolean
  isTrending?: boolean
  isFeed?: boolean
  showArtistPick?: boolean
  endOfLineupElement?: JSX.Element
  emptyElement?: JSX.Element
  maxEntries?: number
  'aria-label'?: string
  scrollParent?: HTMLElement | null
  loadMoreThreshold?: number
  tileContainerStyles?: string
  tileStyles?: string
  lineupContainerStyles?: string
  leadingElementId?: ID | null
  leadingElementDelineator?: JSX.Element | null
  delineatorMap?: Record<number, JSX.Element>
  elementAdornment?: (elementId: ID, index: number) => JSX.Element | null
  leadingElementTileProps?: Partial<TileProps>

  onClickTile?: (trackId: ID) => void

  playbackSource?: PlaybackSource

  // The feed view (FOR_YOU / LATEST) this lineup renders, when it's the
  // feed. Stamped onto queue entries and attached to PLAYBACK_PLAY events
  // as `feed_type` so plays can be attributed to a feed view.
  feedType?: FeedTab
}

/**
 * Tanquery-first replacement for the legacy `<Lineup>` / `<TanQueryLineup>`
 * components. Takes an array of track IDs and dispatches through the new
 * playback slice on tile interactions. No redux lineup state.
 */
export const TrackLineup = ({
  trackIds,
  lineupItems,
  source,
  querySource,
  isPending = false,
  isFetching = false,
  isError = false,
  hasNextPage = false,
  loadNextPage,
  pageSize = 10,
  initialPageSize,
  variant = LineupVariant.MAIN,
  ordered = false,
  isTrending = false,
  isFeed = false,
  showArtistPick = false,
  endOfLineupElement,
  emptyElement,
  maxEntries = Infinity,
  'aria-label': ariaLabel,
  scrollParent: externalScrollParent,
  loadMoreThreshold = DEFAULT_LOAD_MORE_THRESHOLD,
  tileContainerStyles,
  tileStyles,
  lineupContainerStyles,
  leadingElementId,
  leadingElementDelineator,
  delineatorMap,
  elementAdornment,
  onClickTile,
  playbackSource = PlaybackSource.TRACK_TILE_LINEUP,
  feedType
}: TrackLineupProps) => {
  const dispatch = useDispatch()
  const isMobile = useIsMobile()
  const scrollContainer = useRef<HTMLDivElement>(null)
  const isNarrow = useIsContainerNarrow(
    scrollContainer,
    NARROW_CONTAINER_THRESHOLD_PX
  )

  const isSmallTrackTile =
    isMobile || variant === LineupVariant.SECTION || isNarrow

  const TrackTile = isSmallTrackTile ? MobileTrackTile : TrackTileDesktop
  const CollectionTile = isSmallTrackTile
    ? MobileCollectionTile
    : DesktopCollectionTile

  // For tile highlight: prefer new playback slice's current track when
  // present, else fall back to legacy current (non-trending flows). Also
  // reads isPlaying/isBuffering from legacy state (the audio service still
  // drives those via the player slice).
  const getCurrentQueueItem = useMemo(() => makeGetCurrent(), [])
  const currentLegacy = useSelector(getCurrentQueueItem)
  // Subscribe so tiles re-render when the playback slice's current track
  // changes (even if legacy queue hasn't caught up yet).
  useSelector(getPlaybackCurrentTrackId)
  const isPlaying = useSelector(getPlayerPlaying)

  // Build a single ordered list of mixed track/collection entries. When the
  // caller passes `lineupItems` (mixed feed) we use it verbatim; otherwise we
  // wrap the legacy `trackIds` so the rest of the component is uniform.
  const items: LineupData[] = useMemo(
    () => lineupItems ?? trackIds.map((id) => ({ id, type: EntityType.TRACK })),
    [lineupItems, trackIds]
  )

  // Playback queue is track-only. Collection tiles handle their own
  // play/pause via the playback slice (see `playTrack`/`pauseTrack` below).
  const playbackTrackIds = useMemo(
    () => items.filter((i) => i.type === EntityType.TRACK).map((i) => i.id),
    [items]
  )
  const tracksForPlayback: PlaybackTrack[] = useMemo(
    () =>
      playbackTrackIds.map((id) => ({
        trackId: id,
        source,
        ...(feedType ? { feedType } : {})
      })),
    [playbackTrackIds, source, feedType]
  )

  const togglePlay = useCallback(
    (trackId: ID, clickSource?: PlaybackSource) => {
      const analytics = clickSource || playbackSource
      const currentTrackId = currentLegacy?.trackId ?? null
      const currentSource = currentLegacy?.source ?? null
      const isSameTile = currentTrackId === trackId && currentSource === source
      // LineupProvider-style semantics: if we're already the playing track
      // and playing, pause; otherwise start / resume this tile.
      if (isSameTile && isPlaying) {
        dispatch(playbackActions.togglePlay())
        dispatch(
          make(Name.PLAYBACK_PAUSE, { id: `${trackId}`, source: analytics })
        )
        return
      }
      if (isSameTile && !isPlaying) {
        dispatch(playbackActions.play())
        dispatch(
          make(Name.PLAYBACK_PLAY, {
            id: `${trackId}`,
            source: analytics,
            ...(feedType ? { feed_type: feedType } : {})
          })
        )
        return
      }
      const startIndex = playbackTrackIds.indexOf(trackId)
      if (startIndex < 0) return
      dispatch(
        playbackActions.playFrom({
          tracks: tracksForPlayback,
          startIndex,
          querySource: querySource ?? null
        })
      )
      dispatch(
        make(Name.PLAYBACK_PLAY, {
          id: `${trackId}`,
          source: analytics,
          ...(feedType ? { feed_type: feedType } : {})
        })
      )
    },
    [
      dispatch,
      tracksForPlayback,
      playbackTrackIds,
      querySource,
      currentLegacy?.trackId,
      currentLegacy?.source,
      source,
      isPlaying,
      playbackSource,
      feedType
    ]
  )

  // Collection tiles drive their own internal track playback (one of the
  // playlist's tracks at a time) through the playback slice — same hooks
  // the chat-unfurled CollectionTile uses.
  const playTrack = usePlayTrack()
  const handlePlayCollectionTrack = useCallback(
    (trackId: ID) => {
      playTrack({
        id: trackId,
        // `source` on the lineup is an opaque string that tags queue entries;
        // it lines up with `QueueSource` values for well-known lineups
        // (DISCOVER_FEED here). The saga treats it as a string identifier.
        entries: [{ id: trackId, source: source as QueueSource }]
      })
    },
    [playTrack, source]
  )
  const pauseTrack = usePauseTrack()

  // Tile sizing mirrors the legacy component.
  let tileSize: TrackTileSize = TrackTileSize.LARGE
  let statSize: 'small' | 'large' = 'large'
  let containerClassName: string | undefined
  if (variant === LineupVariant.MAIN || variant === LineupVariant.PLAYLIST) {
    tileSize = TrackTileSize.LARGE
  } else if (variant === LineupVariant.GRID) {
    tileSize = TrackTileSize.SMALL
    statSize = 'small'
    containerClassName = styles.searchTrackTileContainer
  } else if (variant === LineupVariant.CONDENSED) {
    tileSize = TrackTileSize.SMALL
  }

  const lineupStyle =
    variant === LineupVariant.MAIN || variant === LineupVariant.PLAYLIST
      ? styles.main
      : styles.section

  const visibleItems = useMemo(() => {
    const end = Math.min(items.length, maxEntries)
    return items.slice(0, end)
  }, [items, maxEntries])

  // Track the scroll parent's viewport height so the load-more threshold is a
  // multiple of one full viewport. Falls back to the constant until measured.
  const [scrollParentHeight, setScrollParentHeight] = useState<number | null>(
    null
  )
  useEffect(() => {
    const parent =
      externalScrollParent ?? document.getElementById('mainContent')
    if (!parent) return
    const update = () => setScrollParentHeight(parent.clientHeight || null)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [externalScrollParent])

  // How many viewports below the user's current bottom edge we want loadMore
  // to fire. Passed to the IntersectionObserver as a bottom rootMargin.
  const loadMoreRootMargin = scrollParentHeight
    ? scrollParentHeight * LOAD_MORE_VIEWPORTS
    : loadMoreThreshold

  // Synchronous "load more was triggered" flag — set the moment the trigger
  // fires so skeletons render on the next frame, without waiting for
  // tanquery's `isFetching` to round-trip back through the parent. Cleared
  // once the parent either delivers more entries or finishes fetching.
  const [isLoadMoreTriggered, setIsLoadMoreTriggered] = useState(false)
  const prevEntriesLengthRef = useRef(visibleItems.length)
  useEffect(() => {
    if (visibleItems.length !== prevEntriesLengthRef.current) {
      prevEntriesLengthRef.current = visibleItems.length
      setIsLoadMoreTriggered(false)
    }
  }, [visibleItems.length])
  useEffect(() => {
    if (!isFetching) setIsLoadMoreTriggered(false)
  }, [isFetching])

  const handleLoadMore = useCallback(() => {
    if (!hasNextPage || isFetching || isLoadMoreTriggered) return
    if (!loadNextPage) return
    setIsLoadMoreTriggered(true)
    loadNextPage()
  }, [hasNextPage, isFetching, isLoadMoreTriggered, loadNextPage])

  // IntersectionObserver-based trigger. A 1px sentinel <li> is rendered just
  // below the last loaded tile (above the persistent skeleton block); when it
  // enters the viewport — extended downward by `loadMoreRootMargin` — we fire
  // loadMore. Using IO instead of react-infinite-scroller's scroll-listener
  // means the trigger geometry is anchored to a specific DOM element and is
  // immune to scrollHeight fluctuations from the skeleton block or anywhere
  // else in the layout.
  const sentinelRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) handleLoadMore()
      },
      { rootMargin: `0px 0px ${loadMoreRootMargin}px 0px`, threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, loadMoreRootMargin, handleLoadMore])

  const renderSkeletons = useCallback(
    (skeletonCount: number | undefined, indexOffset = 0) => {
      if (!skeletonCount) return null
      return (
        <>
          {Array(skeletonCount)
            .fill(null)
            .map((_, index) => (
              <Flex
                direction='column'
                gap='m'
                // Position-based key so a skeleton's React identity matches
                // its absolute position in the lineup. Without this, the same
                // DOM node would change its rendered order number every time
                // a page resolves (skeleton-0 reused but now showing tileOrder
                // for a higher index), which reads as the numbers jumping.
                key={`skeleton-${indexOffset + index}`}
                w='100%'
                as='li'
                className={cn({ [tileStyles!]: !!tileStyles })}
                css={{ listStyle: 'none' }}
              >
                <Flex direction={isSmallTrackTile ? 'row' : 'column'} w='100%'>
                  {/* @ts-ignore - TrackTile types don't fully cover loading state */}
                  <TrackTile
                    index={indexOffset + index}
                    size={tileSize}
                    ordered={ordered}
                    isLoading
                  />
                </Flex>
              </Flex>
            ))}
        </>
      )
    },
    [TrackTile, tileSize, ordered, tileStyles, isSmallTrackTile]
  )

  const tiles = useMemo(() => {
    if (isError) return []
    return visibleItems.map((item, index) => {
      if (item.type === EntityType.TRACK) {
        const trackProps = {
          index,
          ordered,
          togglePlay,
          size: tileSize,
          statSize,
          containerClassName,
          id: item.id,
          isLoading: false,
          isTrending,
          isFeed,
          onClick: onClickTile,
          showArtistPick
        }
        // @ts-ignore - track tile accepts extra props
        return <TrackTile {...trackProps} key={`track-${item.id}-${index}`} />
      }
      const collectionProps = {
        index,
        ordered,
        togglePlay,
        playTrack: handlePlayCollectionTrack,
        pauseTrack,
        size: tileSize,
        containerClassName,
        id: item.id,
        isLoading: false,
        hasLoaded: () => {},
        isTrending,
        isFeed
      }
      return (
        // @ts-ignore - CollectionTile mobile variant accepts a subset of these props
        <CollectionTile
          {...collectionProps}
          key={`collection-${item.id}-${index}`}
        />
      )
    })
  }, [
    isError,
    visibleItems,
    ordered,
    togglePlay,
    handlePlayCollectionTrack,
    pauseTrack,
    tileSize,
    statSize,
    containerClassName,
    isTrending,
    isFeed,
    onClickTile,
    showArtistPick,
    TrackTile,
    CollectionTile
  ])

  const isInitialLoad = isPending && tiles.length === 0
  const isEmpty =
    tiles.length === 0 && !isFetching && !isInitialLoad && !isLoadMoreTriggered

  // Persistent skeletons render below the loaded tiles whenever more pages are
  // available, so scrollHeight grows monotonically across fetches (no
  // mount/unmount churn on the bottom block). A stable count keeps the block
  // height invariant across renders — important because the scrollbar thumb is
  // sized relative to scrollHeight. `pageSize` is too small on its own (e.g.
  // trending uses 4) so we floor by a small constant.
  const loadingSkeletonCount = Math.min(
    Math.max(0, maxEntries - tiles.length),
    Math.max(pageSize, 10)
  )

  return (
    <div
      className={cn(lineupStyle, {
        [lineupContainerStyles!]: !!lineupContainerStyles
      })}
      css={{ width: '100%' }}
    >
      <div
        ref={scrollContainer}
        className={cn(lineupStyle, {
          [lineupContainerStyles!]: !!lineupContainerStyles
        })}
      >
        <ol
          aria-label={ariaLabel}
          className={cn({
            [tileContainerStyles!]: !!tileContainerStyles && !isEmpty
          })}
        >
          {tiles.length === 0
            ? isFetching || isInitialLoad || isLoadMoreTriggered
              ? renderSkeletons(
                  Math.min(maxEntries, initialPageSize ?? pageSize)
                )
              : emptyElement
            : tiles.map((tile, index) => (
                <Flex
                  direction='column'
                  gap='m'
                  key={`${source}-${index}`}
                  mb={
                    index === 0 && leadingElementId !== undefined
                      ? 'xl'
                      : undefined
                  }
                  className={cn({ [tileStyles!]: !!tileStyles })}
                  as='li'
                >
                  <Flex
                    direction={isSmallTrackTile ? 'row' : 'column'}
                    w='100%'
                  >
                    {tile}
                    {elementAdornment &&
                      elementAdornment(visibleItems[index].id, index)}
                  </Flex>
                  {index === 0 &&
                  tiles.length >= 1 &&
                  leadingElementId !== undefined ? (
                    leadingElementDelineator !== undefined ? (
                      leadingElementDelineator
                    ) : (
                      <Divider />
                    )
                  ) : null}
                  {delineatorMap?.[index] ? delineatorMap[index] : null}
                </Flex>
              ))}

          {hasNextPage && tiles.length > 0 ? (
            <>
              {/* 1px sentinel watched by IntersectionObserver to fire
                  loadMore. Placed between the loaded tiles and the persistent
                  skeleton block so the trigger geometry stays anchored to the
                  bottom of loaded content. The IO rootMargin extends the
                  viewport downward by `loadMoreRootMargin` so the trigger
                  fires that many pixels before the sentinel actually enters
                  the visible area. */}
              <li
                ref={sentinelRef}
                aria-hidden
                css={{ height: 1, listStyle: 'none', margin: 0, padding: 0 }}
              />
              {renderSkeletons(loadingSkeletonCount, tiles.length)}
            </>
          ) : null}
        </ol>
      </div>
      {!hasNextPage && tiles.length > 0 && endOfLineupElement
        ? endOfLineupElement
        : null}
    </div>
  )
}
