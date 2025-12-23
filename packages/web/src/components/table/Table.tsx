import {
  CSSProperties,
  MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { useGatedContentAccessMap } from '@audius/common/hooks'
import { Kind, ID, TrackMetadata } from '@audius/common/models'
import {
  IconCaretDown,
  IconCaretLeft,
  IconCaretRight,
  IconCaretUp,
  Tooltip
} from '@audius/harmony'
import cn from 'classnames'
import { range } from 'lodash'
import moment from 'moment'
import {
  Cell,
  Row,
  TableRowProps,
  useFlexLayout,
  useResizeColumns,
  useSortBy,
  useTable
} from 'react-table'
import {
  AutoSizer,
  InfiniteLoader,
  List,
  WindowScroller
} from 'react-virtualized'

import { Draggable, Droppable } from 'components/dragndrop'
import Skeleton from 'components/skeleton/Skeleton'

import styles from './Table.module.css'
import { TableLoadingSpinner } from './components/TableLoadingSpinner'

// - Infinite scroll constants -
// Fetch the next group of rows when the user scroll within X rows of the bottom
const FETCH_THRESHOLD = 40
// Number of rows to fetch in each batch
const FETCH_BATCH_SIZE = 80

// Column Sort Functions
export const numericSorter = (accessor: string) => (rowA: any, rowB: any) => {
  return rowA[accessor] - rowB[accessor]
}

export const alphaSorter = (accessor: string) => (rowA: any, rowB: any) => {
  if (
    rowA[accessor].trim().toLowerCase() < rowB[accessor].trim().toLowerCase()
  ) {
    return -1
  }
  if (
    rowA[accessor].trim().toLowerCase() > rowB[accessor].trim().toLowerCase()
  ) {
    return 1
  }
  return 0
}

export const dateSorter = (accessor: string) => (rowA: any, rowB: any) => {
  if (moment(rowB[accessor]).isAfter(rowA[accessor])) return 1
  if (moment(rowA[accessor]).isAfter(rowB[accessor])) return -1
  return 0
}

// Used in TracksTable
const isEmptyRowDefault = (row: any) => {
  return Boolean(!row?.original?.uid || row?.original?.kind === Kind.EMPTY)
}

export type TableProps = {
  activeIndex?: number
  columns: any[]
  data: any[]
  defaultSorter?: (a: any, b: any) => number
  fetchBatchSize?: number
  fetchMore?: (offset: number, limit: number) => void
  fetchPage?: (page: number) => void
  fetchThreshold?: number
  getRowClassName?: (rowIndex: number) => string
  isPaginated?: boolean
  isReorderable?: boolean
  isTracksTable?: boolean
  isVirtualized?: boolean
  loading?: boolean
  onClickRow?: (
    e: MouseEvent<HTMLTableRowElement>,
    rowInfo: any,
    index: number
  ) => void
  onReorder?: (source: number, destination: number) => void
  onShowMoreToggle?: (setting: boolean) => void
  onSort?: (...props: any[]) => void
  isEmptyRow?: (row: any) => boolean
  pageSize?: number
  scrollRef?: React.MutableRefObject<HTMLDivElement | undefined>
  showMoreLimit?: number
  tableClassName?: string
  tableHeaderClassName?: string
  totalRowCount?: number
  useLocalSort?: boolean
  wrapperClassName?: string
}

export const Table = ({
  activeIndex = -1,
  columns,
  data,
  defaultSorter,
  fetchBatchSize = FETCH_BATCH_SIZE,
  fetchMore,
  fetchPage,
  fetchThreshold = FETCH_THRESHOLD,
  getRowClassName,
  isPaginated = false,
  isReorderable = false,
  isTracksTable = false,
  isVirtualized = false,
  loading = false,
  onClickRow,
  onReorder,
  onShowMoreToggle,
  onSort,
  isEmptyRow = isEmptyRowDefault,
  pageSize = 50,
  scrollRef,
  showMoreLimit,
  tableClassName,
  tableHeaderClassName,
  totalRowCount,
  useLocalSort = false,
  wrapperClassName,
  ...other
}: TableProps) => {
  const trackAccessMap = useGatedContentAccessMap(isTracksTable ? data : [])

  useEffect(() => {
    if (totalRowCount == null && isPaginated) {
      console.error(
        'Programming error - need to specify the `totalRowCount` if using paginated Table component (i.e .if `isPaginated` is `true`)'
      )
    }
  }, [isPaginated, totalRowCount])
  const defaultColumn = useMemo(
    () => ({
      // Default resizing column props
      minWidth: 64,
      width: 64,
      maxWidth: 200
    }),
    []
  )

  // Pagination page
  const [currentPage, setCurrentPage] = useState<number>(0)
  const maxPage = useMemo(() => {
    if (totalRowCount == null) {
      return 0
    }
    return Math.floor(totalRowCount / pageSize)
  }, [pageSize, totalRowCount])

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state: { sortBy }
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
      autoResetSortBy: false,
      autoResetResize: false,
      manualSortBy: Boolean(onSort)
    },
    useSortBy,
    useResizeColumns,
    useFlexLayout
  )

  const [showMore, setShowMore] = useState(
    !showMoreLimit || pageSize < showMoreLimit
  )

  const prevSortValue = useRef<string | null>(null)
  const sortValue = sortBy[0] ? `${sortBy[0].id}${sortBy[0].desc}` : null

  // NOTE: react-table allows for multple sorters, but we are only checking the first here
  // - This can be updated if we need multiple sorters in the future
  const handleSortChange = useCallback(() => {
    if (isVirtualized && !useLocalSort) {
      // Virtualized Table -> Pass back the selected column and direction for backend sorting
      if (sortBy.length === 0) return onSort?.('', '')

      const sortColumn = columns.find((c) => c.id === sortBy[0].id)
      const column = sortColumn.accessor
      const order = sortBy[0]?.desc ? 'desc' : 'asc'

      onSort?.(column, order)
    } else {
      // Non-virtualized table -> Pass back the sorter from the selected column for manual frontend sorting
      let sorter = null
      let sortColumn
      let order = 'ascend'

      if (sortBy.length === 0) {
        // Use defaultSorter if sortBy array is empty
        sorter = defaultSorter
      } else {
        // Use the sorter from the column
        sortColumn = columns.find((c) => c.id === sortBy[0].id)
        sorter = sortColumn?.sorter
        order = sortBy[0]?.desc ? 'descend' : 'ascend'
      }

      if (sorter) {
        onSort?.({ column: { sorter }, order })
      } else {
        onSort?.({ column: null, order })
      }
    }
  }, [columns, defaultSorter, isVirtualized, onSort, sortBy, useLocalSort])

  useEffect(() => {
    if (sortValue !== prevSortValue.current) {
      prevSortValue.current = sortValue
      handleSortChange()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortValue])

  const renderTableHeader = useCallback((column: any, endHeader?: boolean) => {
    const { key, colSpan, role, style } = column.getHeaderProps()
    return (
      <th
        className={cn(styles.tableHeader, {
          [styles.titleHeader]: Boolean(column.accessor),
          [styles.hasSorter]: column.disableSortBy !== true,
          [styles.leftAlign]: column.align === 'left',
          [styles.rightAlign]: column.align === 'right',
          [styles.cellSectionEnd]: endHeader
        })}
        colSpan={colSpan}
        role={role}
        style={style}
        key={key}
      >
        {/* Sorting Container */}
        <div {...column.getSortByToggleProps()} title=''>
          <div className={styles.textCell}>
            {column.sortTitle ? (
              <Tooltip text={column.sortTitle} mount='page'>
                {column.render('Header')}
              </Tooltip>
            ) : (
              column.render('Header')
            )}
          </div>
          {!column.disableSortBy ? (
            <div className={styles.sortCaretContainer}>
              {!column.isSorted || !column.isSortedDesc ? (
                <IconCaretUp className={styles.sortCaret} />
              ) : null}
              {!column.isSorted || column.isSortedDesc ? (
                <IconCaretDown className={styles.sortCaret} />
              ) : null}
            </div>
          ) : null}
        </div>
        {/* Resizing Container */}
        {!column.disableResizing ? (
          <div
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            {...column.getResizerProps()}
            className={cn(styles.resizer, {
              [styles.isResizing]: column.isResizing
            })}
          />
        ) : null}
      </th>
    )
  }, [])

  const renderHeaders = useCallback(() => {
    return headerGroups.map((headerGroup) => {
      const headers = headerGroup.headers.filter(
        (header) => header.id !== 'trackActions' && header.id !== 'overflowMenu'
      )
      // Should only be one or the other
      const endHeaders = headerGroup.headers.filter(
        (header) => header.id === 'trackActions' || header.id === 'overflowMenu'
      )

      const { key: headerGroupKey, ...headerGroupProps } =
        headerGroup.getHeaderGroupProps()
      return (
        <tr
          className={styles.tableHeadRow}
          {...headerGroupProps}
          key={headerGroupKey}
        >
          {headers.map((header) => renderTableHeader(header, false))}
          {endHeaders.length
            ? endHeaders.map((endHeader) => renderTableHeader(endHeader, true))
            : null}
        </tr>
      )
    })
  }, [headerGroups, renderTableHeader])

  const renderCell = useCallback(
    (cell: Cell, isEnd?: boolean) => {
      const Cell = isVirtualized ? 'div' : 'td'

      return (
        <Cell
          className={cn(styles.tableCell, {
            [styles.leftAlign]: cell.column.align === 'left',
            [styles.rightAlign]: cell.column.align === 'right',
            [styles.cellSectionEnd]: isEnd
          })}
          {...cell.getCellProps()}
          key={`${cell.row.id}_${cell.getCellProps().key}`}
        >
          {cell.render('Cell')}
        </Cell>
      )
    },
    [isVirtualized]
  )

  const renderSkeletonCell = useCallback(
    (cell: Cell) => (
      <td
        className={cn(styles.tableCell)}
        {...cell.getCellProps()}
        key={`${cell.row.id}_skeletonCell_${cell.getCellProps().key}`}
      >
        <Skeleton noShimmer />
      </td>
    ),
    []
  )

  const renderTableRow = useCallback(
    (row: Row, key: string, props: TableRowProps, className = '') => {
      const cells = row.cells.filter(
        (cell: Cell) =>
          cell.column.id !== 'trackActions' && cell.column.id !== 'overflowMenu'
      )
      // Should only be one or the other
      const endCells = row.cells.filter(
        (cell: Cell) =>
          cell.column.id === 'trackActions' || cell.column.id === 'overflowMenu'
      )

      const Row = isVirtualized ? 'div' : 'tr'

      const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMap[
        (row.original as any).track_id
      ] ?? { isFetchingNFTAccess: false, hasStreamAccess: true }
      const isLocked = !isFetchingNFTAccess && !hasStreamAccess

      return (
        <Row
          className={cn(
            styles.tableRow,
            getRowClassName?.(row.index),
            className,
            {
              [styles.active]: row.index === activeIndex,
              [styles.disabled]: isLocked
            }
          )}
          {...props}
          key={key}
          onClick={(e: MouseEvent<HTMLTableRowElement>) =>
            onClickRow?.(e, row, row.index)
          }
        >
          {cells.map((cell) => renderCell(cell))}
          {endCells.length
            ? endCells.map((endCell) => renderCell(endCell, true))
            : null}
        </Row>
      )
    },
    [
      trackAccessMap,
      activeIndex,
      getRowClassName,
      onClickRow,
      renderCell,
      isVirtualized
    ]
  )

  const renderSkeletonRow = useCallback(
    (row: Row, key: string, props: TableRowProps) => {
      return (
        <tr
          className={cn(
            styles.tableRow,
            styles.skeletonRow,
            getRowClassName?.(row.index),
            {
              [styles.active]: row.index === activeIndex
            }
          )}
          {...props}
          key={key}
        >
          {row.cells.map((cell) => renderSkeletonCell(cell))}
        </tr>
      )
    },
    [activeIndex, getRowClassName, renderSkeletonCell]
  )

  const onDragEnd = useCallback(
    ({ source, destination }: { source: number; destination: number }) => {
      if (source === destination) return
      onReorder?.(source, source < destination ? destination - 1 : destination)
    },
    [onReorder]
  )

  const renderDraggableRow = useCallback(
    (row: any, key: string, props: TableRowProps, className = '') => {
      return (
        <Draggable
          key={key}
          id={isTracksTable ? row.original.track_id : row.id}
          index={row.id}
          text={row.original.title}
          isOwner
          kind={isTracksTable ? 'track' : 'table-row'}
          asChild
        >
          {renderTableRow(row, key, props, className)}
        </Draggable>
      )
    },
    [isTracksTable, renderTableRow]
  )

  const renderReorderableRow = useCallback(
    (row: any, key: string, props: TableRowProps, className = '') => {
      return (
        <Draggable
          key={key}
          id={isTracksTable ? row.original.track_id : row.id}
          index={row.id}
          text={row.original.title}
          isOwner
          kind={isTracksTable ? 'track' : 'table-row'}
          asChild
        >
          <Droppable
            className={styles.droppable}
            hoverClassName={styles.droppableHover}
            onDrop={(id: ID | string, draggingKind: string, index: number) => {
              onDragEnd({ source: index, destination: row.index })
            }}
            acceptedKinds={['track', 'table-row']}
            asChild
          >
            {renderTableRow(
              row,
              key,
              props,
              cn(styles.reorderableRow, className)
            )}
          </Droppable>
        </Draggable>
      )
    },
    [isTracksTable, onDragEnd, renderTableRow]
  )

  const renderRow = useCallback(
    ({
      index,
      key,
      style
    }: {
      index: number
      key: string
      style: CSSProperties
    }) => {
      const row = rows[index]
      if (!row) return

      prepareRow(row)
      const rowProps = { ...row.getRowProps({ style }) }
      const isStreamGated = (row.original as TrackMetadata).is_stream_gated

      if (isEmptyRow(row)) {
        return renderSkeletonRow(row, key, rowProps)
      }
      if (isReorderable) {
        return renderReorderableRow(row, key, rowProps)
      }
      // Cannot drag stream gated tracks
      if (isTracksTable && !isStreamGated) {
        return renderDraggableRow(row, key, rowProps)
      }
      return renderTableRow(row, key, rowProps)
    },
    [
      rows,
      prepareRow,
      isEmptyRow,
      renderSkeletonRow,
      isReorderable,
      renderReorderableRow,
      isTracksTable,
      renderDraggableRow,
      renderTableRow
    ]
  )

  const renderRows = useCallback(() => {
    const displayRows = !showMore ? rows.slice(0, showMoreLimit) : rows
    return displayRows.map((row) => {
      prepareRow(row)

      const rowProps = { ...row.getRowProps() }
      const isStreamGated = (row.original as TrackMetadata).is_stream_gated

      if (isReorderable) {
        return renderReorderableRow(row, row.id, rowProps)
      }
      // Cannot drag stream gated tracks
      if (isTracksTable && !isStreamGated) {
        return renderDraggableRow(row, row.id, rowProps)
      }
      return renderTableRow(row, row.id, rowProps)
    })
  }, [
    showMore,
    rows,
    showMoreLimit,
    prepareRow,
    isReorderable,
    renderReorderableRow,
    isTracksTable,
    renderDraggableRow,
    renderTableRow
  ])

  const loadMoreRows = useCallback(
    async ({ startIndex }: { startIndex: number }) => {
      const offset = startIndex
      const limit = fetchBatchSize
      fetchMore?.(offset, limit)
    },
    [fetchMore, fetchBatchSize]
  )

  const isRowLoaded = useCallback(
    ({ index }: { index: number }) => !isEmptyRow(rows[index]),
    [rows, isEmptyRow]
  )

  // Pagination Functions
  const goToPage = useCallback(
    (page: number) => {
      if (page !== currentPage) setCurrentPage(page)
    },
    [currentPage]
  )

  const nextPage = useCallback(() => {
    if (currentPage < maxPage) goToPage(currentPage + 1)
  }, [currentPage, goToPage, maxPage])

  const prevPage = useCallback(() => {
    if (currentPage > 0) goToPage(currentPage - 1)
  }, [currentPage, goToPage])

  useEffect(() => {
    fetchPage?.(currentPage)
  }, [currentPage, fetchPage])

  const renderPaginationControls = useCallback(() => {
    if (!isPaginated || maxPage === 0 || !showMore) return null

    return (
      <div className={styles.pageButtonContainer}>
        <IconCaretLeft
          className={cn(styles.pageCaret, {
            [styles.disabled]: currentPage <= 0
          })}
          onClick={prevPage}
        />
        {range(maxPage + 1).map((idx) => (
          <div
            key={`pageButton_${idx}`}
            className={cn(styles.pageButton, {
              [styles.active]: currentPage === idx
            })}
            onClick={() => goToPage(idx)}
          >
            {idx + 1}
          </div>
        ))}
        <IconCaretRight
          className={cn(styles.pageCaret, {
            [styles.disabled]: currentPage >= maxPage
          })}
          onClick={nextPage}
        />
      </div>
    )
  }, [
    currentPage,
    goToPage,
    isPaginated,
    maxPage,
    nextPage,
    prevPage,
    showMore
  ])

  const renderShowMoreControl = useCallback(() => {
    if (!showMoreLimit || rows.length <= showMoreLimit) return null

    const handleShowMoreToggle = () => {
      onShowMoreToggle?.(!showMore)
      setShowMore(!showMore)
    }

    return (
      <div className={styles.showMoreContainer} onClick={handleShowMoreToggle}>
        <p className={styles.showMoreText}>
          {showMore ? 'Show Less' : 'Show More'}
        </p>
        {showMore ? (
          <IconCaretUp className={styles.showMoreCaret} />
        ) : (
          <IconCaretDown className={styles.showMoreCaret} />
        )}
      </div>
    )
  }, [onShowMoreToggle, rows.length, showMore, showMoreLimit])

  const renderContent = useCallback(() => {
    return (
      <div className={cn(styles.tableWrapper, wrapperClassName)}>
        <table
          className={cn(styles.table, tableClassName)}
          {...getTableProps()}
        >
          <thead className={cn(styles.tableHead, tableHeaderClassName)}>
            {renderHeaders()}
          </thead>
          <tbody className={styles.tableBody} {...getTableBodyProps()}>
            {loading ? <TableLoadingSpinner /> : renderRows()}
          </tbody>
        </table>
        {renderPaginationControls()}
        {renderShowMoreControl()}
      </div>
    )
  }, [
    getTableBodyProps,
    getTableProps,
    loading,
    renderHeaders,
    renderPaginationControls,
    renderRows,
    renderShowMoreControl,
    tableClassName,
    tableHeaderClassName,
    wrapperClassName
  ])

  // Force the window scroller to update its position
  // after the DOM has laid out
  const wsRef = useRef<WindowScroller>(null)
  useLayoutEffect(() => {
    wsRef.current?.updatePosition()
  }, [])

  const renderVirtualizedContent = useCallback(() => {
    return (
      <InfiniteLoader
        isRowLoaded={isRowLoaded}
        loadMoreRows={loadMoreRows}
        rowCount={totalRowCount == null ? rows.length : totalRowCount}
        threshold={fetchThreshold}
        minimumBatchSize={fetchBatchSize}
      >
        {({ onRowsRendered, registerChild: registerListChild }) => (
          <div style={{ width: '100%' }}>
            <WindowScroller ref={wsRef} scrollElement={scrollRef?.current}>
              {({
                height,
                registerChild,
                isScrolling,
                onChildScroll,
                scrollTop
              }) => (
                <div className={cn(styles.tableWrapper, wrapperClassName)}>
                  <table
                    className={cn(styles.table, tableClassName)}
                    {...getTableProps()}
                  >
                    <thead
                      className={cn(styles.tableHead, tableHeaderClassName)}
                    >
                      {renderHeaders()}
                    </thead>
                    <tbody>{loading ? <TableLoadingSpinner /> : null}</tbody>
                  </table>
                  <div
                    className={styles.tableBody}
                    {...getTableBodyProps()}
                    ref={
                      registerChild as (
                        instance: HTMLTableSectionElement | null
                      ) => void
                    }
                  >
                    {loading ? null : (
                      <AutoSizer disableHeight>
                        {({ width }) => (
                          <List
                            role='Tabpanel'
                            autoHeight
                            height={height}
                            width={width}
                            isScrolling={isScrolling}
                            onScroll={onChildScroll}
                            scrollTop={scrollTop}
                            onRowsRendered={(info) => onRowsRendered(info)}
                            ref={registerListChild}
                            overscanRowsCount={2}
                            rowCount={
                              fetchMore && totalRowCount != null
                                ? totalRowCount
                                : rows.length
                            }
                            rowHeight={64}
                            rowRenderer={renderRow}
                          />
                        )}
                      </AutoSizer>
                    )}
                  </div>
                </div>
              )}
            </WindowScroller>
          </div>
        )}
      </InfiniteLoader>
    )
  }, [
    isRowLoaded,
    loadMoreRows,
    totalRowCount,
    rows.length,
    fetchThreshold,
    fetchBatchSize,
    scrollRef,
    wrapperClassName,
    tableClassName,
    getTableProps,
    tableHeaderClassName,
    renderHeaders,
    loading,
    getTableBodyProps,
    fetchMore,
    renderRow
  ])

  return isVirtualized ? renderVirtualizedContent() : renderContent()
}
