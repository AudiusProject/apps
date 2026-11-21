import React from 'react'

import { IconCrown } from '@audius/stems'
import { Bar } from 'react-chartjs-2'

import Error from 'components/Error'
import Loading from 'components/Loading'
import Paper from 'components/Paper'
import { formatShortNumber, formatShortNumberWithDecimal } from 'utils/format'
import 'components/BarChart/draw'
import { useIsMobile } from 'utils/hooks'
import { createStyles } from 'utils/mobile'

import desktopStyles from './VerticalBarChart.module.css'
import mobileStyles from './VerticalBarChartMobile.module.css'

const styles = createStyles({ desktopStyles, mobileStyles })

const getData = (data: number[], isMobile: boolean) => ({
  labels: data.map((d) => formatShortNumber(d).toUpperCase()),
  datasets: [
    {
      backgroundColor: 'rgba(145, 71, 204, 0.7)',
      hoverBackgroundColor: 'rgba(145, 71, 204, 0.7)',
      borderWidth: 0,
      barThickness: isMobile ? 30 : 72,
      scale: {
        offset: false
      },
      data
    }
  ]
})

const getOptions = (id: string, max: number) => ({
  layout: {
    padding: {
      left: 0,
      right: 0
    }
  },
  scales: {
    xAxes: [
      {
        gridLines: {
          display: false,
          color: 'rgba(90,94,120,1)',
          drawBorder: true,
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
          display: true,
          drawBorder: false,
          color: '#393A54',
          offset: false,
          offsetGridLines: false,
          zeroLineWidth: 1,
          zeroLineColor: '#393A54'
        },
        ticks: {
          mirror: true,
          padding: 10,
          labelOffset: -16,
          offset: true,
          z: 10,
          autoSkip: false,
          fontColor: '#BEC5E0',
          fontFamily: 'Avenir Next LT Pro',
          fontSize: 12,
          fontStyle: 'bold',
          callback: (value: number) => {
            return formatShortNumber(value).toUpperCase()
          }
        }
      }
    ]
  },
  legend: {
    display: false
  },
  tooltips: {
    enabled: false,
    titleFontFamily: 'Avenir Next LT Pro',
    titleFontSize: 10,
    titleFontStyle: 500,
    titleFontColor: '#FFFFFF',
    titleSpacing: 0,
    titleMarginBottom: 7,
    bodyFontFamily: 'Avenir Next LT Pro',
    bodyFontSize: 16,
    bodyFontStyle: 'bold',
    bodyFontColor: '#FFFFFF',
    bodySpacing: 0,
    bodyMarginBottom: 2,
    xPadding: 16,
    yPadding: 11,
    xAlign: 'left',
    yAlign: 'bottom',
    position: 'nearest',
    custom: function (tooltipModel: any) {
      let tooltipEl = document.getElementById(`chartjs-tooltip-${id}`)

      if (!tooltipEl) {
        tooltipEl = document.createElement('div')
        tooltipEl.id = `chartjs-tooltip-${id}`
        tooltipEl.innerHTML = '<div></div>'
        document.body.appendChild(tooltipEl)
      }

      if (tooltipModel.opacity === 0) {
        ;(tooltipEl as any).style.opacity = 0
        return
      }

      const { value } = tooltipModel.title[0] || {}
      const innerHtml = `
        <div class='${styles.tooltipContainer}'>
          <div class='${styles.tooltipBody}'>
            <div class='${styles.tooltipValue}'>${formatShortNumberWithDecimal(
              value
            ).toUpperCase()}</div>
          </div>
        </div>`

      // @ts-ignore
      tooltipEl.innerHTML = innerHtml

      // @ts-ignore
      const position = this._chart.canvas.getBoundingClientRect()

      // @ts-ignore
      tooltipEl.style.opacity = 1
      tooltipEl.style.position = 'absolute'
      tooltipEl.style.left =
        position.x +
        tooltipModel.caretX +
        window.pageXOffset -
        tooltipEl.offsetWidth / 2 +
        'px'
      tooltipEl.style.top =
        position.y +
        tooltipModel.caretY +
        window.pageYOffset -
        tooltipEl.offsetHeight -
        10 +
        'px'
      tooltipEl.style.transition = 'opacity 0.18s ease-in-out'
      tooltipEl.style.pointerEvents = 'none'
    },
    callbacks: {
      title: (tooltipItem: any, data: any) => {
        return { value: parseInt(tooltipItem[0].value) }
      }
    }
  }
})

const Labels = ({ labels }: { labels: string[] }) => {
  return (
    <div className={styles.labelsContainer}>
      {labels.map((label, index) => (
        <div key={label} className={styles.labelContainer}>
          <IconCrown className={styles.crown} />
          <div className={styles.index}>{index + 1}</div>
          <div className={styles.label}>{label}</div>
        </div>
      ))}
    </div>
  )
}

type OwnProps = {
  title: string
  yLabel: string
  labels: string[] | null
  data?: number[] | null
  error?: boolean
  viewMore?: string
  onViewMore?: () => void
}

type VerticalBarChartProps = OwnProps

const VerticalBarChart: React.FC<VerticalBarChartProps> = ({
  title,
  yLabel,
  data,
  labels,
  error,
  viewMore,
  onViewMore
}) => {
  const isMobile = useIsMobile()
  const barData = data ? getData(data, isMobile) : null
  return (
    <Paper className={styles.chartContainer}>
      <div className={styles.header}>
        <div className={styles.title}>{title}</div>
      </div>
      <div className={styles.chart}>
        {error ? (
          <Error />
        ) : data && labels ? (
          <>
            <div className={styles.yLabel}>{yLabel}</div>
            <Bar
              height={100}
              data={barData}
              options={getOptions(title, Math.max(...data))}
            />
            <Labels labels={labels} />
          </>
        ) : (
          <Loading className={styles.loading} />
        )}
      </div>
      {!error && data && labels && viewMore && (
        <div className={styles.viewMore} onClick={onViewMore}>
          {viewMore}
        </div>
      )}
    </Paper>
  )
}

export default VerticalBarChart
