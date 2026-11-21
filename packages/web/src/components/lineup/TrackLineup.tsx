import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { LineupData } from '@audius/common/api'
import { usePlayTrack, usePauseTrack } from '@audius/common/hooks'
import { FeedTab, ID, PlaybackSource, Name } from '@audius/common/models'
import { playbackActions, playbackSelectors } from '@audius/common/store'
import type {
  CommonState,
  PlaybackTrack,
  PlaybackQuerySource,
  QueueSource
} from '@audius/common/store'
import { Divider, Flex } from '@audius/harmony'
import { EntityType } from '@audius/sdk'
import cn from 'classnames'
import { useDispatch, useStore } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { CollectionTile as DesktopCollectionTile } from 'components/track/desktop/CollectionTile'
import { TrackRowTile } from 'components/track/desktop/TrackRowTile'
import { TrackTile as TrackTileDesktop } from 'components/track/desktop/TrackTile'
import { CollectionTile as MobileCollectionTile } from 'components/track/mobile/CollectionTile'
import { TrackTile as MobileTrackTile } from 'components/track/mobile/TrackTile'
import { TrackTileSize, TileProps } from 'components/track/types'
import { useIsContainerNarrow } from 'hooks/useIsContainerNarrow'
import { useIsMobile } from 'hooks/useIsMobile'

import styles from './Lineup.module.css'
import { LineupVariant } from './types'

const NARROW_CONTAINER_THRESHOLD_PX = 600
const DEFAULT_LOAD_MORE_THRESHOLD = 1600
const LOAD_MORE_VIEWPORTS = 2

const { getPlaying: getPlayerPlaying } = playbackSelectors
const { makeGetCurrent } = playbackSelectors

export type TrackLineupProps = {
  trackIds: ID[]

  lineupItems?: LineupData[]

  source: string

  querySource?: PlaybackQuerySource

  isPending?: boolean
  isFetching?: boolean
  isError?: boolean
  hasNextPage?: boolean
  loadNextPage?: () => void

  pageSize?: number
  initialPageSize?: number
  variant?: LineupVariant
  tileVariant?: 'tile' | 'row'
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

  feedType?: FeedTab
}

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
  tileVariant = 'tile',
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

  const isRowLayout = tileVariant === 'row' && !isSmallTrackTile
  const TrackTile = isSmallTrackTile
    ? MobileTrackTile
    : isRowLayout
      ? TrackRowTile
      : TrackTileDesktop
  const CollectionTile = isSmallTrackTile
    ? MobileCollectionTile
    : DesktopCollectionTile

  const store = useStore<CommonState>()
  const getCurrentQueueItem = useMemo(() => makeGetCurrent(), [])

  const items: LineupData[] = useMemo(
    () => lineupItems ?? trackIds.map((id) => ({ id, type: EntityType.TRACK })),
    [lineupItems, trackIds]
  )

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
      const state = store.getState()
      const currentLegacy = getCurrentQueueItem(state)
      const isPlaying = getPlayerPlaying(state)
      const currentTrackId = currentLegacy?.trackId ?? null
      const currentSource = currentLegacy?.source ?? null
      const isSameTile = currentTrackId === trackId && currentSource === source
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
      store,
      getCurrentQueueItem,
      source,
      playbackSource,
      feedType
    ]
  )

  const playTrack = usePlayTrack()
  const handlePlayCollectionTrack = useCallback(
    (trackId: ID) => {
      playTrack({
        id: trackId,
        entries: [{ id: trackId, source: source as QueueSource }]
      })
    },
    [playTrack, source]
  )
  const pauseTrack = usePauseTrack()

  let tileSize: TrackTileSize = TrackTileSize.LARGE
  let statSize: 'small' | 'large' = 'large'
  let containerClassName: string | undefined
  if (variant === LineupVariant.MAIN || variant === LineupVariant.PLAYLIST) {
    tileSize = TrackTileSize.LARGE
  } else if (variant === LineupVariant.GRID) {
    tileSize = TrackTileSize.SMALL
    statSize = 'small'
    containerClassName = isRowLayout
      ? undefined
      : styles.searchTrackTileContainer
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

  const loadMoreRootMargin = scrollParentHeight
    ? scrollParentHeight * LOAD_MORE_VIEWPORTS
    : loadMoreThreshold

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
                gap={isRowLayout ? undefined : 'm'}
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
    [TrackTile, tileSize, ordered, tileStyles, isSmallTrackTile, isRowLayout]
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
        containerClassName: cn(containerClassName, {
          [styles.collectionAmongRows]: isRowLayout
        }),
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
    CollectionTile,
    isRowLayout
  ])

  const isInitialLoad = isPending && tiles.length === 0
  const isEmpty =
    tiles.length === 0 && !isFetching && !isInitialLoad && !isLoadMoreTriggered

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
                  gap={isRowLayout ? undefined : 'm'}
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
