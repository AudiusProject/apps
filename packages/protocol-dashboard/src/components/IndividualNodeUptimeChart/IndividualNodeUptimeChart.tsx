import React from 'react'

import { TrackerChart, DataObject } from 'components/TrackerChart'
import { useIndividualNodeUptime } from 'store/cache/analytics/hooks'
import { Bucket, MetricError } from 'store/cache/analytics/slice'
import { ServiceType } from 'types'

type OwnProps = {
  nodeType: ServiceType
  node: string
}

type IndividualNodeUptimeChartProps = OwnProps

const IndividualNodeUptimeChart: React.FC<IndividualNodeUptimeChartProps> = ({
  nodeType,
  node
}) => {
  let error, subtitle: string, data: DataObject[]
  const { uptime } = useIndividualNodeUptime(nodeType, node, Bucket.DAY)
  if (uptime === MetricError.ERROR) {
    error = true
    data = []
  } else if (uptime?.uptime_percentage && uptime?.uptime_raw_data) {
    subtitle = `Uptime ${Math.round(uptime.uptime_percentage * 100) / 100}%`
    data = []
    for (const [bucket, up] of Object.entries(uptime.uptime_raw_data)) {
      data.push({
        color: up === 1 ? '#13c65a' : '#f9344c',
        tooltip: new Date(bucket).toUTCString()
      })
    }
  }

  return (
    <TrackerChart
      title='Status'
      subtitle={subtitle}
      data={data}
      error={error}
    />
  )
}

export default IndividualNodeUptimeChart
