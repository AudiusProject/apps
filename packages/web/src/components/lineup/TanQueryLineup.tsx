import { useRef, useCallback, useMemo } from 'react'

import { LineupData } from '@audius/common/api'
import { useCurrentTrack } from '@audius/common/hooks'
import {
  Name,
  PlaybackSource,
  Kind,
  ID,
  UID,
  ModalSource,
  Lineup,
  Status,
  Collection,
  LineupTrack,
  Track
} from '@audius/common/models'
import {
  LineupBaseActions,
  playerSelectors,
  queueSelectors
} from '@audius/common/store'
import { Nullable } from '@audius/common/utils'
import { Divider, Flex } from '@audius/harmony'
import cn from 'classnames'
import InfiniteScroll from 'react-infinite-scroller'
import { useDispatch, useSelector } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { CollectionTile as CollectionTileDesktop } from 'components/track/desktop/CollectionTile'
import { TrackTile as TrackTileDesktop } from 'components/track/desktop/TrackTile'
import { CollectionTile as MobileCollectionTile } from 'components/track/mobile/CollectionTile'
import { TrackTile as MobileTrackTile } from 'components/track/mobile/TrackTile'
import {
  TrackTileProps,
  CollectionTileProps,
  TrackTileSize,
  TileProps
} from 'components/track/types'
import { useIsMobile } from 'hooks/useIsMobile'

import styles from './Lineup.module.css'
import { delineateByTime } from './delineate'
import { LineupVariant } from './types'
const { getBuffering } = playerSelectors
const { makeGetCurrent } = queueSelectors

export interface TanQueryLineupProps {
  /** Query data should be fetched one component above and passed through here */
  data: LineupData[] | undefined
  isFetching: boolean
  isPending: boolean
  isError: boolean
  hasNextPage: boolean
  loadNextPage: () => void
  play: (uid: UID) => void
  pause: () => void
  isPlaying: boolean

  lineup: Lineup<LineupTrack | Track | Collection>

  'aria-label'?: string

  // Other props
  variant?: LineupVariant
  scrollParent?: HTMLElement | null
  endOfLineupElement?: JSX.Element

  /**
   * Whether or not to delineate the lineup by time of the `activityTimestamp` prop
   */
  delineate?: boolean

  /**
   * Indicator if a track should be displayed differently (ie. artist pick)
   * The leadingElementId is displayed at the top of the lineup
   */
  leadingElementId?: Nullable<ID>

  /**
   * JSX Element that can be used to delineate the leading element from the rest
   */
  leadingElementDelineator?: JSX.Element | null

  /**
   * Map of indices to JSX Elements that can be used to delineate the elements from the rest
   */
  delineatorMap?: Record<number, JSX.Element>

  /**
   * JSX Element that can be used to adorn the tile
   */
  elementAdornment?: (elementId: ID, index: number) => JSX.Element | null

  /**
   * Track tile properties to optionally pass to the leading element track tile
   */
  leadingElementTileProps?: Partial<TileProps>

  /**
   * Whether to show the artist pick icon on track tiles (only on profile page)
   */
  showArtistPick?: boolean

  ordered?: boolean
  lineupContainerStyles?: string
  tileContainerStyles?: string
  tileStyles?: string
  emptyElement?: JSX.Element
  actions: LineupBaseActions
  /** How many rows to show for a loading playlist tile. Defaults to 0 */
  numPlaylistSkeletonRows?: number

  /** Are we in a trending lineup? Allows tiles to specialize their rendering */
  isTrending?: boolean

  /** Function triggered on click of tile */
  onClickTile?: (trackId: ID) => void
  pageSize: number
  initialPageSize?: number
  loadMoreThreshold?: number

  /** Starting index to render from */
  offset?: number

  /** Whether to load more items when the user scrolls to the bottom of the lineup */
  shouldLoadMore?: boolean

  /** Maximum number of entries to display in the lineup */
  maxEntries?: number
}

const defaultLineup = {
  status: Status.IDLE,
  entries: [] as any[],
  order: {},
  total: 0,
  deleted: 0,
  nullCount: 0,
  hasMore: true,
  inView: true,
  prefix: '',
  page: 0,
  isMetadataLoading: false
}

const DEFAULT_LOAD_MORE_THRESHOLD = 500 // px

/** `TanQueryLineup` encapsulates the logic for displaying a Lineup (e.g. prefetching items)
 * displaying loading states, etc). This is decoupled from the rendering logic, which
 * is controlled by injecting tiles conforming to `Track/Playlist/SkeletonProps interfaces.
 */
