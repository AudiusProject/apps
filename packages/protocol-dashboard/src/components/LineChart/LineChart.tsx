import React, { useEffect, useState } from 'react'

import { Flex, Text } from '@audius/harmony'
import { Line } from 'react-chartjs-2'

import Dropdown from 'components/Dropdown'
import Error from 'components/Error'
import Loading from 'components/Loading'
import Paper from 'components/Paper'
import { formatBucketText } from 'store/cache/analytics/hooks'
import { Bucket } from 'store/cache/analytics/slice'
import {
  formatNumber,
  formatShortNumberWithDecimal,
  getShortDate,
  getShortMonth,
  getShortMonthAndYear
} from 'utils/format'
import { createStyles } from 'utils/mobile'

import desktopStyles from './LineChart.module.css'
import mobileStyles from './LineChartMobile.module.css'

const styles = createStyles({ desktopStyles, mobileStyles })

export enum DateFormatter {
  DAY_AND_MONTH,
  MONTH,
  MONTH_AND_YEAR
}

const getData = (data: number[], labels: string[], showLeadingDay: boolean) => {
  const common = {
    responsive: true,
    fill: true,
    lineTension: 0.2,
    backgroundColor: 'rgb(145,71,204,0.5)',
    borderWidth: 1.5,
    borderColor: 'rgb(145,71,204,1)',
    borderCapStyle: 'round',
    borderDashOffset: 0.0,
    borderJoinStyle: 'miter',
    pointBorderColor: 'rgb(145,71,204,1)',
    pointBackgroundColor: 'rgb(145,71,204,1)',
    pointBorderWidth: 0,
    pointHoverRadius: 6,
    pointHoverBackgroundColor: 'rgb(78,79,106,1)',
    pointHoverBorderColor: 'rgb(145,71,204,1)',
    pointHoverBorderWidth: 3,
    pointRadius: 2,
    pointHitRadius: 8
  }

  const newLabels = showLeadingDay ? labels : labels.slice(0, -1)
  const solidLine = showLeadingDay ? data : data.slice(0, -1)
  const datasets = [
    {
      ...common,
      label: 'past',
      data: solidLine,
      borderDash: [] as number[]
    }
  ]

  return {
    labels: newLabels,
    datasets
  }
}

