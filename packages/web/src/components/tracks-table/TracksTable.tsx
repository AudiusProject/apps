import { MouseEvent, useCallback, useMemo, useRef } from 'react'

import {
  useGatedContentAccessMap,
  useIsGatedContentPlaylistAddable
} from '@audius/common/hooks'
import {
  UID,
  UserTrack,
  isContentCollectibleGated,
  isContentFollowGated,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import { formatCount, formatSeconds } from '@audius/common/utils'
import {
  IconVisibilityHidden,
  IconLock,
  Button,
  Flex,
  IconSpecialAccess,
  IconCollectible,
  IconCart
} from '@audius/harmony'
import cn from 'classnames'
import moment from 'moment'
import { Cell, Row } from 'react-table'

import { TextLink, UserLink } from 'components/link'
import {
  Table,
  OverflowMenuButton,
  TableFavoriteButton,
  TablePlayButton,
  TableRepostButton,
  alphaSorter,
  dateSorter,
  numericSorter
} from 'components/table'
import Tooltip from 'components/tooltip/Tooltip'
import { isDescendantElementOf } from 'utils/domUtils'

import styles from './TracksTable.module.css'

type RowInfo = UserTrack & {
  name: string
  artist: string
  date: string
  time: number
  plays: number
  dateSaved: string
  dateAdded: string
  handle: string
  uid: UID
}

type TrackCell = Cell<RowInfo>

type TrackRow = Row<RowInfo>

export type TracksTableColumn =
  | 'addedDate'
  | 'artistName'
  | 'date'
  | 'length'
  | 'listenDate'
  | 'overflowActions'
  | 'overflowMenu'
  | 'playButton'
  | 'plays'
  | 'releaseDate'
  | 'reposts'
  | 'saves'
  | 'savedDate'
  | 'spacer'
  | 'trackName'

type TracksTableProps = {
  columns?: TracksTableColumn[]
  data: any[]
  defaultSorter?: (a: any, b: any) => number
  disabledTrackEdit?: boolean
  fetchBatchSize?: number
  fetchMoreTracks?: (offset: number, limit: number) => void
  fetchPage?: (page: number) => void
  fetchThreshold?: number
  isVirtualized?: boolean
  isPaginated?: boolean
  isReorderable?: boolean
  isAlbumPage?: boolean
  isAlbumPremium?: boolean
  isPremiumEnabled?: boolean
  shouldShowGatedType?: boolean
  loading?: boolean
  onClickFavorite?: (track: any) => void
  onClickPurchase?: (track: any) => void
  onClickRemove?: (
    track: any,
    index: number,
    uid: string,
    timestamp: number
  ) => void
  onClickRepost?: (track: any) => void
  onClickRow?: (track: any, index: number) => void
  onReorderTracks?: (source: number, destination: number) => void
  onShowMoreToggle?: (setting: boolean) => void
  onSortTracks?: (...props: any[]) => void
  pageSize?: number
  playing?: boolean
  playingIndex?: number
  removeText?: string
  scrollRef?: React.MutableRefObject<HTMLDivElement | undefined>
  showMoreLimit?: number
  tableClassName?: string
  tableHeaderClassName?: string
  totalRowCount?: number
  useLocalSort?: boolean
  userId?: number | null
  wrapperClassName?: string
}

const defaultColumns: TracksTableColumn[] = [
  'playButton',
  'trackName',
  'artistName',
  'releaseDate',
  'listenDate',
  'length',
  'plays',
  'reposts',
  'overflowActions'
]

export const TracksTable = ({
  columns = defaultColumns,
  data,
  defaultSorter,
  disabledTrackEdit = false,
  isPaginated = false,
  isReorderable = false,
  isAlbumPage = false,
  isAlbumPremium = false,
  fetchBatchSize,
  fetchMoreTracks,
  fetchPage,
  fetchThreshold,
  isVirtualized = false,
  isPremiumEnabled = false,
  shouldShowGatedType = false,
  loading = false,
  onClickFavorite,
  onClickRemove,
  onClickRepost,
  onClickPurchase,
  onClickRow,
  onReorderTracks,
  onShowMoreToggle,
  onSortTracks,
  pageSize,
  playing = false,
  playingIndex = -1,
  removeText,
  scrollRef,
  showMoreLimit,
  tableClassName,
  tableHeaderClassName,
  totalRowCount,
  useLocalSort = false,
  userId,
  wrapperClassName
}: TracksTableProps) => {
  const trackAccessMap = useGatedContentAccessMap(data)

  // Cell Render Functions
  const renderPlayButtonCell = useCallback(
    (cellInfo: TrackCell) => {
      const index = cellInfo.row.index
      const active = index === playingIndex
      const track = cellInfo.row.original
      const isTrackUnlisted = track.is_unlisted
      const isTrackPremium = isContentUSDCPurchaseGated(track.stream_conditions)
      const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMap[
        track.track_id
      ] ?? { isFetchingNFTAccess: false, hasStreamAccess: true }
      const isLocked = !isFetchingNFTAccess && !hasStreamAccess

      return (
        <>
          <TablePlayButton
            className={cn(styles.tablePlayButton, { [styles.active]: active })}
            paused={!playing}
            playing={active}
            hideDefault={false}
            isTrackPremium={isTrackPremium && isPremiumEnabled}
            isLocked={isLocked}
          />
          {isTrackUnlisted ? (
            <IconVisibilityHidden
              className={cn(styles.hiddenIcon, { [styles.hidden]: active })}
            />
          ) : null}
        </>
      )
    },
    [isPremiumEnabled, playing, playingIndex, trackAccessMap]
  )

  const renderTrackNameCell = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const index = cellInfo.row.index
      const active = index === playingIndex
      const deleted =
        track.is_delete || track._marked_deleted || !!track.user?.is_deactivated

      return (
        <div className={styles.textContainer} css={{ overflow: 'hidden' }}>
          <TextLink
            to={deleted ? '' : track.permalink}
            isActive={active}
            textVariant='title'
            size='s'
            strength='weak'
            css={{ display: 'block', 'line-height': '125%' }}
            ellipses
          >
            {track.name}
            {deleted ? ` [Deleted By Artist]` : ''}
          </TextLink>
        </div>
      )
    },
    [playingIndex]
  )

  const renderArtistNameCell = useCallback(
    (cellInfo: TrackCell) => {
      const { original: track, index } = cellInfo.row
      const { user } = track
      if (user?.is_deactivated) {
        return `${user?.name} [Deactivated]`
      }

      return (
        <div className={styles.artistCellContainer}>
          <UserLink
            className={styles.textCell}
            userId={user.user_id}
            size='s'
            strength='strong'
            variant={index === playingIndex ? 'visible' : 'default'}
            badgeSize='xs'
            popover
          />
        </div>
      )
    },
    [playingIndex]
  )

  const renderPlaysCell = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const { plays } = track
      const isOwner = track.owner_id === userId
      // negative plays indicates the track is hidden
      if (plays === -1) return '-'
      if (
        track.is_stream_gated &&
        isContentUSDCPurchaseGated(track.stream_conditions) &&
        !isOwner
      )
        return null
      return formatCount(track.plays)
    },
    [userId]
  )

  const renderRepostsCell = useCallback((cellInfo: TrackCell) => {
    const track = cellInfo.row.original
    return formatCount(track.repost_count)
  }, [])

  const renderLengthCell = useCallback((cellInfo: TrackCell) => {
    const track = cellInfo.row.original
    return formatSeconds(track.time)
  }, [])

  const renderDateCell = useCallback((cellInfo: TrackCell) => {
    const track = cellInfo.row.original
    return moment(track.date).format('M/D/YY')
  }, [])

  const renderAddedDateCell = useCallback((cellInfo: TrackCell) => {
    const track = cellInfo.row.original
    return moment(track.dateAdded).format('M/D/YY')
  }, [])

  const renderSavedDateCell = useCallback((cellInfo: TrackCell) => {
    const track = cellInfo.row.original
    return moment(track.dateSaved).format('M/D/YY')
  }, [])

  const renderSavesCell = useCallback((cellInfo: TrackCell) => {
    const track = cellInfo.row.original
    return formatCount(track.save_count)
  }, [])

  const renderReleaseDateCell = useCallback((cellInfo: TrackCell) => {
    const track = cellInfo.row.original
    let suffix = ''
    if (
      track.release_date &&
      moment(track.release_date).isAfter(moment.now())
    ) {
      suffix = ' (Scheduled)'
    }
    return (
      moment(track.release_date ?? track.created_at).format('M/D/YY') + suffix
    )
  }, [])

  const renderListenDateCell = useCallback((cellInfo: TrackCell) => {
    const track = cellInfo.row.original
    return moment(track.dateListened).format('M/D/YY')
  }, [])

  const favoriteButtonRef = useRef<HTMLDivElement>(null)
  const renderFavoriteButtonCell = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMap[
        track.track_id
      ] ?? { isFetchingNFTAccess: false, hasStreamAccess: true }
      const isLocked = !isFetchingNFTAccess && !hasStreamAccess
      const deleted =
        track.is_delete || track._marked_deleted || !!track.user?.is_deactivated
      const isOwner = track.owner_id === userId
      if (isLocked || deleted || isOwner) {
        return null
      }

      return (
        <Tooltip
          text={track.has_current_user_saved ? 'Unfavorite' : 'Favorite'}
          mount='page'
        >
          <div ref={favoriteButtonRef}>
            <TableFavoriteButton
              className={cn(styles.tableActionButton, {
                [styles.active]: track.has_current_user_saved
              })}
              onClick={() => onClickFavorite?.(track)}
              favorited={track.has_current_user_saved}
            />
          </div>
        </Tooltip>
      )
    },
    [trackAccessMap, onClickFavorite, userId]
  )

  const repostButtonRef = useRef<HTMLDivElement>(null)
  const renderRepostButtonCell = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMap[
        track.track_id
      ] ?? { isFetchingNFTAccess: false, hasStreamAccess: true }
      const isLocked = !isFetchingNFTAccess && !hasStreamAccess
      const deleted =
        track.is_delete || track._marked_deleted || !!track.user?.is_deactivated
      const isOwner = track.owner_id === userId
      if (isLocked || deleted || isOwner) {
        return null
      }

      return (
        <Tooltip
          text={track.has_current_user_reposted ? 'Unrepost' : 'Repost'}
          mount='page'
        >
          <div ref={repostButtonRef}>
            <TableRepostButton
              className={cn(styles.tableActionButton, {
                [styles.active]: track.has_current_user_reposted
              })}
              onClick={(e) => {
                onClickRepost?.(track)
                e.stopPropagation()
              }}
              reposted={track.has_current_user_reposted}
            />
          </div>
        </Tooltip>
      )
    },
    [trackAccessMap, onClickRepost, userId]
  )

  const overflowMenuRef = useRef<HTMLDivElement>(null)
  const renderOverflowMenuCell = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMap[
        track.track_id
      ] ?? { isFetchingNFTAccess: false, hasStreamAccess: true }
      const isLocked = !isFetchingNFTAccess && !hasStreamAccess
      const isDdex = !!track.ddex_app
      const deleted =
        track.is_delete || track._marked_deleted || !!track.user?.is_deactivated
      const isPlaylistAddable = useIsGatedContentPlaylistAddable(track)
      // For owners, we want to show the type of gating on the track. For fans,
      // we want to show whether or not they have access.
      let Icon
      if (shouldShowGatedType) {
        Icon = track.is_unlisted
          ? IconVisibilityHidden
          : isContentUSDCPurchaseGated(track.stream_conditions)
          ? IconCart
          : isContentCollectibleGated(track.stream_conditions)
          ? IconCollectible
          : isContentFollowGated(track.stream_conditions)
          ? IconSpecialAccess
          : null
      } else {
        Icon = !hasStreamAccess
          ? IconLock
          : track.is_unlisted
          ? IconVisibilityHidden
          : null
      }
      const overflowProps = {
        className: styles.tableActionButton,
        isDeleted: deleted,
        includeAlbumPage: !isAlbumPage,
        includeFavorite: !isLocked,
        handle: track.handle,
        trackId: track.track_id,
        uid: track.uid,
        date: track.date,
        isFavorited: track.has_current_user_saved,
        isOwner: track.owner_id === userId,
        isOwnerDeactivated: !!track.user?.is_deactivated,
        isArtistPick: track.user?.artist_pick_track_id === track.track_id,
        index: cellInfo.row.index,
        trackTitle: track.name,
        trackPermalink: track.permalink
      }
      const conditionalOverflowProps = isDdex
        ? {
            includeEdit: false,
            includeAddToPlaylist: false,
            includeAddToAlbum: false
          }
        : {
            includeEdit: !disabledTrackEdit,
            includeAddToPlaylist: isPlaylistAddable,
            onRemove: onClickRemove,
            removeText
          }

      return (
        <>
          {Icon ? (
            <Flex className={styles.typeIcon}>
              <Icon color='subdued' size='m' />
            </Flex>
          ) : null}
          <div ref={overflowMenuRef} className={styles.overflowMenu}>
            <OverflowMenuButton
              {...overflowProps}
              {...conditionalOverflowProps}
            />
          </div>
        </>
      )
    },
    [
      trackAccessMap,
      shouldShowGatedType,
      disabledTrackEdit,
      isAlbumPage,
      onClickRemove,
      removeText,
      userId
    ]
  )

  const renderPurchaseButton = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMap[
        track.track_id
      ] ?? { isFetchingNFTAccess: false, hasStreamAccess: true }
      const isLocked = !isFetchingNFTAccess && !hasStreamAccess
      const isOwner = track.owner_id === userId
      const deleted =
        track.is_delete || track._marked_deleted || !!track.user?.is_deactivated
      if (!isLocked || deleted || isOwner || !isPremiumEnabled) {
        return null
      }
      if (isContentUSDCPurchaseGated(track.stream_conditions)) {
        return (
          <Button
            size='small'
            color='lightGreen'
            className={isAlbumPremium ? styles.purchaseButton : undefined}
            onClick={(e) => {
              e.stopPropagation()
              onClickPurchase?.(track)
            }}
          >
            ${track.stream_conditions.usdc_purchase.price / 100}.00
          </Button>
        )
      }
    },
    [isAlbumPremium, isPremiumEnabled, onClickPurchase, trackAccessMap, userId]
  )

  const renderTrackActions = useCallback(
    (cellInfo: TrackCell) => {
      return (
        <Flex
          inline
          alignItems='center'
          justifyContent='flex-end'
          w='100%'
          gap='l'
          mh='l'
          className={styles.trackActionsContainer}
        >
          {renderRepostButtonCell(cellInfo)}
          {renderFavoriteButtonCell(cellInfo)}
          {renderPurchaseButton(cellInfo)}
          {renderOverflowMenuCell(cellInfo)}
        </Flex>
      )
    },
    [
      renderFavoriteButtonCell,
      renderOverflowMenuCell,
      renderPurchaseButton,
      renderRepostButtonCell
    ]
  )

  // Columns
  const tableColumnMap = useMemo(
    () => ({
      addedDate: {
        id: 'dateAdded',
        Header: 'Added',
        accessor: 'dateAdded',
        Cell: renderAddedDateCell,
        maxWidth: 160,
        sortTitle: 'Date Added',
        sorter: dateSorter('dateAdded'),
        align: 'right'
      },
      artistName: {
        id: 'artistName',
        Header: 'Artist',
        accessor: 'artist',
        Cell: renderArtistNameCell,
        maxWidth: 300,
        width: 120,
        sortTitle: 'Artist Name',
        sorter: alphaSorter('artist'),
        align: 'left'
      },
      date: {
        id: 'date',
        Header: 'Date',
        accessor: 'date',
        Cell: renderDateCell,
        maxWidth: 160,
        sortTitle: 'Date Listened',
        sorter: dateSorter('date'),
        align: 'right'
      },
      listenDate: {
        id: 'dateListened',
        Header: 'Played',
        accessor: 'dateListened',
        Cell: renderListenDateCell,
        maxWidth: 160,
        sortTitle: 'Date Listened',
        sorter: dateSorter('dateListened'),
        align: 'right'
      },
      releaseDate: {
        id: 'dateReleased',
        Header: 'Released',
        accessor: 'created_at',
        Cell: renderReleaseDateCell,
        maxWidth: 160,
        sortTitle: 'Date Released',
        sorter: dateSorter('created_at'),
        align: 'right'
      },
      reposts: {
        id: 'reposts',
        Header: 'Reposts',
        accessor: 'repost_count',
        Cell: renderRepostsCell,
        maxWidth: 160,
        sortTitle: 'Reposts',
        sorter: numericSorter('repost_count'),
        align: 'right'
      },
      plays: {
        id: 'plays',
        Header: 'Plays',
        accessor: 'plays',
        Cell: renderPlaysCell,
        maxWidth: 120,
        width: 48,
        minWidth: 48,
        sortTitle: 'Plays',
        sorter: numericSorter('plays'),
        align: 'right'
      },
      playButton: {
        id: 'playButton',
        Cell: renderPlayButtonCell,
        minWidth: 48,
        maxWidth: 48,
        disableResizing: true,
        disableSortBy: true
      },
      saves: {
        id: 'saves',
        Header: 'Favorites',
        accessor: 'save_count',
        Cell: renderSavesCell,
        maxWidth: 160,
        sortTitle: 'Favorites',
        sorter: numericSorter('save_count'),
        align: 'right'
      },
      overflowActions: {
        id: 'trackActions',
        Cell: renderTrackActions,
        minWidth: 140,
        maxWidth: 140,
        width: 140,
        disableResizing: true,
        disableSortBy: true
      },
      overflowMenu: {
        id: 'overflowMenu',
        Cell: renderOverflowMenuCell,
        minWidth: 64,
        maxWidth: 64,
        width: 64,
        disableResizing: true,
        disableSortBy: true
      },
      length: {
        id: 'time',
        Header: 'Length',
        accessor: 'time',
        Cell: renderLengthCell,
        maxWidth: 160,
        sortTitle: 'Track Length',
        sorter: numericSorter('time'),
        disableSortBy: isVirtualized,
        align: 'right'
      },
      trackName: {
        id: 'trackName',
        Header: 'Track Name',
        accessor: 'title',
        Cell: renderTrackNameCell,
        maxWidth: 300,
        width: 120,
        sortTitle: 'Track Name',
        sorter: alphaSorter('title'),
        align: 'left'
      },
      savedDate: {
        id: 'dateSaved',
        Header: 'Saved',
        accessor: 'dateSaved',
        Cell: renderSavedDateCell,
        maxWidth: 160,
        sortTitle: 'Date Saved',
        sorter: dateSorter('dateSaved'),
        align: 'right'
      },
      spacer: {
        id: 'spacer',
        maxWidth: 24,
        minWidth: 24,
        disableSortBy: true,
        disableResizing: true
      }
    }),
    [
      isVirtualized,
      renderAddedDateCell,
      renderArtistNameCell,
      renderDateCell,
      renderLengthCell,
      renderListenDateCell,
      renderOverflowMenuCell,
      renderPlayButtonCell,
      renderPlaysCell,
      renderSavedDateCell,
      renderReleaseDateCell,
      renderRepostsCell,
      renderTrackActions,
      renderTrackNameCell,
      renderSavesCell
    ]
  )

  const tableColumns = useMemo(
    () => columns.map((id) => tableColumnMap[id]),
    [columns, tableColumnMap]
  )

  const handleClickRow = useCallback(
    (e: MouseEvent<HTMLTableRowElement>, rowInfo: TrackRow, index: number) => {
      const track = rowInfo.original
      const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMap[
        track.track_id
      ] ?? { isFetchingNFTAccess: false, hasStreamAccess: true }
      const isLocked = !isFetchingNFTAccess && !hasStreamAccess
      const isPremium = isContentUSDCPurchaseGated(track.stream_conditions)
      const deleted =
        track.is_delete || track._marked_deleted || !!track.user?.is_deactivated
      const clickedActionButton = [
        favoriteButtonRef,
        repostButtonRef,
        overflowMenuRef
      ].some((ref) => isDescendantElementOf(e?.target, ref.current))

      if ((isLocked && !isPremium) || deleted || clickedActionButton) return
      onClickRow?.(track, index)
    },
    [trackAccessMap, onClickRow]
  )

  const getRowClassName = useCallback(
    (rowIndex: number) => {
      const track = data[rowIndex]
      const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMap[
        track.track_id
      ] ?? { isFetchingNFTAccess: false, hasStreamAccess: true }
      const isLocked = !isFetchingNFTAccess && !hasStreamAccess
      const deleted =
        track.is_delete || track._marked_deleted || !!track.user?.is_deactivated
      const isPremium = isContentUSDCPurchaseGated(track.stream_conditions)
      return cn(styles.tableRow, {
        [styles.disabled]: deleted,
        [styles.lockedRow]: isLocked && !deleted && !isPremium
      })
    },
    [trackAccessMap, data]
  )

  return (
    <Table
      activeIndex={playingIndex}
      columns={tableColumns}
      data={data}
      defaultSorter={defaultSorter}
      fetchBatchSize={fetchBatchSize}
      fetchMore={fetchMoreTracks}
      fetchPage={fetchPage}
      fetchThreshold={fetchThreshold}
      getRowClassName={getRowClassName}
      isPaginated={isPaginated}
      isReorderable={isReorderable}
      isTracksTable
      isVirtualized={isVirtualized}
      loading={loading}
      onClickRow={handleClickRow}
      onReorder={onReorderTracks}
      onShowMoreToggle={onShowMoreToggle}
      onSort={onSortTracks}
      pageSize={pageSize}
      scrollRef={scrollRef}
      showMoreLimit={showMoreLimit}
      tableClassName={tableClassName}
      tableHeaderClassName={tableHeaderClassName}
      totalRowCount={totalRowCount}
      useLocalSort={useLocalSort}
      wrapperClassName={wrapperClassName}
    />
  )
}