export const TanQueryLineup = ({
  'aria-label': ariaLabel,
  variant = LineupVariant.MAIN,
  ordered = false,
  delineate = false,
  endOfLineupElement: endOfLineup,
  leadingElementId,
  lineupContainerStyles,
  leadingElementDelineator,
  delineatorMap,
  elementAdornment,
  tileContainerStyles,
  tileStyles,
  emptyElement,
  numPlaylistSkeletonRows,
  isTrending = false,
  onClickTile,
  initialPageSize,
  scrollParent: externalScrollParent,
  loadMoreThreshold = DEFAULT_LOAD_MORE_THRESHOLD,
  offset = 0,
  shouldLoadMore = true,
  showArtistPick = false,
  data,
  pageSize,
  lineup = defaultLineup,
  play,
  pause,
  loadNextPage,
  hasNextPage,
  isPending = true,
  isPlaying = false,
  isFetching = true,
  isError = false,
  maxEntries = Infinity
}: TanQueryLineupProps) => {
  const dispatch = useDispatch()

  const getCurrentQueueItem = useMemo(() => makeGetCurrent(), [])
  const currentQueueItem = useSelector(getCurrentQueueItem)
  const currentTrack = useCurrentTrack()
  const isBuffering = useSelector(getBuffering)

  const playingUid = currentQueueItem?.uid
  const playingSource = currentQueueItem?.source
  const playingTrackId = currentTrack?.track_id ?? null

  const isMobile = useIsMobile()
  const scrollContainer = useRef<HTMLDivElement>(null)

  const isSmallTrackTile = isMobile || variant === LineupVariant.SECTION

  // Memoize component selection based on device type
  const { TrackTile, PlaylistTile } = useMemo(() => {
    return {
      TrackTile: isSmallTrackTile ? MobileTrackTile : TrackTileDesktop,
      PlaylistTile: isSmallTrackTile
        ? MobileCollectionTile
        : CollectionTileDesktop
    }
  }, [isSmallTrackTile])

  // Memoized scroll parent callback
  const getScrollParent = useCallback(() => {
    if (externalScrollParent) {
      return externalScrollParent
    }
    return document.getElementById('mainContent')
  }, [externalScrollParent])

  // Determine tile size and styles based on variant
  let tileSize: TrackTileSize = TrackTileSize.LARGE // Default value
  let statSize = 'large'
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

  // Determine lineup style
  const lineupStyle =
    variant === LineupVariant.MAIN || variant === LineupVariant.PLAYLIST
      ? styles.main
      : styles.section

  const togglePlay = useCallback(
    (uid: UID, trackId: ID, source?: PlaybackSource) => {
      if (uid !== playingUid || (uid === playingUid && !isPlaying)) {
        play(uid)
        dispatch(
          make(Name.PLAYBACK_PLAY, {
            id: trackId,
            source: source || PlaybackSource.TRACK_TILE
          })
        )
      } else if (uid === playingUid && isPlaying) {
        pause()
        dispatch(
          make(Name.PLAYBACK_PAUSE, {
            id: trackId,
            source: source || PlaybackSource.TRACK_TILE
          })
        )
      }
    },
    [playingUid, isPlaying, play, dispatch, pause]
  )

  const renderSkeletons = useCallback(
    (
      skeletonCount: number | undefined,
      isInitialLoad: boolean,
      indexOffset: number = 0
    ) => {
      // This means no skeletons are desired
      if (!skeletonCount) {
        return <></>
      }

      const skeletonTileProps = (index: number) => ({
        index,
        size: tileSize,
        ordered,
        isLoading: true,
        numLoadingSkeletonRows: numPlaylistSkeletonRows
      })

      return (
        <>
          {Array(skeletonCount)
            .fill(null)
            .map((_, index) => {
              return (
                <Flex
                  direction='column'
                  gap='m'
                  key={index}
                  mb={index === 0 && leadingElementId ? 'xl' : undefined}
                  w='100%'
                  as='li'
                  className={cn({ [tileStyles!]: !!tileStyles })}
                  css={{ listStyle: 'none' }}
                >
                  <Flex
                    direction={isSmallTrackTile ? 'row' : 'column'}
                    w='100%'
                  >
                    {/* @ts-ignore - the types here need work - we're not passing the full expected types here whenever we pass isLoading: true */}
                    <TrackTile {...skeletonTileProps(index)} key={index} />
                  </Flex>
                  {index === 0 &&
                  leadingElementId !== undefined &&
                  isInitialLoad ? (
                    leadingElementDelineator !== undefined ? (
                      leadingElementDelineator
                    ) : (
                      <Divider css={{ width: '100%' }} />
                    )
                  ) : null}
                  {delineatorMap?.[index + indexOffset]
                    ? delineatorMap[index + indexOffset]
                    : null}
                </Flex>
              )
            })}
        </>
      )
    },
    [
      tileSize,
      ordered,
      numPlaylistSkeletonRows,
      leadingElementId,
      tileStyles,
      isSmallTrackTile,
      TrackTile,
      leadingElementDelineator,
      delineatorMap
    ]
  )

  // Determine how to render our tiles
  const tiles = useMemo(() => {
    if (isError) {
      return []
    }

    // Apply offset and maxEntries to the lineup entries
    const lineupEntries =
      maxEntries !== undefined && offset !== undefined
        ? lineup.entries.slice(offset, offset + maxEntries)
        : lineup.entries

    const lineupData =
      maxEntries !== undefined && offset !== undefined
        ? data?.slice(offset, offset + maxEntries)
        : data

    let result = lineupEntries
      .map((entry: any, index: number) => {
        if (entry.kind === Kind.TRACKS || entry.track_id) {
          if (entry._marked_deleted) return null

          const trackProps: TrackTileProps = {
            ...entry,
            index,
            ordered,
            togglePlay,
            size: tileSize,
            statSize,
            containerClassName,
            uid: entry.uid,
            id: entry.id,
            isLoading: lineupData?.[index] === undefined,
            isTrending,
            onClick: onClickTile,
            source: ModalSource.LineUpTrackTile,
            isBuffering,
            playingSource,
            showArtistPick
          }

          // @ts-ignore - the types here need work - we're not passing the full expected types here whenever we pass isLoading: true
          return <TrackTile {...trackProps} key={entry.uid || index} />

          // @ts-ignore - TODO: these types werent enforced before - something smelly here
        } else if (entry.kind === Kind.COLLECTIONS || entry.playlist_id) {
          const playlistProps: CollectionTileProps = {
            ...entry,
            index,
            uid: entry.uid,
            id: entry.id,
            size: tileSize,
            ordered,
            playTrack: play,
            pauseTrack: pause,
            playingTrackId,
            togglePlay,
            isLoading: lineupData?.[index] === undefined,
            numLoadingSkeletonRows: numPlaylistSkeletonRows,
            isTrending,
            source: ModalSource.LineUpCollectionTile,
            isBuffering,
            playingSource
          }
          // @ts-ignore - TODO: these types werent enforced before - something smelly here
          return <PlaylistTile {...playlistProps} key={entry.uid || index} />
        }
        return null
      })
      .filter(Boolean)

    if (delineate) {
      result = delineateByTime(result, isMobile)
    }

    return result
  }, [
    isError,
    maxEntries,
    offset,
    lineup.entries,
    data,
    delineate,
    ordered,
    togglePlay,
    tileSize,
    statSize,
    containerClassName,
    isTrending,
    onClickTile,
    isBuffering,
    playingSource,
    showArtistPick,
    TrackTile,
    play,
    pause,
    playingTrackId,
    numPlaylistSkeletonRows,
    PlaylistTile,
    isMobile
  ])

  const isInitialLoad = (isFetching && tiles.length === 0) || isPending

  const isEmptyResults = tiles.length === 0 && !isFetching && !isInitialLoad

  return (
    <>
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
            loadMore={loadNextPage}
            hasMore={hasNextPage && shouldLoadMore}
            useWindow={isMobile}
            initialLoad={false}
            getScrollParent={getScrollParent}
            element='ol'
            threshold={loadMoreThreshold}
            // Render empty results as full width instead of a tile taking up one grid space
            className={cn({
              [tileContainerStyles!]: !!tileContainerStyles && !isEmptyResults
            })}
          >
            {tiles.length === 0
              ? isFetching || isInitialLoad
                ? renderSkeletons(
                    Math.min(maxEntries, initialPageSize ?? pageSize),
                    true
                  )
                : emptyElement
              : tiles.map((tile: any, index: number) => (
                  <Flex
                    direction='column'
                    gap='m'
                    key={index}
                    mb={index === 0 && leadingElementId ? 'xl' : undefined}
                    className={cn({ [tileStyles!]: !!tileStyles })}
                    as='li'
                  >
                    <Flex
                      direction={isSmallTrackTile ? 'row' : 'column'}
                      w='100%'
                    >
                      {tile}
                      {elementAdornment &&
                        elementAdornment(tile.props.id, index)}
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
              ? renderSkeletons(
                  Math.min(maxEntries - tiles.length, pageSize),
                  false,
                  tiles.length
                )
              : null}
          </InfiniteScroll>
        </div>
      </div>
      {!hasNextPage && endOfLineup ? endOfLineup : null}
    </>
  )
}
