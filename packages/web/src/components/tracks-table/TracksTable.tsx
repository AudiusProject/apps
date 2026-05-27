import {
  ReactNode,
  memo,
  MouseEvent,
  useCallback,
  useMemo,
  useRef
} from 'react'

import { useGatedContentAccessMap } from '@audius/common/hooks'
import {
  ModalSource,
  SquareSizes,
  Track,
  UID,
  UserTrack,
  isContentFollowGated,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import {
  PurchaseableContentType,
  gatedContentActions,
  gatedContentSelectors,
  usePremiumContentPurchaseModal
} from '@audius/common/store'
import { formatCount, formatSeconds, dayjs } from '@audius/common/utils'
import {
  IconVisibilityHidden,
  IconLock,
  IconPlay,
  IconPause,
  IconImage,
  Flex,
  IconUserFollowing,
  IconCart,
  Artwork,
  Text,
  Tooltip
} from '@audius/harmony'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'
import { Cell, Row } from 'react-table'

import { useModalState } from 'common/hooks/useModalState'
import { TextLink, UserLink } from 'components/link'
import {
  Table,
  COLUMN_WIDTHS,
  OverflowMenuButton,
  TableFavoriteButton,
  TablePlayButton,
  TableRepostButton,
  alphaSorter,
  dateSorter,
  numericSorter
} from 'components/table'
import type { TableProps } from 'components/table/Table'
import { GatedConditionsPill } from 'components/track/GatedConditionsPill'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { isDescendantElementOf } from 'utils/domUtils'

import styles from './TracksTable.module.css'

const { setLockedContentId } = gatedContentActions
const { getGatedContentStatusMap } = gatedContentSelectors

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

type MiniTrackArtworkProps = {
  trackId: number
  trackTitle?: string
  isPlaying: boolean
  isLocked: boolean
  isDisabled?: boolean
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
}

const MiniTrackArtwork = memo(
  ({
    trackId,
    trackTitle,
    isPlaying,
    isLocked,
    isDisabled,
    onClick
  }: MiniTrackArtworkProps) => {
    const { imageUrl, hasNoArtwork } = useTrackCoverArt({
      trackId,
      size: SquareSizes.SIZE_150_BY_150
    })

    const IconComponent = hasNoArtwork
      ? IconImage
      : isLocked
        ? IconLock
        : isPlaying
          ? IconPause
          : IconPlay

    const actionLabel = isDisabled
      ? `Locked ${trackTitle || 'track'}`
      : isLocked
        ? `Unlock ${trackTitle || 'track'}`
        : `${isPlaying ? 'Pause' : 'Play'} ${trackTitle || 'track'}`

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      onClick?.(e)
    }

    return (
      <button
        type='button'
        className={styles.inlineArtworkContainer}
        aria-label={actionLabel}
        disabled={isDisabled || !onClick}
        onClick={handleClick}
      >
        <Artwork src={imageUrl} css={{ width: '100%', height: '100%' }} />
        <div
          className={cn(styles.inlineArtworkIcon, {
            [styles.inlineArtworkIconActive]: isPlaying
          })}
        >
          <IconComponent size='m' color='staticWhite' />
        </div>
      </button>
    )
  }
)
MiniTrackArtwork.displayName = 'MiniTrackArtwork'

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
  | 'comments'

type TracksTableProps = {
  data: Track[]
  disabledTrackEdit?: boolean
  isAlbumPage?: boolean
  shouldShowGatedType?: boolean
  onClickFavorite?: (track: any) => void
  onClickRemove?: (
    track: any,
    index: number,
    uid: string,
    timestamp: number
  ) => void
  onClickRepost?: (track: any) => void
  playing?: boolean
  removeText?: string
  userId?: number | null
  onReorder?: (source: number, destination: number) => void
  onSort?: (...props: any[]) => void
  columns?: TracksTableColumn[]
  showArtistInTrackNameColumn?: boolean
  onClickRow?: (track: any, index: number) => void
  trackActionsHeader?: ReactNode
  /**
   * Optional content for the Track column header, replacing the default
   * 'Track' label. Used by selection mode to render a select-all checkbox.
   */
  trackNameHeader?: ReactNode
  /**
   * Optional content rendered at the leading edge of the Track-name cell
   * (before the inline artwork). Used by selection mode to render the
   * per-row selection checkbox.
   */
  renderTrackPrefix?: (track: any, rowIndex: number) => ReactNode
  /**
   * Optional additional className applied per row. The result is appended
   * to the table's own per-row className. Use this for things like a
   * selected-row highlight while the page is in edit mode.
   */
  rowClassNameAddition?: (track: any, rowIndex: number) => string | undefined
} & Omit<TableProps, 'onClickRow' | 'columns'>

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
const ALBUM_TRACK_NAME_COLUMN_WIDTH = 168

