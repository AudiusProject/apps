import { useCallback, useMemo } from 'react'

import { useCurrentUserId, useUserBalanceHistory } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { LineChart } from 'react-native-gifted-charts'
import type { lineDataItem } from 'react-native-gifted-charts'

import { Flex, Paper, Text, useTheme } from '@audius/harmony-native'
import LoadingSpinner from 'app/components/loading-spinner'

const messages = {
  loading: 'Loading balance history...',
  error: 'Unable to load balance history'
}

type UserBalanceHistoryGraphProps = {
  userId?: ID
  width?: number
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
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export const UserBalanceHistoryGraph = ({
  userId,
  width = 350,
  height = 200
}: UserBalanceHistoryGraphProps) => {
  const { color, spacing } = useTheme()
  const secondary = color.secondary.secondary
  const { data: currentUserId } = useCurrentUserId()
  const effectiveUserId = userId ?? currentUserId
  const {
    data: historyData,
    isLoading,
    isError
  } = useUserBalanceHistory({ userId: effectiveUserId })

  const chartData = useMemo((): lineDataItem[] => {
    if (!historyData || historyData.length === 0) return []

    return historyData.map((point) => ({
      value: point.balanceUsd,
      dataPointLabelComponent: () => null
    }))
  }, [historyData])

  const renderTooltip = useCallback(
    (items: any[]) => {
      if (!items || items.length === 0) return null

      const item = items[0]
      const timestamp = historyData?.[item.index]?.timestamp
      const value = item.value

      return (
        <Paper
          ph='m'
          pv='s'
          borderRadius='m'
          alignItems='center'
          justifyContent='center'
          style={{
            backgroundColor: secondary,
            minWidth: spacing.unit20
          }}
        >
          <Text
            variant='label'
            size='xs'
            strength='strong'
            color='staticWhite'
            style={{
              letterSpacing: 0.5,
              textAlign: 'center',
              textTransform: 'uppercase'
            }}
          >
            {timestamp ? formatTooltipDate(timestamp).toUpperCase() : ''}
          </Text>
          <Text
            variant='heading'
            size='s'
            color='staticWhite'
            style={{
              textAlign: 'center'
            }}
          >
            {formatCurrency(value)}
          </Text>
        </Paper>
      )
    },
    [historyData, secondary, spacing.unit20]
  )

  if (isLoading) {
    return (
      <Flex
        direction='column'
        alignItems='center'
        justifyContent='center'
        gap='m'
        style={{ minHeight: 200 }}
      >
        <LoadingSpinner />
        <Text variant='body' size='s' strength='weak'>
          {messages.loading}
        </Text>
      </Flex>
    )
  }

  if (isError || !historyData || historyData.length === 0) {
    return (
      <Flex
        direction='column'
        alignItems='center'
        justifyContent='center'
        style={{ minHeight: 200 }}
      >
        <Text variant='body' size='m' strength='weak' color='danger'>
          {messages.error}
        </Text>
      </Flex>
    )
  }

  // TypeScript guard: we know chartData is not empty here because of the check above
  if (chartData.length === 0) {
    return null
  }

  const values = chartData.map((d) => d.value as number)
  // Safe to assert: we know chartData.length > 0 from check above
  const maxValue = Math.max(...values)
  const minValue = Math.min(...values)
  const valueRange = maxValue - minValue

  // Format Y label - library expects (label: string) => string
  const formatYLabelWrapper = (label: string): string => {
    const value = Number.parseFloat(label)
    if (Number.isNaN(value)) return label
    return formatShortCurrency(value)
  }

  return (
    <Flex pv='xs'>
      <LineChart
        data={chartData}
        width={width - 48}
        height={height}
        curved
        isAnimated
        animationDuration={800}
        // Line styling
        color={secondary}
        thickness={2}
        // Gradient fill
        areaChart
        startFillColor='rgba(126, 27, 204, 0.15)'
        endFillColor='rgba(126, 27, 204, 0.05)'
        // Data points
        hideDataPoints
        // Focus/hover behavior
        focusEnabled
        showStripOnFocus
        showTextOnFocus
        stripColor={`${secondary}4D`} // 30% opacity
        stripHeight={height}
        stripWidth={2}
        // Axes
        hideRules
        noOfVerticalLines={0}
        noOfSections={2}
        yAxisColor='transparent'
        xAxisColor='transparent'
        yAxisThickness={0}
        xAxisThickness={0}
        yAxisTextStyle={{
          color: color.neutral.n400,
          fontSize: 11,
          fontWeight: '500'
        }}
        // Y-axis formatting
        formatYLabel={formatYLabelWrapper}
        yAxisOffset={minValue - valueRange * 0.1}
        // Spacing
        spacing={(width - 48) / Math.max(chartData.length - 1, 1)}
        initialSpacing={10}
        endSpacing={10}
        yAxisLabelWidth={spacing.unit12 + spacing.unitHalf}
        yAxisLabelContainerStyle={{
          paddingRight: spacing.s
        }}
        // Pointer/tooltip config
        pointerConfig={{
          pointerStripHeight: height - 20,
          pointerStripColor: secondary,
          pointerStripWidth: 2,
          strokeDashArray: [4, 4],
          pointerColor: secondary,
          radius: 6,
          pointerLabelWidth: 140,
          pointerLabelHeight: 80,
          activatePointersOnLongPress: false,
          autoAdjustPointerLabelPosition: true,
          pointerLabelComponent: renderTooltip,
          pointerVanishDelay: 4000,
          activatePointersDelay: 100
        }}
      />
    </Flex>
  )
}
