import { describe, it, expect } from 'vitest'

import { RepeatMode } from '../queue/types'

import playbackReducer, { actions, initialState } from './slice'
import type { PlaybackTrack } from './types'

const track = (id: number): PlaybackTrack => ({
  trackId: id,
  source: 'trending-week'
})

describe('playback slice', () => {
  it('playFrom seeds queue, clamps index, increments counter', () => {
    const tracks = [track(1), track(2), track(3)]
    const next = playbackReducer(
      initialState,
      actions.playFrom({ tracks, startIndex: 1 })
    )
    expect(next.queue).toEqual(tracks)
    expect(next.index).toBe(1)
    expect(next.counter).toBe(initialState.counter + 1)
    expect(next.querySource).toBeNull()
  })

  it('playFrom clamps out-of-range startIndex', () => {
    const tracks = [track(1), track(2)]
    const next = playbackReducer(
      initialState,
      actions.playFrom({ tracks, startIndex: 99 })
    )
    expect(next.index).toBe(1)
  })

  it('next advances index', () => {
    const seeded = playbackReducer(
      initialState,
      actions.playFrom({
        tracks: [track(1), track(2), track(3)],
        startIndex: 0
      })
    )
    const next = playbackReducer(seeded, actions.next({}))
    expect(next.index).toBe(1)
  })

  it('next at end-of-queue without repeat keeps index', () => {
    const seeded = playbackReducer(
      initialState,
      actions.playFrom({ tracks: [track(1), track(2)], startIndex: 1 })
    )
    const next = playbackReducer(seeded, actions.next({}))
    expect(next.index).toBe(1)
  })

  it('next at end-of-queue with RepeatMode.ALL wraps to 0', () => {
    const seeded = playbackReducer(
      { ...initialState, repeat: RepeatMode.ALL },
      actions.playFrom({ tracks: [track(1), track(2)], startIndex: 1 })
    )
    const next = playbackReducer(seeded, actions.next({}))
    expect(next.index).toBe(0)
  })

  it('previous decrements index but floors at 0', () => {
    const seeded = playbackReducer(
      initialState,
      actions.playFrom({ tracks: [track(1), track(2)], startIndex: 1 })
    )
    const prev1 = playbackReducer(seeded, actions.previous())
    expect(prev1.index).toBe(0)
    const prev2 = playbackReducer(prev1, actions.previous())
    expect(prev2.index).toBe(0)
  })

  it('togglePlay flips playing', () => {
    const on = playbackReducer(initialState, actions.togglePlay())
    expect(on.playing).toBe(true)
    const off = playbackReducer(on, actions.togglePlay())
    expect(off.playing).toBe(false)
  })

  it('appendPage adds tracks without touching index', () => {
    const seeded = playbackReducer(
      initialState,
      actions.playFrom({ tracks: [track(1), track(2)], startIndex: 0 })
    )
    const added = playbackReducer(
      seeded,
      actions.appendPage({ tracks: [track(3), track(4)] })
    )
    expect(added.queue).toHaveLength(4)
    expect(added.index).toBe(0)
  })

  it('clearQueue resets queue and index', () => {
    const seeded = playbackReducer(
      initialState,
      actions.playFrom({ tracks: [track(1)], startIndex: 0 })
    )
    const cleared = playbackReducer(seeded, actions.clearQueue())
    expect(cleared.queue).toHaveLength(0)
    expect(cleared.index).toBe(-1)
  })
})
