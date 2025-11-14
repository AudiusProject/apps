import { useEffect, useMemo, useRef } from 'react'

import {
  type BalanceHistoryDataPoint,
  useCurrentUserId,
  useUserBalanceHistory,
  useUserTotalBalance
} from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import { convertHexToRGBA } from '@audius/common/utils'
import { Flex, Text, useTheme } from '@audius/harmony'
import { Line } from 'react-chartjs-2'

import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'

import styles from './UserBalanceHistoryGraph.module.css'

const messages = walletMessages.balanceHistory

const formatCurrency = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(timestamp)
  targetDate.setHours(0, 0, 0, 0)

  // Check if it's today
  if (targetDate.getTime() === today.getTime()) {
    return 'TODAY'
  }

  // Otherwise return the day of the week
  return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
}

const formatTooltipDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const hour = date
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true
    })
    .toLowerCase()
  return `${weekday} ${hour}`
}

const getChartData = (
  timestamps: number[],
  balances: number[],
  secondary: string
) => ({
  labels: timestamps,
  datasets: [
    {
      fill: true,
      lineTension: 0.4,
      backgroundColor: convertHexToRGBA(secondary, 0.15),
      borderColor: secondary,
      borderWidth: 2,
      borderCapStyle: 'round' as const,
      borderDash: [],
      borderDashOffset: 0.0,
      borderJoinStyle: 'round' as const,
      pointBorderColor: secondary,
      pointBackgroundColor: secondary,
      pointBorderWidth: 0,
      pointHoverRadius: 4,
      pointHoverBackgroundColor: secondary,
      pointHoverBorderColor: 'rgba(255, 255, 255, 1)',
      pointHoverBorderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 10,
      data: balances
    }
  ]
})

const getChartOptions = (
  chartId: string,
  neutralColor: string,
  spacing: Record<string, number>,
  borderColor: string
) => ({
  maintainAspectRatio: false,
  responsive: true,
  layout: {
    padding: {
      top: spacing.unit5,
      bottom: 0,
      left: spacing.s,
      right: spacing.s
    }
  },
  scales: {
    xAxes: [
      {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM D'
          }
        },
        gridLines: {
          display: false,
          drawBorder: false
        },
        ticks: {
          maxTicksLimit: 7,
          padding: spacing.m,
          fontColor: neutralColor,
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          fontStyle: '500',
          maxRotation: 0,
          minRotation: 0,
          callback: function (value: any) {
            return formatDate(value)
          }
        }
      }
    ],
    yAxes: [
      {
        gridLines: {
          display: true,
          drawBorder: false,
          color: borderColor,
          zeroLineColor: borderColor,
          borderDash: [4, 4],
          lineWidth: 1
        },
        ticks: {
          maxTicksLimit: 3,
          padding: spacing.m,
          beginAtZero: false,
          fontColor: neutralColor,
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          fontStyle: '500',
          callback: function (value: any) {
            return formatCurrency(value)
          }
        }
      }
    ]
  },
  legend: {
    display: false
  },
  hover: {
    mode: 'index',
    intersect: false,
    axis: 'x'
  },
  tooltips: {
    enabled: false,
    mode: 'index',
    intersect: false,
    axis: 'x',
    custom: function (tooltipModel: any) {
      let tooltipEl = document.getElementById(
        `balance-chart-tooltip-${chartId}`
      )

      if (!tooltipEl) {
        tooltipEl = document.createElement('div')
        tooltipEl.id = `balance-chart-tooltip-${chartId}`
        tooltipEl.className = styles.tooltip
        document.body.appendChild(tooltipEl)
      }

      if (tooltipModel.opacity === 0) {
        tooltipEl.style.opacity = '0'
        return
      }

      if (tooltipModel.dataPoints && tooltipModel.dataPoints.length > 0) {
        const dataPoint = tooltipModel.dataPoints[0]
        const timestamp = dataPoint.xLabel
        const balance = dataPoint.yLabel

        tooltipEl.innerHTML = `
          <div class="${styles.tooltipContent}">
            <div class="${styles.tooltipDate}">${formatTooltipDate(timestamp)}</div>
            <div class="${styles.tooltipValue}">${formatCurrency(balance)}</div>
          </div>
        `
      }

      const position = (this as any)._chart.canvas.getBoundingClientRect()

      tooltipEl.style.opacity = '1'
      tooltipEl.style.position = 'absolute'
      tooltipEl.style.left =
        position.x +
        window.pageXOffset +
        tooltipModel.caretX -
        tooltipEl.offsetWidth / 2 +
        'px'
      tooltipEl.style.top =
        position.y +
        window.pageYOffset +
        tooltipModel.caretY -
        tooltipEl.offsetHeight -
        12 +
        'px'
      tooltipEl.style.pointerEvents = 'none'
      tooltipEl.style.transition = 'opacity 0.15s ease-in-out'
    }
  }
})

export const UserBalanceHistoryGraph = () => {
  const chartId = useRef(Math.random().toString(36).substring(7)).current
  const { color, spacing } = useTheme()
  const secondary = color.secondary.secondary
  const neutralColor = color.neutral.n400
  const borderColor = color.border.default
  const { data: currentUserId } = useCurrentUserId()
  const {
    data: historyDataFetched,
    isLoading: isHistoryLoading,
    isError: isHistoryError
  } = useUserBalanceHistory({ userId: currentUserId })

  const {
    totalBalance: currentBalance,
    isLoading: isBalanceLoading,
    isError: isBalanceError
  } = useUserTotalBalance()

  const historyData = useMemo(() => {
    if (!historyDataFetched || historyDataFetched.length === 0) {
      return historyDataFetched
    }

    const currentTimestamp = Date.now()
    return [
      ...historyDataFetched,
      {
        timestamp: currentTimestamp,
        balanceUsd: currentBalance
      }
    ]
  }, [historyDataFetched, currentBalance])

  const isLoading = isHistoryLoading || isBalanceLoading
  const isError = isHistoryError || isBalanceError

  useEffect(() => {
    return () => {
      const tooltipEl = document.getElementById(
        `balance-chart-tooltip-${chartId}`
      )
      tooltipEl?.remove()
    }
  }, [chartId])

  if (isLoading) {
    return (
      <Flex p='2xl' backgroundColor='surface1' borderRadius='l' w='100%'>
        <Flex
          direction='column'
          alignItems='center'
          justifyContent='center'
          gap='l'
          css={{ minHeight: '200px' }}
        >
          <LoadingSpinner />
          <Text variant='body' size='s'>
            {messages.loading}
          </Text>
        </Flex>
      </Flex>
    )
  }

  if (isError || !historyData || historyData.length === 0) {
    return (
      <Flex p='2xl' backgroundColor='surface1' borderRadius='l' w='100%'>
        <Flex
          direction='column'
          alignItems='center'
          justifyContent='center'
          gap='l'
          css={{ minHeight: '200px' }}
        >
          <Text variant='body' size='m' color='subdued'>
            {messages.error}
          </Text>
        </Flex>
      </Flex>
    )
  }

  const timestamps = historyData.map(
    (d: BalanceHistoryDataPoint) => d.timestamp
  )
  const balances = historyData.map((d: BalanceHistoryDataPoint) => d.balanceUsd)

  return (
    <Flex
      css={{
        position: 'relative',
        width: '100%',
        height: '200px'
      }}
    >
      <Line
        data={getChartData(timestamps, balances, secondary)}
        options={getChartOptions(chartId, neutralColor, spacing, borderColor)}
        height={200}
      />
    </Flex>
  )
}
