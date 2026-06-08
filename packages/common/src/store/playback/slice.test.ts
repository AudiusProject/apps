import { describe, it, expect } from 'vitest'

import playbackReducer, { actions, initialState } from './slice'
import type { PlaybackTrack } from './types'
import { RepeatMode } from './types'

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

  describe('shuffle', () => {
    it('enabling shuffle reorders queue with current track at position 0', () => {
      const tracks = [track(1), track(2), track(3), track(4), track(5)]
      const seeded = playbackReducer(
        initialState,
        actions.playFrom({ tracks, startIndex: 2 })
      )
      const shuffled = playbackReducer(
        seeded,
        actions.setShuffle({ enable: true })
      )
      expect(shuffled.shuffle).toBe(true)
      expect(shuffled.index).toBe(0)
      expect(shuffled.queue[0]).toEqual(track(3))
      expect(shuffled.queue).toHaveLength(tracks.length)
      expect(new Set(shuffled.queue.map((t) => t.trackId))).toEqual(
        new Set(tracks.map((t) => t.trackId))
      )
      expect(shuffled.shuffleOriginalQueue).toEqual(tracks)
      expect(shuffled.shuffleOriginalIndices[0]).toBe(2)
    })

    it('next/previous walk the shuffled queue in visible order', () => {
      const tracks = [track(1), track(2), track(3), track(4)]
      const seeded = playbackReducer(
        initialState,
        actions.playFrom({ tracks, startIndex: 0 })
      )
      const shuffled = playbackReducer(
        seeded,
        actions.setShuffle({ enable: true })
      )
      const after1 = playbackReducer(shuffled, actions.next({}))
      expect(after1.index).toBe(1)
      expect(after1.queue[after1.index]).toEqual(shuffled.queue[1])
      const after2 = playbackReducer(after1, actions.previous())
      expect(after2.index).toBe(0)
    })

    it('disabling shuffle restores original order with current track preserved', () => {
      const tracks = [track(1), track(2), track(3), track(4), track(5)]
      const seeded = playbackReducer(
        initialState,
        actions.playFrom({ tracks, startIndex: 0 })
      )
      const shuffled = playbackReducer(
        seeded,
        actions.setShuffle({ enable: true })
      )
      // Advance once in the shuffled queue.
      const advanced = playbackReducer(shuffled, actions.next({}))
      const playingTrack = advanced.queue[advanced.index]
      const restored = playbackReducer(
        advanced,
        actions.setShuffle({ enable: false })
      )
      expect(restored.shuffle).toBe(false)
      expect(restored.queue).toEqual(tracks)
      expect(restored.queue[restored.index]).toEqual(playingTrack)
      expect(restored.shuffleOriginalQueue).toEqual([])
      expect(restored.shuffleOriginalIndices).toEqual([])
    })

    it('removeFromQueue while shuffled removes from both visible and original', () => {
      const tracks = [track(1), track(2), track(3), track(4)]
      const seeded = playbackReducer(
        initialState,
        actions.playFrom({ tracks, startIndex: 0 })
      )
      const shuffled = playbackReducer(
        seeded,
        actions.setShuffle({ enable: true })
      )
      // Remove the visible track at position 1 (some random track).
      const removedTrack = shuffled.queue[1]
      const afterRemove = playbackReducer(
        shuffled,
        actions.removeFromQueue({ index: 1 })
      )
      expect(afterRemove.queue).toHaveLength(3)
      expect(
        afterRemove.queue.find((t) => t.trackId === removedTrack.trackId)
      ).toBeUndefined()
      expect(afterRemove.shuffleOriginalQueue).toHaveLength(3)
      expect(
        afterRemove.shuffleOriginalQueue.find(
          (t) => t.trackId === removedTrack.trackId
        )
      ).toBeUndefined()
      // Disabling shuffle should restore the remaining 3 in original order.
      const restored = playbackReducer(
        afterRemove,
        actions.setShuffle({ enable: false })
      )
      const expectedRemaining = tracks.filter(
        (t) => t.trackId !== removedTrack.trackId
      )
      expect(restored.queue).toEqual(expectedRemaining)
    })

    it('addToQueue while shuffled appends to both visible and original', () => {
      const tracks = [track(1), track(2), track(3)]
      const seeded = playbackReducer(
        initialState,
        actions.playFrom({ tracks, startIndex: 0 })
      )
      const shuffled = playbackReducer(
        seeded,
        actions.setShuffle({ enable: true })
      )
      const added = playbackReducer(
        shuffled,
        actions.addToQueue({ tracks: [track(4)] })
      )
      expect(added.queue).toHaveLength(4)
      expect(added.queue[3]).toEqual(track(4))
      expect(added.shuffleOriginalQueue).toHaveLength(4)
      expect(added.shuffleOriginalQueue[3]).toEqual(track(4))
    })

    it('appendPage while shuffled mirrors into original queue', () => {
      const tracks = [track(1), track(2)]
      const seeded = playbackReducer(
        initialState,
        actions.playFrom({ tracks, startIndex: 0 })
      )
      const shuffled = playbackReducer(
        seeded,
        actions.setShuffle({ enable: true })
      )
      const appended = playbackReducer(
        shuffled,
        actions.appendPage({ tracks: [track(3), track(4)] })
      )
      expect(appended.queue).toHaveLength(4)
      expect(appended.shuffleOriginalQueue).toHaveLength(4)
      expect(appended.shuffleOriginalIndices).toHaveLength(4)
    })

    it('reorder while shuffled keeps shuffleOriginalQueue intact', () => {
      const tracks = [track(1), track(2), track(3)]
      const seeded = playbackReducer(
        initialState,
        actions.playFrom({ tracks, startIndex: 0 })
      )
      const shuffled = playbackReducer(
        seeded,
        actions.setShuffle({ enable: true })
      )
      const reordered = playbackReducer(
        shuffled,
        actions.reorder({ orderedIndices: [2, 0, 1] })
      )
      expect(reordered.queue).toEqual([
        shuffled.queue[2],
        shuffled.queue[0],
        shuffled.queue[1]
      ])
      // Original queue is unchanged.
      expect(reordered.shuffleOriginalQueue).toEqual(tracks)
      // shuffleOriginalIndices follow their tracks.
      expect(reordered.shuffleOriginalIndices).toEqual([
        shuffled.shuffleOriginalIndices[2],
        shuffled.shuffleOriginalIndices[0],
        shuffled.shuffleOriginalIndices[1]
      ])
    })

    it('playFrom while shuffled re-shuffles the new queue', () => {
      const seeded = playbackReducer(
        { ...initialState, shuffle: true },
        actions.playFrom({
          tracks: [track(1), track(2), track(3), track(4)],
          startIndex: 1
        })
      )
      expect(seeded.shuffle).toBe(true)
      expect(seeded.index).toBe(0)
      // Track originally at startIndex sits at visible position 0.
      expect(seeded.queue[0]).toEqual(track(2))
      expect(seeded.shuffleOriginalQueue).toHaveLength(4)
    })

    it('clearUpcoming while shuffled keeps current track and clears state', () => {
      const tracks = [track(1), track(2), track(3)]
      const seeded = playbackReducer(
        initialState,
        actions.playFrom({ tracks, startIndex: 0 })
      )
      const shuffled = playbackReducer(
        seeded,
        actions.setShuffle({ enable: true })
      )
      const cleared = playbackReducer(shuffled, actions.clearUpcoming())
      expect(cleared.queue).toHaveLength(1)
      expect(cleared.index).toBe(0)
      expect(cleared.shuffleOriginalQueue).toEqual([cleared.queue[0]])
      expect(cleared.shuffleOriginalIndices).toEqual([0])
    })
  })
})
