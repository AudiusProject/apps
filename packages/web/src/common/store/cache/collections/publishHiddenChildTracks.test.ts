import { Collection, Track } from '@audius/common/models'
import {
  publishHiddenTracksConfirmationModalActions,
  trackPageActions
} from '@audius/common/store'
import { describe, it, expect } from 'vitest'

import {
  confirmPublishHiddenTracks,
  publishHiddenChildTracks
} from './commonSagas'

/**
 * The web vitest setup stubs out redux-saga, and redux-saga-test-plan fails to
 * load under vitest's ESM interop, so neither can run a saga here. These sagas
 * are plain generators of plain effect objects though, so we drive them
 * directly: resolve GET_CONTEXT from `context`, record PUT, and resolve the
 * confirmation RACE with `raceOutcome`.
 */
type DriveOptions = {
  context?: Record<string, unknown>
  raceOutcome?: 'confirmed' | 'keepPrivate'
}

const drive = (gen: Generator<any, any, any>, options: DriveOptions = {}) => {
  const { context = {}, raceOutcome } = options
  const puts: any[] = []

  let next = gen.next()
  while (!next.done) {
    const { type, payload } = next.value ?? {}
    let result: any
    switch (type) {
      case 'GET_CONTEXT':
        result = context[payload as string]
        break
      case 'PUT':
        puts.push(payload.action)
        result = undefined
        break
      case 'RACE':
        if (!raceOutcome) {
          throw new Error('Saga raced but no raceOutcome was provided')
        }
        result = { [raceOutcome]: {} }
        break
      default:
        throw new Error(`Unhandled effect: ${type}`)
    }
    next = gen.next(result)
  }
  return { puts, returned: next.value }
}

const asTrack = (track: Partial<Track> & { track_id: number }) => track as Track
const asCollection = (collection: Partial<Collection>) =>
  collection as Collection

const publicTrack = asTrack({ track_id: 1, is_unlisted: false })
const hiddenTrack = asTrack({
  track_id: 2,
  is_unlisted: true,
  is_scheduled_release: false
})
const scheduledTrack = asTrack({
  track_id: 3,
  is_unlisted: true,
  is_scheduled_release: true
})

const playlist = asCollection({ is_scheduled_release: false })
const scheduledPlaylist = asCollection({ is_scheduled_release: true })

const web = { context: { isNativeMobile: false } }
const mobile = { context: { isNativeMobile: true } }

const makePublic = (trackId: number) =>
  trackPageActions.makeTrackPublic(trackId)
const openModal = (
  contentType: 'album' | 'playlist',
  hiddenTrackCount: number
) =>
  publishHiddenTracksConfirmationModalActions.open({
    contentType,
    hiddenTrackCount
  })

describe('confirmPublishHiddenTracks', () => {
  it('does not prompt when there are no hidden tracks', () => {
    const { puts, returned } = drive(confirmPublishHiddenTracks(0, false), web)
    expect(puts).toEqual([])
    expect(returned).toBe(true)
  })

  it('prompts with the hidden track count and returns true when confirmed', () => {
    const { puts, returned } = drive(confirmPublishHiddenTracks(2, false), {
      ...web,
      raceOutcome: 'confirmed'
    })
    expect(puts).toEqual([openModal('playlist', 2)])
    expect(returned).toBe(true)
  })

  it('returns false when the user keeps tracks private', () => {
    const { puts, returned } = drive(confirmPublishHiddenTracks(1, false), {
      ...web,
      raceOutcome: 'keepPrivate'
    })
    expect(puts).toEqual([openModal('playlist', 1)])
    expect(returned).toBe(false)
  })

  it('labels the prompt for albums', () => {
    const { puts } = drive(confirmPublishHiddenTracks(1, true), {
      ...web,
      raceOutcome: 'keepPrivate'
    })
    expect(puts).toEqual([openModal('album', 1)])
  })

  it('keeps the previous publish-everything behavior on native mobile', () => {
    // Mobile renders no drawer for the prompt yet, so it must not block.
    const { puts, returned } = drive(
      confirmPublishHiddenTracks(1, false),
      mobile
    )
    expect(puts).toEqual([])
    expect(returned).toBe(true)
  })
})

describe('publishHiddenChildTracks', () => {
  it('publishes nothing when no tracks are hidden', () => {
    const { puts } = drive(
      publishHiddenChildTracks(playlist, [publicTrack], true)
    )
    expect(puts).toEqual([])
  })

  it('publishes hidden tracks when the decision is to publish', () => {
    const { puts } = drive(
      publishHiddenChildTracks(playlist, [publicTrack, hiddenTrack], true)
    )
    expect(puts).toEqual([makePublic(2)])
  })

  it('leaves hidden tracks alone when the decision is to keep them private', () => {
    const { puts } = drive(
      publishHiddenChildTracks(playlist, [publicTrack, hiddenTrack], false)
    )
    expect(puts).toEqual([])
  })

  it('keeps scheduled tracks hidden when a kept-private track sits alongside', () => {
    // The collection is a scheduled release, but not every track is scheduled,
    // so this is not an early release and the scheduled track stays hidden.
    const { puts } = drive(
      publishHiddenChildTracks(
        scheduledPlaylist,
        [hiddenTrack, scheduledTrack],
        false
      )
    )
    expect(puts).toEqual([])
  })

  it('early-releases an all-scheduled collection', () => {
    const { puts } = drive(
      publishHiddenChildTracks(scheduledPlaylist, [scheduledTrack], false)
    )
    expect(puts).toEqual([makePublic(3)])
  })

  it('does not early-release scheduled tracks of a non-scheduled collection', () => {
    const { puts } = drive(
      publishHiddenChildTracks(playlist, [scheduledTrack], true)
    )
    expect(puts).toEqual([])
  })

  it('handles a collection with no tracks', () => {
    const { puts } = drive(publishHiddenChildTracks(playlist, null, true))
    expect(puts).toEqual([])
  })
})
