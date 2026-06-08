import React from 'react'

import clsx from 'clsx'
import ReactCountryFlag from 'react-country-flag'

import Error from 'components/Error'
import Table from 'components/Table'
import { DataObject, TrackerMini } from 'components/TrackerChart'
import { useIndividualNodeUptime } from 'store/cache/analytics/hooks'
import { Bucket, MetricError } from 'store/cache/analytics/slice'
import { NodeService, ContentNode, DiscoveryProvider } from 'types'
import { isMobile } from 'utils/mobile'

import styles from './ServiceTable.module.css'

type ServiceRow = {
  endpoint: string
  version: string
}

type OwnProps = {
  className?: string
  isLoading?: boolean
  title: string
  data: ServiceRow[]
  limit?: number
  moreText?: string
  onRowClick:
    | ((props: ContentNode) => void)
    | ((props: DiscoveryProvider) => void)
  onClickMore?: () => void
  alwaysShowMore?: boolean
}

type ServiceTableProps = OwnProps

const ServiceTable: React.FC<ServiceTableProps> = ({
  className,
  isLoading,
  title,
  moreText,
  limit,
  data,
  onRowClick,
  onClickMore,
  alwaysShowMore
}: ServiceTableProps) => {
  const columns = [
    { title: 'Service Endpoint', className: styles.colEndpoint },
    { title: 'Version', className: styles.colVersion },
    { title: 'Uptime', className: styles.colUptime }
  ]

  const renderRow = (data: NodeService) => {
    let error: boolean, uptimeData: DataObject[]
    // TODO: This is wrong, may need to make a row component
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { uptime } = useIndividualNodeUptime(
      data.type,
      data.endpoint,
      Bucket.DAY
    )
    if (uptime === MetricError.ERROR) {
      error = true
      uptimeData = []
    } else if (uptime?.uptime_raw_data) {
      uptimeData = []
      const hoursToDisplay = isMobile() ? -7 : -9
      for (const up of Object.values(uptime.uptime_raw_data).slice(
        hoursToDisplay
      )) {
        uptimeData.push({
          // TODO add harmony and use harmony css vars
          color: up === 1 ? '#13c65a' : '#f9344c'
          // color: up === 1 ? 'var(--harmony-light-green)' : 'var(--harmony-red)',
        })
      }
    }

    return (
      <div className={styles.rowContainer}>
        <div className={clsx(styles.rowCol, styles.colEndpoint)}>
          {data.country && /^[A-Za-z]{2}$/.test(data.country) ? (
            <ReactCountryFlag
              className={styles.countryFlag}
              countryCode={data.country}
            />
          ) : (
            <span className={styles.countryFlag} aria-label='Unknown location'>
              🏁
            </span>
          )}
          {data.endpoint}
        </div>
        <div className={clsx(styles.rowCol, styles.colVersion)}>
          {data.version ? data.version : <Error className={styles.error} />}
        </div>
        <div className={clsx(styles.rowCol, styles.colUptime)}>
          {error ? (
            <Error className={styles.error} />
          ) : (
            <TrackerMini data={uptimeData} />
          )}
        </div>
      </div>
    )
  }

  return (
    <Table
      title={title}
      isLoading={isLoading}
      className={clsx(styles.topAddressesTable, { [className!]: !!className })}
      columns={columns}
      data={data}
      limit={limit}
      renderRow={renderRow}
      onRowClick={onRowClick}
      onClickMore={onClickMore}
      moreText={moreText}
      alwaysShowMore={alwaysShowMore}
    />
  )
}

export default ServiceTable
