export type ChartPoint = { x: number; y: number }

export const NUMBER_OF_SECTIONS = 2
export const CURVATURE = 0.2

export const PLOT_INSET_LEFT = 20
export const PLOT_INSET_RIGHT = 10
export const PLOT_OVERHANG_RIGHT = 12

export const PLOT_TOP_RATIO = 0.05
export const BOTTOM_PADDING = 23

export const POINTER_RADIUS = 6
export const POINTER_STRIP_INSET_TOP = 20
export const TOOLTIP_WIDTH = 140
const TOOLTIP_GAP_ABOVE = 62
const TOOLTIP_GAP_BELOW = 28
const TOOLTIP_GAP_SIDE = 11
export const POINTER_VANISH_DELAY_MS = 4000
export const ANIMATION_DURATION_MS = 800

export type YScale = {
  offset: number
  span: number
  labels: number[]
}

const indexOfFirstNonZeroDigit = (num: number) => {
  const numString = num.toString()
  let i = 0
  let d = numString[i]
  while (i < numString.length - 2 && (Number.isNaN(Number(d)) || d === '0')) {
    d = numString[++i]
  }
  return i
}

export const getYScale = (values: number[]): YScale => {
  if (values.length === 0) {
    return { offset: 0, span: 10, labels: [0, 5, 10] }
  }
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min
  const offset = min - range * 0.1
  const adjustedMax = Math.max(max - offset, 0)

  const showFractionalValues = range <= 1
  const roundToDigits = showFractionalValues
    ? indexOfFirstNonZeroDigit(range) + 1
    : 0

  let span: number
  if (showFractionalValues) {
    span = adjustedMax + adjustedMax / 10
  } else {
    span = adjustedMax + (10 - (adjustedMax % 10))
  }
  span = span || 10

  const step = span / NUMBER_OF_SECTIONS
  const labels: number[] = []
  for (let i = 0; i <= NUMBER_OF_SECTIONS; i++) {
    let value = step * i
    if (showFractionalValues || roundToDigits) {
      value = parseFloat(value.toFixed(roundToDigits))
    }
    labels.push(
      showFractionalValues
        ? parseFloat((value + offset).toFixed(roundToDigits))
        : Math.trunc(value) + offset
    )
  }
  return { offset, span, labels }
}

export type ChartLayout = {
  height: number
  plotLeft: number
  plotWidth: number
  plotTop: number
  plotBottom: number
  pointSpacing: number
  firstPointX: number
}

export const getChartLayout = ({
  containerWidth,
  plotHeight,
  axisLabelWidth,
  pointCount
}: {
  containerWidth: number
  plotHeight: number
  axisLabelWidth: number
  pointCount: number
}): ChartLayout => {
  const plotWidth = Math.max(
    containerWidth - axisLabelWidth + PLOT_OVERHANG_RIGHT,
    0
  )
  const plotTop = plotHeight * PLOT_TOP_RATIO
  const usableWidth = plotWidth - PLOT_INSET_LEFT - PLOT_INSET_RIGHT
  return {
    height: plotTop + plotHeight + BOTTOM_PADDING,
    plotLeft: axisLabelWidth,
    plotWidth,
    plotTop,
    plotBottom: plotTop + plotHeight,
    pointSpacing:
      pointCount > 1 ? Math.max(usableWidth / (pointCount - 1), 0) : 0,
    firstPointX: PLOT_INSET_LEFT
  }
}

export const getPoints = (
  values: number[],
  layout: ChartLayout,
  scale: YScale
): ChartPoint[] => {
  const plotHeight = layout.plotBottom - layout.plotTop
  return values.map((value, i) => ({
    x: layout.firstPointX + i * layout.pointSpacing,
    y: layout.plotBottom - ((value - scale.offset) * plotHeight) / scale.span
  }))
}

const controlPoint = (
  current: ChartPoint,
  previous: ChartPoint | undefined,
  next: ChartPoint | undefined,
  reverse: boolean
): ChartPoint => {
  const p = previous ?? current
  const n = next ?? current
  const dx = n.x - p.x
  const dy = n.y - p.y
  const angle = Math.atan2(dy, dx) + (reverse ? Math.PI : 0)
  const length = Math.sqrt(dx * dx + dy * dy) * CURVATURE
  return {
    x: current.x + Math.cos(angle) * length,
    y: current.y + Math.sin(angle) * length
  }
}

export const getLinePath = (points: ChartPoint[]): string => {
  if (points.length === 0) return ''
  return points.reduce((acc, point, i, all) => {
    if (i === 0) return `M${point.x},${point.y}`
    const start = controlPoint(all[i - 1], all[i - 2], point, false)
    const end = controlPoint(point, all[i - 1], all[i + 1], true)
    return `${acc} C${start.x},${start.y} ${end.x},${end.y} ${point.x},${point.y}`
  }, '')
}

export const getAreaPath = (points: ChartPoint[], bottom: number): string => {
  if (points.length === 0) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return `${getLinePath(points)} L${last.x},${bottom} L${first.x},${bottom} Z`
}

export const getNearestIndex = (
  x: number,
  layout: ChartLayout,
  pointCount: number
) => {
  if (pointCount <= 1 || layout.pointSpacing === 0) return 0
  const index = Math.round((x - layout.firstPointX) / layout.pointSpacing)
  return Math.min(Math.max(index, 0), pointCount - 1)
}

export const getTooltipPosition = (
  point: ChartPoint,
  layout: ChartLayout
): { left: number; top: number } => {
  const rightEdge = layout.plotWidth - PLOT_OVERHANG_RIGHT
  let left = point.x - TOOLTIP_WIDTH / 2
  if (left < 0) {
    left = point.x
  } else if (left + TOOLTIP_WIDTH > rightEdge) {
    left = point.x - TOOLTIP_WIDTH - TOOLTIP_GAP_SIDE
  }
  const fitsAbove = point.y - layout.plotTop >= TOOLTIP_GAP_ABOVE + 4
  const top = fitsAbove
    ? point.y - TOOLTIP_GAP_ABOVE
    : point.y + TOOLTIP_GAP_BELOW
  return { left, top }
}
