import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  useCurrentUserId,
  useUserBalanceHistory,
  useUserTotalBalance
} from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import { convertHexToRGBA } from '@audius/common/utils'
import type { LayoutChangeEvent } from 'react-native'

import { Flex, Paper, Text, useTheme } from '@audius/harmony-native'
import LoadingSpinner from 'app/components/loading-spinner'
import { useNavigation } from 'app/hooks/useNavigation'

import type { BalanceChartDatum } from './BalanceLineChart'
import { BalanceLineChart } from './BalanceLineChart'

const messages = walletMessages.balanceHistory

type UserBalanceHistoryGraphProps = {
  height?: number
}

const formatCurrency = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

const formatShortCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`
  }
  return `$${value.toFixed(0)}`
}

const formatTooltipDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date
    .toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
    .toUpperCase()
}

export const UserBalanceHistoryGraph = ({
  height = 191
}: UserBalanceHistoryGraphProps) => {
  const [containerWidth, setContainerWidth] = useState(0)
  const { color, spacing } = useTheme()
  const navigation = useNavigation()

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width)
  }, [])
  useEffect(() => {
    navigation.setOptions({ fullScreenGestureEnabled: false })
    return () => {
      navigation.setOptions({ fullScreenGestureEnabled: true })
    }
  }, [navigation])

  const secondary = color.secondary.secondary
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

  const chartData = useMemo((): BalanceChartDatum[] => {
    if (!historyData || historyData.length === 0) return []

    return historyData.map((point) => ({
      value: point.balanceUsd,
      timestamp: point.timestamp
    }))
  }, [historyData])

  const renderTooltip = useCallback(
    ({ timestamp, value }: BalanceChartDatum) => (
      <Paper
        gap='xs'
        ph='m'
        pv='s'
        borderRadius='m'
        alignItems='center'
        justifyContent='center'
        backgroundColor='accent'
        style={{
          minWidth: spacing.unit20
        }}
      >
        {timestamp ? (
          <Text variant='label' size='xs' textAlign='center' color='white'>
            {formatTooltipDate(timestamp)}
          </Text>
        ) : null}
        <Text variant='heading' size='s' textAlign='center' color='white'>
          {formatCurrency(value)}
        </Text>
      </Paper>
    ),
    [spacing.unit20]
  )

  if (isLoading) {
    return (
      <Flex
        direction='column'
        alignItems='center'
        justifyContent='center'
        gap='m'
        style={{ minHeight: height }}
      >
        <LoadingSpinner />
        <Text variant='body' size='s'>
          {messages.loading}
        </Text>
      </Flex>
    )
  }

  if (isError || !historyData || historyData.length === 0) {
    return (
      <Flex
        alignItems='center'
        justifyContent='center'
        style={{ minHeight: height }}
      >
        <Text variant='body' size='m' color='subdued'>
          {messages.error}
        </Text>
      </Flex>
    )
  }

  if (chartData.length === 0) {
    return null
  }

  if (containerWidth === 0) {
    return (
      <Flex pv='xs' onLayout={handleLayout} style={{ minHeight: height }} />
    )
  }

  return (
    <Flex pv='xs' onLayout={handleLayout}>
      <BalanceLineChart
        data={chartData}
        containerWidth={containerWidth}
        plotHeight={height}
        axisLabelWidth={spacing.unit12 + spacing.unitHalf}
        axisLabelPaddingRight={spacing.s}
        lineColor={secondary}
        startFillColor={convertHexToRGBA(secondary, 0.15)}
        endFillColor={convertHexToRGBA(secondary, 0.05)}
        ruleColor={borderColor}
        axisLabelColor={color.neutral.n400}
        formatAxisLabel={formatShortCurrency}
        renderTooltip={renderTooltip}
      />
    </Flex>
  )
}