export const TracksTable = ({
  disabledTrackEdit = false,
  isAlbumPage = false,
  shouldShowGatedType = false,
  onClickFavorite,
  onClickRemove,
  onClickRepost,
  playing = false,
  removeText,
  showArtistInTrackNameColumn = false,
  userId,
  columns = defaultColumns,
  data,
  activeIndex,
  trackActionsHeader,
  trackNameHeader,
  renderTrackPrefix,
  rowClassNameAddition,
  ...tableProps
}: TracksTableProps) => {
  const { isVirtualized, onClickRow } = tableProps
  const activeIndexRef = useRef(activeIndex)
  activeIndexRef.current = activeIndex
  const playingRef = useRef(playing)
  playingRef.current = playing
  const dispatch = useDispatch()
  const gatedTrackStatusMap = useSelector(getGatedContentStatusMap)
  const gatedTrackStatusMapRef = useRef(gatedTrackStatusMap)
  gatedTrackStatusMapRef.current = gatedTrackStatusMap
  const trackAccessMap = useGatedContentAccessMap(data)
  const trackAccessMapRef = useRef(trackAccessMap)
  trackAccessMapRef.current = trackAccessMap
  const dataRef = useRef(data)
  dataRef.current = data
  const onClickRowRef = useRef(onClickRow)
  onClickRowRef.current = onClickRow
  const onClickFavoriteRef = useRef(onClickFavorite)
  onClickFavoriteRef.current = onClickFavorite
  const onClickRepostRef = useRef(onClickRepost)
  onClickRepostRef.current = onClickRepost
  const onClickRemoveRef = useRef(onClickRemove)
  onClickRemoveRef.current = onClickRemove
  const renderTrackPrefixRef = useRef(renderTrackPrefix)
  renderTrackPrefixRef.current = renderTrackPrefix
  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()
  const [, setGatedModalVisibility] = useModalState('LockedContent')
  const trackNameColumnWidth = isAlbumPage
    ? ALBUM_TRACK_NAME_COLUMN_WIDTH
    : COLUMN_WIDTHS.artistName

  const shouldSkipTrackActivation = useCallback((track: RowInfo) => {
    const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMapRef.current[
      track.track_id
    ] ?? {
      isFetchingNFTAccess: false,
      hasStreamAccess: true
    }
    const isLocked = !isFetchingNFTAccess && !hasStreamAccess
    const isPremium = isContentUSDCPurchaseGated(track.stream_conditions)
    const deleted =
      track.is_delete || track._marked_deleted || !!track.user?.is_deactivated

    return (isLocked && !isPremium) || deleted
  }, [])

  const activateTrack = useCallback(
    (track: RowInfo, index: number) => {
      if (shouldSkipTrackActivation(track)) return
      onClickRowRef.current?.(track, index)
    },
    [shouldSkipTrackActivation]
  )

  // Cell Render Functions
  const renderPlayButtonCell = useCallback((cellInfo: TrackCell) => {
    const index = cellInfo.row.index
    const active = index === activeIndexRef.current
    const track = cellInfo.row.original
    const isTrackPremium = isContentUSDCPurchaseGated(track.stream_conditions)
    const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMapRef.current[
      track.track_id
    ] ?? { isFetchingNFTAccess: false, hasStreamAccess: true }
    const isLocked = !isFetchingNFTAccess && !hasStreamAccess

    return (
      <TablePlayButton
        className={cn(styles.tablePlayButton, { [styles.active]: active })}
        paused={!playingRef.current}
        playing={active}
        hideDefault={false}
        isTrackPremium={isTrackPremium}
        isLocked={isLocked}
      />
    )
  }, [])

  const renderTrackNameCell = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const index = cellInfo.row.index
      const active = index === activeIndexRef.current
      const isTrackPlaying = active && playingRef.current
      const deleted =
        track.is_delete || track._marked_deleted || !!track.user?.is_deactivated
      const user = track.user
      const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMapRef
        .current[track.track_id] ?? {
        isFetchingNFTAccess: false,
        hasStreamAccess: true
      }
      const isLocked = !isFetchingNFTAccess && !hasStreamAccess
      const isPremium = isContentUSDCPurchaseGated(track.stream_conditions)
      const isArtworkDisabled =
        !onClickRowRef.current || (isLocked && !isPremium) || deleted

      const artistRow = showArtistInTrackNameColumn ? (
        user?.is_deactivated ? (
          <Text
            variant='body'
            size='s'
            strength='default'
            color='subdued'
            css={{
              display: 'block',
              lineHeight: '125%',
              width: '100%',
              minWidth: 0
            }}
            ellipses
          >
            {`${user.name} [Deactivated]`}
          </Text>
        ) : user?.user_id ? (
          <UserLink
            className={styles.stackedArtistText}
            userId={user.user_id}
            size='s'
            strength='default'
            variant={active ? 'visible' : 'default'}
            badgeSize='xs'
            aria-label={`View artist: ${user.name}`}
            popover
          />
        ) : (
          <Text
            variant='body'
            size='s'
            strength='default'
            color='subdued'
            css={{
              display: 'block',
              lineHeight: '125%',
              width: '100%',
              minWidth: 0
            }}
            ellipses
          >
            Unknown
          </Text>
        )
      ) : null

      const prefix = renderTrackPrefixRef.current?.(track, index)

      return (
        <Flex className={styles.trackInfoContainer}>
          {prefix}
          {showArtistInTrackNameColumn && track.track_id ? (
            <MiniTrackArtwork
              trackId={track.track_id}
              trackTitle={track.name ?? track.title}
              isPlaying={isTrackPlaying}
              isLocked={isLocked}
              isDisabled={isArtworkDisabled}
              onClick={() => activateTrack(track, index)}
            />
          ) : null}
          <Flex
            direction='column'
            justifyContent='center'
            className={styles.textContainer}
            css={{ overflow: 'hidden', width: '100%', minWidth: 0 }}
          >
            {deleted ? (
              <Tooltip
                text={`${track.name} [Deleted By Artist]`}
                mount='page'
                mouseEnterDelay={1}
              >
                <Text
                  variant='title'
                  size='s'
                  strength='weak'
                  css={{
                    display: 'block',
                    lineHeight: '125%',
                    width: '100%',
                    minWidth: 0
                  }}
                  ellipses
                >{`${track.name} [Deleted By Artist]`}</Text>
              </Tooltip>
            ) : (
              <Tooltip
                text={track.name ?? track.title}
                mount='page'
                mouseEnterDelay={1}
              >
                <TextLink
                  className={styles.trackTitleLink}
                  to={deleted ? '' : track.permalink}
                  isActive={active}
                  textVariant='title'
                  size='s'
                  strength='weak'
                  aria-label={`View track: ${track.name ?? track.title}`}
                  css={{
                    display: 'block',
                    lineHeight: '125%',
                    width: '100%',
                    minWidth: 0
                  }}
                  ellipses
                >
                  {track.name ?? track.title}
                </TextLink>
              </Tooltip>
            )}
            {artistRow}
          </Flex>
        </Flex>
      )
    },
    [activateTrack, showArtistInTrackNameColumn]
  )

  const renderArtistNameCell = useCallback((cellInfo: TrackCell) => {
    const { original: track, index } = cellInfo.row
    const { user } = track
    if (!user) {
      return 'Unknown'
    }
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
          variant={index === activeIndexRef.current ? 'visible' : 'default'}
          badgeSize='xs'
          aria-label={`View artist: ${user.name}`}
          popover
        />
      </div>
    )
  }, [])

  const renderPlaysCell = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const {
        is_unlisted: isUnlisted,
        is_delete: isDelete,
        owner_id: ownerId,
        is_stream_gated: isStreamGated
      } = track
      const isOwner = ownerId === userId
      if (!isOwner && (isStreamGated || isUnlisted || isDelete)) return null
      return formatCount(track.plays ?? track.play_count)
    },
    [userId]
  )

  const renderRepostsCell = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const {
        is_unlisted: isUnlisted,
        is_delete: isDelete,
        owner_id: ownerId
      } = track
      const isOwner = ownerId === userId
      if ((isDelete || isUnlisted) && !isOwner) return null
      return formatCount(track.repost_count)
    },
    [userId]
  )

  const renderLengthCell = useCallback((cellInfo: TrackCell) => {
    const track = cellInfo.row.original
    return formatSeconds(track.time ?? track.duration)
  }, [])

  const renderDateCell = useCallback((cellInfo: TrackCell) => {
    const track = cellInfo.row.original
    return dayjs(track.date).format('M/D/YY')
  }, [])

  const renderAddedDateCell = useCallback((cellInfo: TrackCell) => {
    const track = cellInfo.row.original
    return dayjs(track.dateAdded).format('M/D/YY')
  }, [])

  const renderSavedDateCell = useCallback((cellInfo: TrackCell) => {
    const track = cellInfo.row.original
    return dayjs(track.dateSaved).format('M/D/YY')
  }, [])

  const renderSavesCell = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const {
        is_unlisted: isUnlisted,
        is_delete: isDelete,
        owner_id: ownerId
      } = track
      const isOwner = ownerId === userId
      if ((isDelete || isUnlisted) && !isOwner) return null
      return formatCount(track.save_count)
    },
    [userId]
  )

  const renderCommentsCell = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const {
        is_unlisted: isUnlisted,
        is_delete: isDelete,
        owner_id: ownerId,
        comments_disabled: commentsDisabled
      } = track
      const isOwner = ownerId === userId
      if (commentsDisabled || ((isDelete || isUnlisted) && !isOwner)) {
        return null
      }
      return formatCount(track.comment_count)
    },
    [userId]
  )

  const renderReleaseDateCell = useCallback((cellInfo: TrackCell) => {
    const track = cellInfo.row.original
    return dayjs(track.release_date ?? track.created_at).format('M/D/YY')
  }, [])

  const renderListenDateCell = useCallback((cellInfo: TrackCell) => {
    const track = cellInfo.row.original
    return dayjs(track.dateListened).format('M/D/YY')
  }, [])

  const favoriteButtonRef = useRef<HTMLDivElement>(null)
  const renderFavoriteButtonCell = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMapRef
        .current[track.track_id] ?? {
        isFetchingNFTAccess: false,
        hasStreamAccess: true
      }
      const isLocked = !isFetchingNFTAccess && !hasStreamAccess
      const deleted =
        track.is_delete || track._marked_deleted || !!track.user?.is_deactivated
      const isOwner = track.owner_id === userId
      const isUnlisted = track.is_unlisted
      if (isLocked || deleted || isOwner || isUnlisted) {
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
              onClick={() => onClickFavoriteRef.current?.(track)}
              favorited={track.has_current_user_saved}
            />
          </div>
        </Tooltip>
      )
    },
    [userId]
  )

  const repostButtonRef = useRef<HTMLDivElement>(null)
  const renderRepostButtonCell = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMapRef
        .current[track.track_id] ?? {
        isFetchingNFTAccess: false,
        hasStreamAccess: true
      }
      const isLocked = !isFetchingNFTAccess && !hasStreamAccess
      const deleted =
        track.is_delete || track._marked_deleted || !!track.user?.is_deactivated
      const isUnlisted = track.is_unlisted
      const isOwner = track.owner_id === userId
      if (isLocked || deleted || isOwner || isUnlisted) {
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
                onClickRepostRef.current?.(track)
                e.stopPropagation()
              }}
              reposted={track.has_current_user_reposted}
            />
          </div>
        </Tooltip>
      )
    },
    [userId]
  )

  const overflowMenuRef = useRef<HTMLDivElement>(null)
  const renderOverflowMenuCell = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const { stream_conditions: streamConditions, is_unlisted: isUnlisted } =
        track
      const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMapRef
        .current[track.track_id] ?? {
        isFetchingNFTAccess: false,
        hasStreamAccess: true
      }
      const isOwner = track.owner_id === userId
      const isLocked = !isFetchingNFTAccess && !hasStreamAccess
      const isDdex = !!track.ddex_app
      const deleted =
        track.is_delete || track._marked_deleted || !!track.user?.is_deactivated
      // For owners, we want to show the type of gating on the track. For fans,
      // we want to show whether or not they have access.
      let Icon
      if (shouldShowGatedType) {
        Icon = track.is_unlisted
          ? IconVisibilityHidden
          : isContentUSDCPurchaseGated(streamConditions)
            ? IconCart
            : isContentFollowGated(streamConditions)
              ? IconUserFollowing
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
        includeFavorite: !isLocked && !isUnlisted,
        handle: track.handle,
        trackId: track.track_id,
        uid: track.uid,
        date: track.date,
        isFavorited: track.has_current_user_saved,
        isOwner,
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
            includeShare: !isUnlisted || isOwner,
            includeEmbed: !isUnlisted,
            includeEdit: !disabledTrackEdit,
            includeAddToPlaylist: !isUnlisted || isOwner,
            onRemove: onClickRemoveRef.current,
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
    [shouldShowGatedType, disabledTrackEdit, isAlbumPage, removeText, userId]
  )

  const onClickPremiumPill = useCallback(
    (trackId: number) => {
      openPremiumContentPurchaseModal(
        {
          contentId: trackId,
          contentType: PurchaseableContentType.TRACK
        },
        { source: ModalSource.TrackLibrary }
      )
    },
    [openPremiumContentPurchaseModal]
  )

  const onClickGatedPill = useCallback(
    (trackId: number) => {
      dispatch(setLockedContentId({ id: trackId }))
      setGatedModalVisibility(true)
    },
    [dispatch, setGatedModalVisibility]
  )

  const renderLockedButtonCell = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMapRef
        .current[track.track_id] ?? {
        isFetchingNFTAccess: false,
        hasStreamAccess: true
      }
      const isLocked = !isFetchingNFTAccess && !hasStreamAccess
      const isLockedPremium =
        isLocked && isContentUSDCPurchaseGated(track.stream_conditions)
      const gatedTrackStatus = gatedTrackStatusMapRef.current[track.track_id]
      const isOwner = track.owner_id === userId

      const deleted =
        track.is_delete || track._marked_deleted || !!track.user?.is_deactivated

      if (!isLocked || deleted || isOwner) {
        return null
      }
      return (
        <GatedConditionsPill
          streamConditions={track.stream_conditions!}
          unlocking={gatedTrackStatus === 'UNLOCKING'}
          onClick={() => {
            isLockedPremium
              ? onClickPremiumPill(track.track_id)
              : onClickGatedPill(track.track_id)
          }}
          buttonSize='small'
          showIcon={false}
          contentId={track.track_id}
          contentType='track'
        />
      )
    },
    [onClickGatedPill, onClickPremiumPill, userId]
  )

  const renderTrackActions = useCallback(
    (cellInfo: TrackCell) => {
      const track = cellInfo.row.original
      const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMapRef
        .current[track.track_id] ?? {
        isFetchingNFTAccess: false,
        hasStreamAccess: true
      }
      const isLocked = !isFetchingNFTAccess && !hasStreamAccess

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
          {isLocked ? renderLockedButtonCell(cellInfo) : null}
          {!isLocked ? renderRepostButtonCell(cellInfo) : null}
          {!isLocked ? renderFavoriteButtonCell(cellInfo) : null}
          {renderOverflowMenuCell(cellInfo)}
        </Flex>
      )
    },
    [
      renderFavoriteButtonCell,
      renderOverflowMenuCell,
      renderLockedButtonCell,
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
        minWidth: COLUMN_WIDTHS.date,
        width: COLUMN_WIDTHS.date,
        maxWidth: COLUMN_WIDTHS.date,
        sortTitle: 'Date Added',
        sorter: dateSorter('dateAdded'),
        disableResizing: true,
        align: 'right'
      },
      artistName: {
        id: 'artistName',
        Header: 'Artist',
        accessor: 'artist',
        Cell: renderArtistNameCell,
        minWidth: COLUMN_WIDTHS.artistName,
        width: COLUMN_WIDTHS.artistName,
        maxWidth: COLUMN_WIDTHS.artistName,
        sortTitle: 'Artist Name',
        sorter: alphaSorter('artist'),
        disableResizing: true,
        align: 'left'
      },
      date: {
        id: 'date',
        Header: 'Date',
        accessor: 'date',
        Cell: renderDateCell,
        minWidth: COLUMN_WIDTHS.date,
        width: COLUMN_WIDTHS.date,
        maxWidth: COLUMN_WIDTHS.date,
        sortTitle: 'Date Listened',
        sorter: dateSorter('date'),
        disableResizing: true,
        align: 'right'
      },
      listenDate: {
        id: 'dateListened',
        Header: 'Played',
        accessor: 'dateListened',
        Cell: renderListenDateCell,
        minWidth: COLUMN_WIDTHS.date,
        width: COLUMN_WIDTHS.date,
        maxWidth: COLUMN_WIDTHS.date,
        sortTitle: 'Date Listened',
        sorter: dateSorter('dateListened'),
        disableResizing: true,
        align: 'right'
      },
      releaseDate: {
        id: 'dateReleased',
        Header: 'Released',
        accessor: 'created_at',
        Cell: renderReleaseDateCell,
        minWidth: COLUMN_WIDTHS.date,
        width: COLUMN_WIDTHS.date,
        maxWidth: COLUMN_WIDTHS.date,
        sortTitle: 'Date Released',
        sorter: dateSorter('created_at'),
        disableResizing: true,
        align: 'right'
      },
      reposts: {
        id: 'reposts',
        Header: 'Reposts',
        accessor: 'repost_count',
        Cell: renderRepostsCell,
        minWidth: COLUMN_WIDTHS.numeric,
        width: COLUMN_WIDTHS.numeric,
        maxWidth: COLUMN_WIDTHS.numeric,
        sortTitle: 'Reposts',
        sorter: numericSorter('repost_count'),
        disableResizing: true,
        align: 'right'
      },
      plays: {
        id: 'plays',
        Header: 'Plays',
        accessor: 'plays',
        Cell: renderPlaysCell,
        minWidth: COLUMN_WIDTHS.numeric,
        width: COLUMN_WIDTHS.numeric,
        maxWidth: COLUMN_WIDTHS.numeric,
        sortTitle: 'Plays',
        sorter: numericSorter('plays'),
        disableResizing: true,
        align: 'right'
      },
      playButton: {
        id: 'playButton',
        Cell: renderPlayButtonCell,
        minWidth: COLUMN_WIDTHS.playButton,
        maxWidth: COLUMN_WIDTHS.playButton,
        disableResizing: true,
        disableSortBy: true
      },
      saves: {
        id: 'saves',
        Header: 'Favorites',
        accessor: 'save_count',
        Cell: renderSavesCell,
        minWidth: COLUMN_WIDTHS.numeric,
        width: COLUMN_WIDTHS.numeric,
        maxWidth: COLUMN_WIDTHS.numeric,
        sortTitle: 'Favorites',
        sorter: numericSorter('save_count'),
        disableResizing: true,
        align: 'right'
      },
      comments: {
        id: 'comments',
        Header: 'Comments',
        accessor: 'comment_count',
        Cell: renderCommentsCell,
        minWidth: COLUMN_WIDTHS.numeric,
        width: COLUMN_WIDTHS.numeric,
        maxWidth: COLUMN_WIDTHS.numeric,
        sortTitle: 'Comments',
        sorter: numericSorter('comment_count'),
        disableResizing: true,
        align: 'right'
      },
      overflowActions: {
        id: 'trackActions',
        Header: trackActionsHeader ? (
          <div className={styles.trackActionsHeader}>{trackActionsHeader}</div>
        ) : null,
        Cell: renderTrackActions,
        minWidth: COLUMN_WIDTHS.trackActions,
        maxWidth: COLUMN_WIDTHS.trackActions,
        width: COLUMN_WIDTHS.trackActions,
        disableResizing: true,
        disableSortBy: true,
        align: 'right'
      },
      overflowMenu: {
        id: 'overflowMenu',
        Cell: renderOverflowMenuCell,
        minWidth: COLUMN_WIDTHS.overflowMenu,
        maxWidth: COLUMN_WIDTHS.overflowMenu,
        width: COLUMN_WIDTHS.overflowMenu,
        disableResizing: true,
        disableSortBy: true
      },
      length: {
        id: 'time',
        Header: 'Length',
        accessor: 'time',
        Cell: renderLengthCell,
        minWidth: COLUMN_WIDTHS.numeric,
        width: COLUMN_WIDTHS.numeric,
        maxWidth: COLUMN_WIDTHS.numeric,
        sortTitle: 'Track Length',
        sorter: numericSorter('time'),
        disableSortBy: isVirtualized,
        disableResizing: true,
        align: 'right'
      },
      trackName: {
        id: 'trackName',
        Header: trackNameHeader ?? 'Track',
        accessor: 'title',
        Cell: renderTrackNameCell,
        minWidth: trackNameColumnWidth,
        width: trackNameColumnWidth,
        maxWidth: Number.MAX_SAFE_INTEGER,
        sortTitle: 'Track Name',
        sorter: alphaSorter('title'),
        // When a custom header is supplied (e.g. select-all checkbox),
        // suppress column sorting so the header's controls receive clicks
        // instead of toggling sort order.
        disableSortBy: Boolean(trackNameHeader),
        align: 'left'
      },
      savedDate: {
        id: 'dateSaved',
        Header: 'Saved',
        accessor: 'dateSaved',
        Cell: renderSavedDateCell,
        minWidth: COLUMN_WIDTHS.date,
        width: COLUMN_WIDTHS.date,
        maxWidth: COLUMN_WIDTHS.date,
        sortTitle: 'Date Saved',
        sorter: dateSorter('dateSaved'),
        disableResizing: true,
        align: 'right'
      },
      spacer: {
        id: 'spacer',
        maxWidth: COLUMN_WIDTHS.spacer,
        minWidth: COLUMN_WIDTHS.spacer,
        disableSortBy: true,
        disableResizing: true
      }
    }),
    [
      renderAddedDateCell,
      renderArtistNameCell,
      renderDateCell,
      renderListenDateCell,
      renderReleaseDateCell,
      renderRepostsCell,
      renderPlaysCell,
      renderPlayButtonCell,
      renderSavesCell,
      renderCommentsCell,
      renderTrackActions,
      trackActionsHeader,
      trackNameHeader,
      renderOverflowMenuCell,
      renderLengthCell,
      isVirtualized,
      trackNameColumnWidth,
      renderTrackNameCell,
      renderSavedDateCell
    ]
  )

  const tableColumns = useMemo(
    () => columns.map((id) => tableColumnMap[id]),
    [columns, tableColumnMap]
  )

  const handleClickRow = useCallback(
    (e: MouseEvent<HTMLTableRowElement>, rowInfo: TrackRow, index: number) => {
      const track = rowInfo.original
      const clickedActionButton = [
        favoriteButtonRef,
        repostButtonRef,
        overflowMenuRef
      ].some((ref) => isDescendantElementOf(e?.target, ref.current))

      if (clickedActionButton) return
      activateTrack(track, index)
    },
    [activateTrack]
  )

  const rowClassNameAdditionRef = useRef(rowClassNameAddition)
  rowClassNameAdditionRef.current = rowClassNameAddition

  const getRowClassName = useCallback((rowIndex: number) => {
    const track = dataRef.current[rowIndex]
    const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMapRef.current[
      track.track_id
    ] ?? {
      isFetchingNFTAccess: false,
      hasStreamAccess: true
    }
    const isLocked = !isFetchingNFTAccess && !hasStreamAccess
    const deleted =
      track.is_delete || track._marked_deleted || !!track.user?.is_deactivated
    const isPremium = isContentUSDCPurchaseGated(track.stream_conditions)
    const extra = rowClassNameAdditionRef.current?.(track, rowIndex)
    return cn(
      styles.tableRow,
      {
        [styles.disabled]: deleted,
        [styles.lockedRow]: isLocked && !deleted && !isPremium
      },
      extra
    )
  }, [])

  return (
    <Table
      {...tableProps}
      columns={tableColumns}
      data={data}
      activeIndex={activeIndex}
      onClickRow={handleClickRow}
      getRowClassName={getRowClassName}
      isTracksTable
    />
  )
}
