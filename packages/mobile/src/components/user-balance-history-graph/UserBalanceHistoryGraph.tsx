import { useCallback, useMemo } from 'react'

import { useCurrentUserId, useUserBalanceHistory } from '@audius/common/api'
import { StyleSheet, View } from 'react-native'
import { LineChart } from 'react-native-gifted-charts'
import type { lineDataItem } from 'react-native-gifted-charts'

import { Flex, Text } from '@audius/harmony-native'
import LoadingSpinner from 'app/components/loading-spinner'
import { useThemeColors } from 'app/utils/theme'

const messages = {
  title: 'Balance History',
  loading: 'Loading balance history...',
  error: 'Unable to load balance history'
}

type UserBalanceHistoryGraphProps = {
  userId?: number
  width?: number
  height?: number
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
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

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
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
  const { neutralLight4, neutral, accentPurple, white } = useThemeColors()
  const { data: currentUserId } = useCurrentUserId()
  const effectiveUserId = userId ?? currentUserId
  const {
    data: historyData,
    isLoading,
    isError
  } = useUserBalanceHistory({ userId: effectiveUserId })

  const latestBalance = useMemo(() => {
    if (!historyData || historyData.length === 0) return null
    return historyData[historyData.length - 1].balanceUsd
  }, [historyData])

  const chartData = useMemo((): lineDataItem[] => {
    if (!historyData || historyData.length === 0) return []

    // Sample the data to show reasonable number of labels (show ~7 day labels for a week of data)
    const samplingRate = Math.ceil(historyData.length / 7)

    return historyData.map((point, index) => ({
      value: point.balanceUsd,
      label: index % samplingRate === 0 ? formatDate(point.timestamp) : '',
      labelTextStyle: {
        color: neutral,
        fontSize: 11,
        fontWeight: '500'
      },
      dataPointLabelComponent: () => null
    }))
  }, [historyData, neutral])

  const renderTooltip = useCallback(
    (items: any[]) => {
      if (!items || items.length === 0) return null

      const item = items[0]
      const timestamp = historyData?.[item.index]?.timestamp
      const value = item.value

      return (
        <View style={[styles.tooltip, { backgroundColor: white }]}>
          <Text style={[styles.tooltipDate, { color: neutral }]}>
            {timestamp ? formatTooltipDate(timestamp) : ''}
          </Text>
          <Text style={[styles.tooltipValue, { color: accentPurple }]}>
            {formatCurrency(value)}
          </Text>
        </View>
      )
    },
    [historyData, white, neutral, accentPurple]
  )

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: neutralLight4 }]}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner style={styles.spinner} />
          <Text variant='body' size='s' strength='weak'>
            {messages.loading}
          </Text>
        </View>
      </View>
    )
  }

  if (isError || !historyData || historyData.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: neutralLight4 }]}>
        <View style={styles.errorContainer}>
          <Text variant='body' size='m' strength='weak' color='danger'>
            {messages.error}
          </Text>
        </View>
      </View>
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
    <View style={[styles.container, { backgroundColor: neutralLight4 }]}>
      <Flex column gap='m'>
        <Flex column gap='xs'>
          {latestBalance !== null ? (
            <Text variant='heading' size='l' strength='strong'>
              {formatCurrency(latestBalance)}
            </Text>
          ) : null}
          <Text variant='body' size='m' strength='weak'>
            {messages.title}
          </Text>
        </Flex>

        <View style={styles.chartWrapper}>
          <LineChart
            data={chartData}
            width={width - 48}
            height={height}
            curved
            isAnimated
            animationDuration={800}
            // Line styling
            color={accentPurple}
            thickness={2}
            // Gradient fill
            areaChart
            startFillColor={`${accentPurple}26`} // 15% opacity
            endFillColor={`${accentPurple}0D`} // 5% opacity
            // Data points
            hideDataPoints={false}
            dataPointsColor={accentPurple}
            dataPointsRadius={2}
            dataPointsHeight={4}
            dataPointsWidth={4}
            // Focus/hover behavior
            focusEnabled
            showStripOnFocus
            showTextOnFocus
            stripColor={`${accentPurple}4D`} // 30% opacity
            stripHeight={height}
            stripWidth={2}
            // Axes
            hideRules={false}
            rulesColor={neutralLight4}
            rulesThickness={1}
            noOfVerticalLines={0}
            yAxisColor='transparent'
            xAxisColor='transparent'
            yAxisThickness={0}
            xAxisThickness={0}
            yAxisTextStyle={{
              color: neutral,
              fontSize: 11,
              fontWeight: '500'
            }}
            xAxisLabelTextStyle={{
              color: neutral,
              fontSize: 11,
              fontWeight: '500',
              width: 60,
              textAlign: 'center'
            }}
            // Y-axis formatting
            formatYLabel={formatYLabelWrapper}
            yAxisOffset={minValue - valueRange * 0.1}
            // Spacing
            spacing={(width - 48) / Math.max(chartData.length - 1, 1)}
            initialSpacing={10}
            endSpacing={10}
            yAxisLabelWidth={50}
            yAxisLabelContainerStyle={{
              paddingRight: 8
            }}
            // Pointer/tooltip config
            pointerConfig={{
              pointerStripHeight: height - 20,
              pointerStripColor: accentPurple,
              pointerStripWidth: 2,
              strokeDashArray: [4, 4],
              pointerColor: accentPurple,
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
        </View>
      </Flex>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 12
  },
  chartWrapper: {
    paddingVertical: 8
  },
  loadingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 200
  },
  errorContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200
  },
  spinner: {
    width: 24,
    height: 24
  },
  tooltip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 120
  },
  tooltipDate: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: '700'
  }
})
