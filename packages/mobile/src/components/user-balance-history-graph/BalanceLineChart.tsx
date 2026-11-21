import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { GestureResponderEvent } from 'react-native'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg'

import {
  ANIMATION_DURATION_MS,
  POINTER_RADIUS,
  POINTER_STRIP_INSET_TOP,
  POINTER_VANISH_DELAY_MS,
  TOOLTIP_WIDTH,
  getAreaPath,
  getChartLayout,
  getLinePath,
  getNearestIndex,
  getPoints,
  getTooltipPosition,
  getYScale
} from './balanceChartGeometry'

export type BalanceChartDatum = {
  value: number
  timestamp: number
}

type BalanceLineChartProps = {
  data: BalanceChartDatum[]
  containerWidth: number
  plotHeight: number
  axisLabelWidth: number
  axisLabelPaddingRight: number
  lineColor: string
  startFillColor: string
  endFillColor: string
  ruleColor: string
  axisLabelColor: string
  formatAxisLabel: (value: number) => string
  renderTooltip: (datum: BalanceChartDatum) => ReactNode
}

const GRADIENT_ID = 'balanceHistoryFill'
const AXIS_LABEL_HEIGHT = 20

export const BalanceLineChart = ({
  data,
  containerWidth,
  plotHeight,
  axisLabelWidth,
  axisLabelPaddingRight,
  lineColor,
  startFillColor,
  endFillColor,
  ruleColor,
  axisLabelColor,
  formatAxisLabel,
  renderTooltip
}: BalanceLineChartProps) => {
  const layout = useMemo(
    () =>
      getChartLayout({
        containerWidth,
        plotHeight,
        axisLabelWidth,
        pointCount: data.length
      }),
    [containerWidth, plotHeight, axisLabelWidth, data.length]
  )
  const values = useMemo(() => data.map((d) => d.value), [data])
  const scale = useMemo(() => getYScale(values), [values])
  const points = useMemo(
    () => getPoints(values, layout, scale),
    [values, layout, scale]
  )
  const linePath = useMemo(() => getLinePath(points), [points])
  const areaPath = useMemo(
    () => getAreaPath(points, layout.plotBottom),
    [points, layout.plotBottom]
  )

  const revealProgress = useMemo(() => new Animated.Value(0), [])
  useEffect(() => {
    const animation = Animated.timing(revealProgress, {
      toValue: 1,
      duration: ANIMATION_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false
    })
    animation.start()
    return () => animation.stop()
  }, [revealProgress])
  const revealWidth = useMemo(
    () =>
      revealProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, layout.plotWidth]
      }),
    [revealProgress, layout.plotWidth]
  )

  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const vanishTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearVanishTimer = useCallback(() => {
    if (vanishTimer.current) {
      clearTimeout(vanishTimer.current)
      vanishTimer.current = null
    }
  }, [])
  useEffect(() => clearVanishTimer, [clearVanishTimer])

  const activateAt = useCallback(
    (event: GestureResponderEvent) => {
      clearVanishTimer()
      setActiveIndex(
        getNearestIndex(event.nativeEvent.locationX, layout, data.length)
      )
    },
    [clearVanishTimer, layout, data.length]
  )
  const scheduleVanish = useCallback(() => {
    clearVanishTimer()
    vanishTimer.current = setTimeout(
      () => setActiveIndex(null),
      POINTER_VANISH_DELAY_MS
    )
  }, [clearVanishTimer])

  const activePoint =
    activeIndex !== null && activeIndex < points.length
      ? points[activeIndex]
      : null
  const activeDatum = activeIndex !== null ? data[activeIndex] : null
  const tooltipPosition = activePoint
    ? getTooltipPosition(activePoint, layout)
    : null

  const sectionYs = [
    layout.plotBottom,
    (layout.plotTop + layout.plotBottom) / 2,
    layout.plotTop
  ]

  return (
    <View style={{ width: containerWidth, height: layout.height }}>
      {scale.labels.map((label, i) => (
        <View
          key={i}
          style={[
            styles.axisLabel,
            {
              top: sectionYs[i] - AXIS_LABEL_HEIGHT / 2,
              width: axisLabelWidth,
              paddingRight: axisLabelPaddingRight
            }
          ]}
        >
          <Text
            numberOfLines={1}
            ellipsizeMode='clip'
            style={[styles.axisLabelText, { color: axisLabelColor }]}
          >
            {formatAxisLabel(label)}
          </Text>
        </View>
      ))}
      <View
        testID='balance-chart-plot'
        style={[
          styles.plot,
          { left: layout.plotLeft, width: layout.plotWidth }
        ]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={activateAt}
        onResponderMove={activateAt}
        onResponderRelease={scheduleVanish}
        onResponderTerminate={scheduleVanish}
      >
        <Svg
          width={layout.plotWidth}
          height={layout.height}
          style={StyleSheet.absoluteFill}
          pointerEvents='none'
        >
          {/* Only the top and middle rules are drawn. */}
          {sectionYs.slice(1).map((y) => (
            <Line
              key={y}
              x1={0}
              x2={layout.plotWidth}
              y1={y}
              y2={y}
              stroke={ruleColor}
              strokeWidth={1}
              strokeDasharray={[4, 8]}
            />
          ))}
        </Svg>
        <Animated.View
          pointerEvents='none'
          style={[styles.reveal, { width: revealWidth }]}
        >
          <Svg
            testID='balance-chart-line'
            width={layout.plotWidth}
            height={layout.height}
          >
            <Defs>
              <LinearGradient id={GRADIENT_ID} x1='0' y1='0' x2='0' y2='1'>
                <Stop
                  offset='0'
                  stopColor={startFillColor}
                  stopOpacity={0.15}
                />
                <Stop offset='1' stopColor={endFillColor} stopOpacity={0.05} />
              </LinearGradient>
            </Defs>
            <Path d={areaPath} fill={`url(#${GRADIENT_ID})`} stroke='none' />
            <Path d={linePath} fill='none' stroke={lineColor} strokeWidth={2} />
          </Svg>
        </Animated.View>
        {activePoint ? (
          <Svg
            testID='balance-chart-pointer-strip'
            width={layout.plotWidth}
            height={layout.height}
            style={StyleSheet.absoluteFill}
            pointerEvents='none'
          >
            <Line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={layout.plotTop + POINTER_STRIP_INSET_TOP}
              y2={layout.plotBottom}
              stroke={lineColor}
              strokeWidth={2}
              strokeDasharray={[4, 4]}
            />
          </Svg>
        ) : null}
        {activePoint && activeDatum && tooltipPosition ? (
          <View
            testID='balance-chart-tooltip'
            pointerEvents='none'
            style={[
              styles.tooltip,
              { left: tooltipPosition.left, top: tooltipPosition.top }
            ]}
          >
            {renderTooltip(activeDatum)}
          </View>
        ) : null}
        {activePoint ? (
          <View
            testID='balance-chart-pointer'
            pointerEvents='none'
            style={[
              styles.pointer,
              {
                left: activePoint.x - POINTER_RADIUS,
                top: activePoint.y - POINTER_RADIUS,
                backgroundColor: lineColor
              }
            ]}
          />
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  axisLabel: {
    position: 'absolute',
    left: 0,
    height: AXIS_LABEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center'
  },
  axisLabelText: {
    fontSize: 11,
    fontWeight: '500'
  },
  plot: {
    position: 'absolute',
    top: 0,
    bottom: 0
  },
  reveal: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden'
  },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH
  },
  pointer: {
    position: 'absolute',
    width: POINTER_RADIUS * 2,
    height: POINTER_RADIUS * 2,
    borderRadius: POINTER_RADIUS
  }
})
