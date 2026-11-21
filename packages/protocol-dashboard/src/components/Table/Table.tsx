import React, { useCallback } from 'react'

import { Flex, Text } from '@audius/harmony'
import clsx from 'clsx'

import Error from 'components/Error'
import { AppliedInfoTooltipProps } from 'components/InfoTooltip/InfoTooltips'
import Loading from 'components/Loading'
import Paper from 'components/Paper'

import styles from './Table.module.css'

type TableProps = {
  className?: string

  title?: string

  label?: string

  isLoading?: boolean

  columns: Array<{ title: string; className?: string }>

  data: Array<any>

  renderRow: (props: any) => React.ReactNode

  onRowClick?: (row: any) => void

  limit?: number

  alwaysShowMore?: boolean

  moreText?: string

  onClickMore?: () => void

  error?: boolean

  tooltipComponent?: React.ComponentType<AppliedInfoTooltipProps>
}

type RowProps = {
  data: any
  onRowClick: (data: any) => void
  renderRow: (data: any) => React.ReactNode
}
const Row = ({ data, onRowClick, renderRow }: RowProps) => {
  const onClick = useCallback(() => {
    onRowClick(data)
  }, [onRowClick, data])
  return (
    <div className={styles.rowContainer} onClick={onClick}>
      {renderRow(data)}
    </div>
  )
}

const Table: React.FC<TableProps> = ({
  className,
  title,
  label,
  isLoading,
  columns,
  data,
  renderRow,
  limit,
  alwaysShowMore,
  moreText,
  onRowClick = () => {},
  onClickMore,
  error,
  tooltipComponent
}: TableProps) => {
  const rowLimit = limit || data.length
  const showMore = data.length > rowLimit || alwaysShowMore
  const TooltipComponent = tooltipComponent
  return (
    <Paper className={clsx(styles.container, { [className!]: !!className })}>
      {title && (
        <div className={styles.titleContainer}>
          <Flex inline gap='xs' alignItems='center'>
            <Text variant='heading' size='s' strength='default' tag='span'>
              {title}
            </Text>
            {tooltipComponent == null ? null : <TooltipComponent />}
          </Flex>
          {label && <p className={styles.label}>{label}</p>}
        </div>
      )}
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <Loading className={styles.tableLoading} />
        </div>
      ) : error ? (
        <Error className={styles.error} />
      ) : (
        <>
          <div className={styles.headers}>
            {columns.map((c) => (
              <div
                key={c.title}
                className={clsx(styles.columnTitle, c.className)}
              >
                {c.title}
              </div>
            ))}
          </div>
          {data.slice(0, rowLimit).map((data: any, idx: number) => (
            <Row
              key={idx}
              onRowClick={onRowClick}
              data={data}
              renderRow={renderRow}
            />
          ))}
          {showMore && moreText && (
            <div onClick={onClickMore} className={styles.moreText}>
              {moreText}
            </div>
          )}
        </>
      )}
    </Paper>
  )
}

export default Table
