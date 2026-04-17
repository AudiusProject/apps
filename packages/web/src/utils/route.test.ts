import {
  CONTEST_PAGE,
  TRACK_REMIXES_PAGE
} from '@audius/common/src/utils/route'
import { describe, expect, it } from 'vitest'

import { contestPage, fullContestPage, BASE_URL } from './route'

describe('contestPage route helper', () => {
  // The contest page is a new route added in the remix-contest redesign.
  // These tests lock in the URL shape the rest of the app (teaser link on
  // the track page, Follow button, canonical SSR meta) relies on.
  it('appends /contest to a permalink', () => {
    expect(contestPage('/Protohype/ready-to-love')).toBe(
      '/Protohype/ready-to-love/contest'
    )
  })

  it('appends /contest to permalinks containing uppercase and punctuation', () => {
    expect(contestPage('/Dj_Mix/My-Track--01')).toBe(
      '/Dj_Mix/My-Track--01/contest'
    )
  })

  it('does not normalise or rewrite the input permalink', () => {
    // Empty permalink is a programming error upstream; the helper is a pure
    // string concatenation, so we just verify it doesn't silently correct
    // the caller.
    expect(contestPage('')).toBe('/contest')
  })
})

describe('fullContestPage route helper', () => {
  it('prefixes the base url to a contest permalink', () => {
    const expected = `${BASE_URL}/Protohype/ready-to-love/contest`
    expect(fullContestPage('/Protohype/ready-to-love')).toBe(expected)
  })
})

describe('CONTEST_PAGE route pattern', () => {
  it('matches the /@handle/@slug/contest nesting of the existing /remixes pattern', () => {
    expect(CONTEST_PAGE).toBe('/:handle/:slug/contest')
  })

  it('is a sibling of TRACK_REMIXES_PAGE with the same handle/slug prefix', () => {
    // Both routes nest under a track page, so they must share the
    // /:handle/:slug prefix for react-router to match them.
    expect(CONTEST_PAGE.startsWith('/:handle/:slug/')).toBe(true)
    expect(TRACK_REMIXES_PAGE.startsWith('/:handle/:slug/')).toBe(true)
  })

  it('does not collide with the sibling /remixes route', () => {
    expect(CONTEST_PAGE).not.toBe(TRACK_REMIXES_PAGE)
  })
})
