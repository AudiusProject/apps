import { describe, expect, it } from 'vitest'

import {
  getColumnBaseWidth,
  getHiddenResponsiveColumns
} from './responsiveColumns'

describe('responsiveColumns', () => {
  it('hides configured columns at deterministic breakpoints', () => {
    const hidden = getHiddenResponsiveColumns({
      columns: [
        { id: 'trackName', width: 260 },
        { id: 'plays', width: 120 },
        { id: 'reposts', width: 120 },
        { id: 'trackActions', width: 140 }
      ],
      containerWidth: 900,
      responsiveColumns: {
        breakpoints: [
          { maxWidth: 1000, hide: ['reposts'] },
          { maxWidth: 920, hide: ['reposts', 'plays'] }
        ],
        alwaysVisibleIds: ['trackName', 'trackActions']
      },
      fallbackColumnWidth: 64
    })

    expect(Array.from(hidden)).toEqual(['reposts', 'plays'])
  })

  it('does not hide any columns above all breakpoints', () => {
    const hidden = getHiddenResponsiveColumns({
      columns: [
        { id: 'trackName', width: 260 },
        { id: 'plays', width: 120 },
        { id: 'trackActions', width: 140 }
      ],
      containerWidth: 1200,
      responsiveColumns: {
        breakpoints: [{ maxWidth: 1000, hide: ['plays'] }],
        alwaysVisibleIds: ['trackName', 'trackActions']
      },
      fallbackColumnWidth: 64
    })

    expect(hidden.size).toBe(0)
  })

  it('respects always-visible ids in breakpoint mode', () => {
    const hidden = getHiddenResponsiveColumns({
      columns: [
        { id: 'trackName', width: 260 },
        { id: 'plays', width: 120 },
        { id: 'trackActions', width: 140 }
      ],
      containerWidth: 900,
      responsiveColumns: {
        breakpoints: [
          { maxWidth: 920, hide: ['plays', 'trackActions', 'trackName'] }
        ],
        alwaysVisibleIds: ['trackName', 'trackActions']
      },
      fallbackColumnWidth: 64
    })

    expect(Array.from(hidden)).toEqual(['plays'])
  })

  it('gets column base width using width > maxWidth > minWidth > fallback', () => {
    expect(
      getColumnBaseWidth(
        { id: 'a', width: 120, maxWidth: 100, minWidth: 80 },
        64
      )
    ).toBe(120)
    expect(getColumnBaseWidth({ id: 'b', maxWidth: 140, minWidth: 80 }, 64)).toBe(
      140
    )
    expect(getColumnBaseWidth({ id: 'c', minWidth: 90 }, 64)).toBe(90)
    expect(getColumnBaseWidth({ id: 'd' }, 64)).toBe(64)
  })

  it('hides columns in configured order until table fits', () => {
    const hidden = getHiddenResponsiveColumns({
      columns: [
        { id: 'trackName', width: 240, maxWidth: 420 },
        { id: 'plays', width: 120 },
        { id: 'reposts', width: 120 },
        { id: 'trackActions', width: 140 }
      ],
      containerWidth: 420,
      responsiveColumns: {
        hideOrder: ['reposts', 'plays'],
        alwaysVisibleIds: ['trackName', 'trackActions']
      },
      fallbackColumnWidth: 64
    })

    expect(Array.from(hidden)).toEqual(['reposts', 'plays'])
  })

  it('uses minWidth floor in responsive width budget', () => {
    const hidden = getHiddenResponsiveColumns({
      columns: [
        { id: 'trackName', width: 240, minWidth: 320, maxWidth: 420 },
        { id: 'plays', width: 120 },
        { id: 'trackActions', width: 140 }
      ],
      containerWidth: 560,
      responsiveColumns: {
        hideOrder: ['plays'],
        alwaysVisibleIds: ['trackName', 'trackActions']
      },
      fallbackColumnWidth: 64
    })

    expect(Array.from(hidden)).toEqual(['plays'])
  })

  it('never hides always-visible columns', () => {
    const hidden = getHiddenResponsiveColumns({
      columns: [
        { id: 'contentName', width: 320 },
        { id: 'date', width: 150 },
        { id: 'value', width: 150 }
      ],
      containerWidth: 260,
      responsiveColumns: {
        hideOrder: ['date', 'value', 'contentName'],
        alwaysVisibleIds: ['contentName', 'value']
      },
      fallbackColumnWidth: 64
    })

    expect(Array.from(hidden)).toEqual(['date'])
  })

  it('returns no hidden columns when width is sufficient', () => {
    const hidden = getHiddenResponsiveColumns({
      columns: [
        { id: 'a', width: 100 },
        { id: 'b', width: 100 }
      ],
      containerWidth: 400,
      responsiveColumns: { hideOrder: ['b'] },
      fallbackColumnWidth: 64
    })

    expect(hidden.size).toBe(0)
  })

  it('is stable when no hideable columns remain', () => {
    const hidden = getHiddenResponsiveColumns({
      columns: [
        { id: 'playButton', width: 48 },
        { id: 'trackName', width: 280 },
        { id: 'trackActions', width: 140 }
      ],
      containerWidth: 120,
      responsiveColumns: {
        hideOrder: ['date', 'plays', 'reposts'],
        alwaysVisibleIds: ['playButton', 'trackName', 'trackActions']
      },
      fallbackColumnWidth: 64
    })

    expect(hidden.size).toBe(0)
  })

  it('does not hide columns before the table is measured', () => {
    const hidden = getHiddenResponsiveColumns({
      columns: [
        { id: 'trackName', width: 240 },
        { id: 'plays', width: 120 },
        { id: 'trackActions', width: 140 }
      ],
      containerWidth: 0,
      responsiveColumns: {
        hideOrder: ['plays'],
        alwaysVisibleIds: ['trackName', 'trackActions']
      },
      fallbackColumnWidth: 64
    })

    expect(hidden.size).toBe(0)
  })

  it('falls back to hideOrder budget mode when breakpoints are not provided', () => {
    const hidden = getHiddenResponsiveColumns({
      columns: [
        { id: 'trackName', width: 240 },
        { id: 'plays', width: 120 },
        { id: 'reposts', width: 120 },
        { id: 'trackActions', width: 140 }
      ],
      containerWidth: 420,
      responsiveColumns: {
        hideOrder: ['reposts', 'plays'],
        alwaysVisibleIds: ['trackName', 'trackActions']
      },
      fallbackColumnWidth: 64
    })

    expect(Array.from(hidden)).toEqual(['reposts', 'plays'])
  })
})