const getOptions = (
  id: string,
  dateFormatter: DateFormatter,
  tooltipTitle: string,
  chartSize?: 'large' | 'default'
) => ({
  layout: {
    padding: {
      left: 0
    }
  },
  scales: {
    xAxes: [
      {
        gridLines: {
          display: false,
          color: 'rgba(90,94,120,1)'
        },
        ticks: {
          maxTicksLimit: chartSize === 'large' ? 12 : 6,
          padding: 13,
          fontColor: 'rgba(119,124,150,1)',
          fontFamily: 'Avenir Next LT Pro',
          fontSize: 12,
          fontStyle: 'bold',
          callback: (value: any, index: any, values: any) => {
            if (dateFormatter === DateFormatter.DAY_AND_MONTH) {
              return getShortDate(value * 1000)
            } else if (dateFormatter === DateFormatter.MONTH) {
              return getShortMonth(value * 1000)
            } else {
              return getShortMonthAndYear(value * 1000)
            }
          },
          maxRotation: 0,
          minRotation: 0
        }
      }
    ],
    yAxes: [
      {
        position: 'left',
        gridLines: {
          display: true,
          color: 'rgba(90,94,120,1)',
          zeroLineColor: 'rgba(90,94,120,1)',
          drawBorder: false
        },
        ticks: {
          maxTicksLimit: 5,
          padding: 10,
          beginAtZero: true,
          fontColor: 'rgba(119,124,150,1)',
          fontFamily: 'Avenir Next LT Pro',
          fontSize: 12,
          fontStyle: 'bold',
          callback: (value: any, index: any, values: any) => {
            return formatShortNumberWithDecimal(value)
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
    zIndex: 1000,
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

      const { date, value } = tooltipModel.title[0] || {}
      const innerHtml = `
        <div class='${styles.tooltipContainer}'>
          <div class='${styles.tooltipBody}'>
            <div class='${styles.tooltipDate}'>${date}</div>
            <div class='${styles.tooltipValue}'>${formatNumber(
              value
            )} ${tooltipTitle}</div>
          </div>
          <div class='${styles.tooltipCaret}'/>
          <div class='${styles.tooltipLine}'/>
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
      tooltipEl.style.zIndex = '1000'
      tooltipEl.style.top =
        position.y +
        tooltipModel.caretY +
        window.pageYOffset -
        tooltipEl.offsetHeight -
        42 +
        'px'
      tooltipEl.style.transition = 'opacity 0.09s ease-in-out'
      tooltipEl.style.pointerEvents = 'none'
    },
    callbacks: {
      label: (tooltipItem: any, data: any) => {
        const value = tooltipItem.yLabel
        return value
      },
      title: (tooltipItem: any, data: any) => {
        const date =
          dateFormatter === DateFormatter.DAY_AND_MONTH
            ? getShortDate(tooltipItem[0].xLabel * 1000)
            : getShortMonth(tooltipItem[0].xLabel * 1000)
        const value = tooltipItem[0].yLabel
        return { date, value }
      }
    }
  }
})

type OwnProps = {
  title: string
  titleTooltipComponent?: React.ComponentType
  topNumber?: number | string
  size?: 'default' | 'large'
  tooltipTitle?: string
  data: number[] | null
  labels: string[] | null
  options?: Bucket[]
  selection?: Bucket
  onSelectOption?: (option: string) => void
  error?: boolean
  showLeadingDay?: boolean
}

type LineChartProps = OwnProps

const LineChart: React.FC<LineChartProps> = ({
  title,
  tooltipTitle,
  titleTooltipComponent,
  size = 'default',
  topNumber,
  data,
  labels,
  options,
  selection,
  onSelectOption,
  error,
  showLeadingDay = false
}) => {
  const [pastFirstDraw, setPastFirstDraw] = useState(false)
  const [pastSecondDraw, setPastSecondDraw] = useState(false)
  let dateFormatter: DateFormatter
  if (selection === Bucket.ALL_TIME) {
    dateFormatter = DateFormatter.MONTH_AND_YEAR
  } else if (selection === Bucket.YEAR) {
    dateFormatter = DateFormatter.MONTH
  } else {
    dateFormatter = DateFormatter.DAY_AND_MONTH
  }

  const formattedTopNumber = topNumber
    ? typeof topNumber === 'number'
      ? formatNumber(topNumber)
      : topNumber
    : null

  useEffect(() => {
    if (!pastFirstDraw) {
      setPastFirstDraw(true)
    } else {
      setPastSecondDraw(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection])

  if (!tooltipTitle) tooltipTitle = title

  const TitleTooltipComponent = titleTooltipComponent

  return (
    <Paper className={styles.chartContainer}>
      <div className={styles.header}>
        <div>
          {formattedTopNumber ? (
            <Text
              variant={size === 'large' ? 'display' : 'heading'}
              size={size === 'large' ? 's' : 'l'}
              strength='strong'
              color='accent'
            >
              {formattedTopNumber}
            </Text>
          ) : null}
          <Flex inline gap='xs' alignItems='center'>
            <div className={styles.title}>{title}</div>
            {TitleTooltipComponent == null ? null : <TitleTooltipComponent />}
          </Flex>
        </div>
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
          <Line
            redraw={pastSecondDraw}
            data={getData(data, labels, showLeadingDay)}
            options={getOptions(title, dateFormatter, tooltipTitle, size)}
          />
        ) : (
          <Loading className={styles.loading} />
        )}
      </div>
    </Paper>
  )
}

export default LineChart
