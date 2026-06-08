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
import {
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Tooltip,
  type Chart as ChartType,
  type ChartOptions,
  type TooltipModel
} from 'chart.js'
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm.js'
import { Line } from 'react-chartjs-2'

import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'

import styles from './UserBalanceHistoryGraph.module.css'

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Filler,
  Tooltip
)

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

  if (targetDate.getTime() === today.getTime()) {
    return 'TODAY'
  }

  return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
}

const formatTooltipDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

const getChartData = (
  timestamps: number[],
  balances: number[],
  secondary: string
) => ({
  datasets: [
    {
      fill: true,
      tension: 0.4,
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
      data: timestamps.map((t, i) => ({ x: t, y: balances[i] }))
    }
  ]
})

const getChartOptions = (
  chartId: string,
  neutralColor: string,
  spacing: Record<string, number>,
  borderColor: string
): ChartOptions<'line'> => ({
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
  interaction: {
    mode: 'index',
    intersect: false,
    axis: 'x'
  },
  scales: {
    x: {
      type: 'time',
      time: {
        unit: 'day',
        displayFormats: {
          day: 'MMM D'
        }
      },
      grid: {
        display: false
      },
      border: {
        display: false
      },
      ticks: {
        maxTicksLimit: 7,
        padding: spacing.m,
        color: neutralColor,
        font: {
          family: 'Inter, sans-serif',
          size: 11,
          weight: 500
        },
        maxRotation: 0,
        minRotation: 0,
        callback: function (value) {
          return formatDate(Number(value))
        }
      }
    },
    y: {
      beginAtZero: false,
      grid: {
        display: true,
        color: borderColor,
        lineWidth: 1
      },
      border: {
        display: false,
        dash: [4, 4]
      },
      ticks: {
        maxTicksLimit: 3,
        padding: spacing.m,
        color: neutralColor,
        font: {
          family: 'Inter, sans-serif',
          size: 11,
          weight: 500
        },
        callback: function (value) {
          return formatCurrency(Number(value))
        }
      }
    }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      enabled: false,
      mode: 'index',
      intersect: false,
      axis: 'x',
      external: function (context: {
        chart: ChartType
        tooltip: TooltipModel<'line'>
      }) {
        const tooltipModel = context.tooltip
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
          const timestamp = Number(dataPoint.parsed.x)
          const balance = Number(dataPoint.parsed.y)

          tooltipEl.innerHTML = `
            <div class="${styles.tooltipContent}">
              <div class="${styles.tooltipDate}">${formatTooltipDate(timestamp)}</div>
              <div class="${styles.tooltipValue}">${formatCurrency(balance)}</div>
            </div>
          `
        }

        const position = context.chart.canvas.getBoundingClientRect()

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
  }
})

const UserBalanceHistoryGraphImpl = () => {
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
  } = useUserBalanceHistory({ userId: currentUserId, granularity: 'daily' })

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
        // chart.js v2-style options shape; cast as any to bypass v3+ type
        // mismatches (xAxes/yAxes vs scales.x/scales.y, hover.mode literal).
        options={
          getChartOptions(chartId, neutralColor, spacing, borderColor) as any
        }
        height={200}
      />
    </Flex>
  )
}

export const UserBalanceHistoryGraph = UserBalanceHistoryGraphImpl
export default UserBalanceHistoryGraphImpl
