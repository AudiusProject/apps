import {
  getAreaPath,
  getChartLayout,
  getLinePath,
  getNearestIndex,
  getPoints,
  getTooltipPosition,
  getYScale
} from './balanceChartGeometry'

const parseNumbers = (path: string) =>
  (path.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number)

const layoutFor = (containerWidth: number, plotHeight: number, n: number) =>
  getChartLayout({
    containerWidth,
    plotHeight,
    axisLabelWidth: 50,
    pointCount: n
  })

describe('getYScale', () => {
  it('pads the bottom by 10% of the range and rounds the top up to a multiple of 10', () => {
    const scale = getYScale([120.5, 135, 128, 160, 155, 190.25, 175, 210])
    expect(scale.offset).toBeCloseTo(111.55)
    expect(scale.span).toBe(100)
    expect(scale.labels.map((l) => Math.round(l))).toEqual([112, 162, 212])
  })

  it('handles a flat balance', () => {
    const scale = getYScale([25, 25, 25])
    expect(scale.offset).toBe(25)
    expect(scale.span).toBe(10)
    expect(scale.labels).toEqual([25, 30, 35])
  })

  it('adds 10% headroom instead of rounding for small ranges', () => {
    const scale = getYScale([1.2, 1.5, 1.35, 1.9])
    expect(scale.offset).toBeCloseTo(1.13)
    expect(scale.span).toBeCloseTo(0.847)
  })

  it('can put the bottom label below zero when the history starts at zero', () => {
    expect(getYScale([0, 42.17]).labels.map(Math.round)).toEqual([-4, 21, 46])
  })
})

describe('getChartLayout', () => {
  it('spaces points across the plot with the previous insets', () => {
    const layout = layoutFor(343, 191, 8)
    expect(layout.plotWidth).toBe(305)
    expect(layout.pointSpacing).toBeCloseTo(275 / 7)
    expect(layout.plotTop).toBeCloseTo(9.55)
    expect(layout.plotBottom).toBeCloseTo(200.55)
    expect(layout.height).toBeCloseTo(223.55)
  })

  it('does not divide by zero for a single point', () => {
    expect(layoutFor(343, 191, 1).pointSpacing).toBe(0)
  })
})

describe('paths', () => {
  it('matches the curve react-native-gifted-charts drew for the same data', () => {
    const gifted =
      'M10,193.33333333333334 C25.46666666666667,176.66666666666669 56.39999999999999,118.33333333333334 87.33333333333333,110 C118.26666666666667,101.66666666666666 133.73333333333332,168.33333333333334 164.66666666666666,151.66666666666666 C195.6,135 226.53333333333333,51.66666666666667 242,26.666666666666657'
    const values = [100, 150, 125, 200]
    const layout = layoutFor(300, 200, values.length)
    const path = getLinePath(getPoints(values, layout, getYScale(values)))

    const expected = parseNumbers(gifted).map((n, i) => (i % 2 ? n : n + 10))
    const actual = parseNumbers(path)
    expect(actual).toHaveLength(expected.length)
    actual.forEach((n, i) => expect(n).toBeCloseTo(expected[i], 6))
  })

  it('closes the area down to the bottom of the plot', () => {
    const points = [
      { x: 20, y: 50 },
      { x: 100, y: 10 }
    ]
    expect(getAreaPath(points, 200)).toBe(
      `${getLinePath(points)} L100,200 L20,200 Z`
    )
    expect(getLinePath([])).toBe('')
    expect(getLinePath([{ x: 1, y: 2 }])).toBe('M1,2')
  })
})

describe('getNearestIndex', () => {
  const layout = layoutFor(343, 191, 8)

  it('snaps to the closest point and clamps to the ends', () => {
    expect(getNearestIndex(-30, layout, 8)).toBe(0)
    expect(getNearestIndex(20 + layout.pointSpacing * 3.4, layout, 8)).toBe(3)
    expect(getNearestIndex(20 + layout.pointSpacing * 3.6, layout, 8)).toBe(4)
    expect(getNearestIndex(1000, layout, 8)).toBe(7)
  })
})

describe('getTooltipPosition', () => {
  const layout = layoutFor(343, 191, 8)

  it('centers above the point', () => {
    expect(getTooltipPosition({ x: 150, y: 120 }, layout)).toEqual({
      left: 80,
      top: 58
    })
  })

  it('moves below the point near the top of the plot', () => {
    expect(getTooltipPosition({ x: 150, y: 30 }, layout).top).toBe(58)
  })

  it('anchors to the side with room near the edges', () => {
    expect(getTooltipPosition({ x: 20, y: 120 }, layout).left).toBe(20)
    expect(getTooltipPosition({ x: 280, y: 120 }, layout).left).toBe(129)
  })
})
