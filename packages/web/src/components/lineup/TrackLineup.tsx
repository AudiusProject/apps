import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ID, PlaybackSource, Name } from '@audius/common/models'
import { playbackActions, playbackSelectors } from '@audius/common/store'
import type { PlaybackTrack, PlaybackQuerySource } from '@audius/common/store'
import { Divider, Flex } from '@audius/harmony'
import cn from 'classnames'
import InfiniteScroll from 'react-infinite-scroller'
import { useDispatch, useSelector } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { TrackTile as TrackTileDesktop } from 'components/track/desktop/TrackTile'
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
// Approximate rendered heights of a TrackTile in different variants — used to
// compute how many skeletons to render so the bottom-of-list "loading window"
// fills the threshold area instead of leaving the user staring at a frozen
// last entry while the next page is in flight.
const APPROX_TILE_HEIGHT_LARGE = 124
const APPROX_TILE_HEIGHT_SMALL = 80

const { getPlaying: getPlayerPlaying } = playbackSelectors
const { makeGetCurrent } = playbackSelectors
const { getCurrentTrackId: getPlaybackCurrentTrackId } = playbackSelectors

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
}

/**
 * Tanquery-first replacement for the legacy `<Lineup>` / `<TanQueryLineup>`
 * components. Takes an array of track IDs and dispatches through the new
 * playback slice on tile interactions. No redux lineup state.
 */
export const TrackLineup = ({
  trackIds,
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
  playbackSource = PlaybackSource.TRACK_TILE_LINEUP
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

  const tracksForPlayback: PlaybackTrack[] = useMemo(
    () =>
      trackIds.map((id) => ({
        trackId: id,
        source
      })),
    [trackIds, source]
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
          make(Name.PLAYBACK_PLAY, { id: `${trackId}`, source: analytics })
        )
        return
      }
      const startIndex = trackIds.indexOf(trackId)
      if (startIndex < 0) return
      dispatch(
        playbackActions.playFrom({
          tracks: tracksForPlayback,
          startIndex,
          querySource: querySource ?? null
        })
      )
      dispatch(
        make(Name.PLAYBACK_PLAY, { id: `${trackId}`, source: analytics })
      )
    },
    [
      dispatch,
      tracksForPlayback,
      trackIds,
      querySource,
      currentLegacy?.trackId,
      currentLegacy?.source,
      source,
      isPlaying,
      playbackSource
    ]
  )

  const getScrollParent = useCallback(() => {
    if (externalScrollParent) return externalScrollParent
    return document.getElementById('mainContent')
  }, [externalScrollParent])

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

  const visibleTrackIds = useMemo(() => {
    const end = Math.min(trackIds.length, maxEntries)
    return trackIds.slice(0, end)
  }, [trackIds, maxEntries])

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

  const effectiveLoadMoreThreshold = scrollParentHeight
    ? scrollParentHeight * LOAD_MORE_VIEWPORTS
    : loadMoreThreshold

  // Synchronous "load more was triggered" flag — set the moment the scroll
  // handler fires so skeletons render on the next frame, without waiting for
  // tanquery's `isFetching` to round-trip back through the parent. Cleared
  // once the parent either delivers more entries or finishes fetching.
  const [isLoadMoreTriggered, setIsLoadMoreTriggered] = useState(false)
  const prevEntriesLengthRef = useRef(visibleTrackIds.length)
  useEffect(() => {
    if (visibleTrackIds.length !== prevEntriesLengthRef.current) {
      prevEntriesLengthRef.current = visibleTrackIds.length
      setIsLoadMoreTriggered(false)
    }
  }, [visibleTrackIds.length])
  useEffect(() => {
    if (!isFetching) setIsLoadMoreTriggered(false)
  }, [isFetching])

  const handleLoadMore = useCallback(() => {
    if (!hasNextPage || isFetching || isLoadMoreTriggered) return
    if (!loadNextPage) return
    setIsLoadMoreTriggered(true)
    loadNextPage()
  }, [hasNextPage, isFetching, isLoadMoreTriggered, loadNextPage])

  const renderSkeletons = useCallback(
    (skeletonCount: number | undefined) => {
      if (!skeletonCount) return null
      return (
        <>
          {Array(skeletonCount)
            .fill(null)
            .map((_, index) => (
              <Flex
                direction='column'
                gap='m'
                key={`skeleton-${index}`}
                w='100%'
                as='li'
                className={cn({ [tileStyles!]: !!tileStyles })}
                css={{ listStyle: 'none' }}
              >
                <Flex direction={isSmallTrackTile ? 'row' : 'column'} w='100%'>
                  {/* @ts-ignore - TrackTile types don't fully cover loading state */}
                  <TrackTile
                    index={index}
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
    return visibleTrackIds.map((trackId, index) => {
      const trackProps = {
        index,
        ordered,
        togglePlay,
        size: tileSize,
        statSize,
        containerClassName,
        id: trackId,
        isLoading: false,
        isTrending,
        isFeed,
        onClick: onClickTile,
        showArtistPick
      }
      // @ts-ignore - track tile accepts extra props
      return <TrackTile {...trackProps} key={`${trackId}-${index}`} />
    })
  }, [
    isError,
    visibleTrackIds,
    ordered,
    togglePlay,
    tileSize,
    statSize,
    containerClassName,
    isTrending,
    isFeed,
    onClickTile,
    showArtistPick,
    TrackTile
  ])

  const isInitialLoad = isPending && tiles.length === 0
  const isEmpty =
    tiles.length === 0 && !isFetching && !isInitialLoad && !isLoadMoreTriggered

  // While a page is in flight we render skeletons below the loaded tiles. They
  // need to fill ~one threshold's worth of vertical space so the bottom of the
  // list feels populated even when the user scrolls into the trigger area
  // faster than the network can return. `pageSize` is too small on its own
  // (e.g. trending uses 4) so we floor by a viewport-derived count.
  const approxTileHeight = isSmallTrackTile
    ? APPROX_TILE_HEIGHT_SMALL
    : APPROX_TILE_HEIGHT_LARGE
  const fillCount = Math.ceil(effectiveLoadMoreThreshold / approxTileHeight)
  const loadingSkeletonCount = Math.min(
    Math.max(0, maxEntries - tiles.length),
    Math.max(pageSize, fillCount)
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
        <InfiniteScroll
          aria-label={ariaLabel}
          pageStart={0}
          loadMore={handleLoadMore}
          hasMore={!!hasNextPage && tiles.length < maxEntries}
          useWindow={isMobile}
          initialLoad={false}
          getScrollParent={getScrollParent}
          element='ol'
          threshold={effectiveLoadMoreThreshold}
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
                      elementAdornment(visibleTrackIds[index], index)}
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

          {(isFetching || isLoadMoreTriggered) && tiles.length > 0
            ? renderSkeletons(loadingSkeletonCount)
            : null}
        </InfiniteScroll>
      </div>
      {!hasNextPage && tiles.length > 0 && endOfLineupElement
        ? endOfLineupElement
        : null}
    </div>
  )
}
