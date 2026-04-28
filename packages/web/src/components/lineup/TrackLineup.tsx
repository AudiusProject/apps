import {
  useCallback,
  useMemo,
  useRef
} from 'react'

import {
  Kind,
  ID,
  PlaybackSource,
  Name
} from '@audius/common/models'
import {
  playbackActions,
  playbackSelectors
} from '@audius/common/store'
import type { PlaybackTrack, PlaybackQuerySource } from '@audius/common/store'
import {
  makeStableUid
} from '@audius/common/utils'
import {
  Divider,
  Flex
} from '@audius/harmony'
import cn from 'classnames'
import InfiniteScroll from 'react-infinite-scroller'
import {
  useDispatch,
  useSelector
} from 'react-redux'

import {
  make
} from 'common/store/analytics/actions'
import {
  TrackTile as TrackTileDesktop
} from 'components/track/desktop/TrackTile'
import {
  TrackTile as MobileTrackTile
} from 'components/track/mobile/TrackTile'
import {
  TrackTileSize,
  TileProps
} from 'components/track/types'
import {
  useIsContainerNarrow
} from 'hooks/useIsContainerNarrow'
import {
  useIsMobile
} from 'hooks/useIsMobile'

import styles from './Lineup.module.css'
import {
  LineupVariant
} from './types'

const NARROW_CONTAINER_THRESHOLD_PX = 600
const DEFAULT_LOAD_MORE_THRESHOLD = 500

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

  // Build stable UIDs so the PlayBar (reading legacy queue) and tile
  // highlight logic line up with what the playback saga writes to the
  // legacy shadow queue.
  const uidFor = useCallback(
    (id: ID) => makeStableUid(Kind.TRACKS, id, source),
    [source]
  )

  const tracksForPlayback: PlaybackTrack[] = useMemo(
    () =>
      trackIds.map((id) => ({
        trackId: id,
        source,
        uid: uidFor(id)
      })),
    [trackIds, source, uidFor]
  )

  const togglePlay = useCallback(
    (uid: string, trackId: ID, clickSource?: PlaybackSource) => {
      const analytics = clickSource || playbackSource
      const currentUid = currentLegacy?.uid ?? null
      // LineupProvider-style semantics: if we're already the playing track
      // and playing, pause; otherwise start / resume this tile.
      if (uid === currentUid && isPlaying) {
        dispatch(playbackActions.togglePlay())
        dispatch(
          make(Name.PLAYBACK_PAUSE, { id: `${trackId}`, source: analytics })
        )
        return
      }
      if (uid === currentUid && !isPlaying) {
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
      currentLegacy?.uid,
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
      const uid = uidFor(trackId)
      const trackProps = {
        index,
        ordered,
        togglePlay,
        size: tileSize,
        statSize,
        containerClassName,
        uid,
        id: trackId,
        isLoading: false,
        isTrending,
        isFeed,
        onClick: onClickTile,
        showArtistPick
      }
      // @ts-ignore - track tile accepts extra props
      return <TrackTile {...trackProps} key={`${uid}-${index}`} />
    })
  }, [
    isError,
    visibleTrackIds,
    uidFor,
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
  const isEmpty = tiles.length === 0 && !isFetching && !isInitialLoad

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
          loadMore={loadNextPage ?? (() => {})}
          hasMore={!!hasNextPage && tiles.length < maxEntries}
          useWindow={isMobile}
          initialLoad={false}
          getScrollParent={getScrollParent}
          element='ol'
          threshold={loadMoreThreshold}
          className={cn({
            [tileContainerStyles!]: !!tileContainerStyles && !isEmpty
          })}
        >
          {tiles.length === 0
            ? isFetching || isInitialLoad
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

          {isFetching && tiles.length > 0
            ? renderSkeletons(Math.min(maxEntries - tiles.length, pageSize))
            : null}
        </InfiniteScroll>
      </div>
      {!hasNextPage && tiles.length > 0 && endOfLineupElement
        ? endOfLineupElement
        : null}
    </div>
  )
}
