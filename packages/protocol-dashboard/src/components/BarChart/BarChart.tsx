import React from 'react'

import { Flex } from '@audius/harmony'
import clsx from 'clsx'
import { HorizontalBar } from 'react-chartjs-2'

import Dropdown from 'components/Dropdown'
import Error from 'components/Error'
import Loading from 'components/Loading'
import Paper from 'components/Paper'
import { formatBucketText } from 'store/cache/analytics/hooks'
import { formatShortNumber } from 'utils/format'
import { useIsMobile } from 'utils/hooks'
import { createStyles } from 'utils/mobile'

import './draw'
import desktopStyles from './BarChart.module.css'
import mobileStyles from './BarChartMobile.module.css'

const styles = createStyles({ desktopStyles, mobileStyles })

const colors = [
  'rgba(145,71,204,1)',
  'rgba(145,71,204,0.8)',
  'rgba(145,71,204,0.7)',
  'rgba(145,71,204,0.6)',
  'rgba(145,71,204,0.5)',
  'rgba(145,71,204,0.4)',
  'rgba(145,71,204,0.3)',
  'rgba(145,71,204,0.2)',
  'rgba(145,71,204,0.1)'
]

const getData = (data: number[], isMobile: boolean) => ({
  labels: data.map((d) => formatShortNumber(d).toUpperCase()),
  datasets: [
    {
      backgroundColor: colors,
      hoverBackgroundColor: colors,
      borderWidth: 0,
      barPercentage: 1,
      barThickness: isMobile ? 15 : 30,
      scale: {
        offset: false
      },
      data
    }
  ]
})

const getOptions = (id: string, labels: string[], max: number) => ({
  layout: {
    padding: {
      left: 0,
      right: 20
    }
  },
  scales: {
    xAxes: [
      {
        gridLines: {
          display: false,
          color: 'rgba(90,94,120,1)',
          offsetGridLines: false
        },
        ticks: {
          display: false,
          beginAtZero: true,
          max: max * 1.1
        }
      }
    ],
    yAxes: [
      {
        position: 'right',
        gridLines: {
          display: false,
          drawBorder: false,
          offsetGridLines: false
        },
        ticks: {
          mirror: true,
          padding: 26,
          z: 10,
          autoSkip: false,
          fontColor: 'rgba(190,197,224,1)',
          fontFamily: 'Avenir Next LT Pro',
          fontSize: 12,
          fontStyle: 'bold'
        }
      }
    ]
  },
  legend: {
    display: false
  },
  tooltips: {
    enabled: false
  },
  animation: {
    onProgress(animation: any) {
      // @ts-ignore
      const chartInstance = this.chart
      const ctx = chartInstance.ctx
      const meta = chartInstance.controller.getDatasetMeta(0)

      // @ts-ignore
      Chart.helpers.each(
        // @ts-ignore
        meta.data.forEach((bar, index) => {
          const label = labels[index]
          const labelPositionX = 20
          const labelWidth = ctx.measureText(label).width + labelPositionX

          ctx.textBaseline = 'middle'
          ctx.textAlign = 'left'
          ctx.fillStyle = 'rgba(203,209,227,1)'
          ctx.fillText(
            label,
            Math.max(bar._model.x - labelWidth, 0),
            bar._model.y
          )
        })
      )
    }
  },
  events: []
})

type OwnProps = {
  title: string
  titleTooltipComponent?: React.ComponentType
  column1: string
  column2: string
  labels: string[] | null
  data?: number[] | null
  error?: boolean
  options?: string[]
  selection?: string
  onSelectOption?: (option: string) => void
  onClick?: () => void
}

type BarChartProps = OwnProps

const BarChart: React.FC<BarChartProps> = ({
  title,
  titleTooltipComponent,
  column1,
  column2,
  data,
  labels,
  error,
  options,
  selection,
  onSelectOption,
  onClick
}) => {
  const isMobile = useIsMobile()
  const TitleTooltipComponent = titleTooltipComponent

  return (
    <Paper
      className={clsx(styles.chartContainer, { [styles.onClick]: !!onClick })}
      onClick={onClick}
    >
      <div className={styles.header}>
        <Flex inline gap='xs' alignItems='center'>
          <div className={styles.title}>{title}</div>
          {TitleTooltipComponent == null ? null : <TitleTooltipComponent />}
        </Flex>

        {options && selection && onSelectOption && (
          <div className={styles.dropdown}>
            <Dropdown
              selection={selection}
              options={options}
              onSelectOption={onSelectOption}
              textFormatter={formatBucketText}
            />
          </div>
        )}
      </div>
      <div className={styles.chart}>
        {error ? (
          <Error />
        ) : data && labels ? (
          <>
            <div className={styles.columns}>
              <div>{column1}</div>
              <div>{column2}</div>
            </div>
            <HorizontalBar
              height={180}
              data={getData(data, isMobile)}
              options={getOptions(title, labels, Math.max(...data))}
            />
          </>
        ) : (
          <Loading className={styles.loading} />
        )}
      </div>
    </Paper>
  )
}

export default BarChart
