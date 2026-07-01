import {
  CONTEST_PAGE,
  TRACK_REMIXES_PAGE
} from '@audius/common/src/utils/route'
import { describe, expect, it } from 'vitest'

import { contestPage, fullContestPage, BASE_URL } from './route'

describe('contestPage route helper', () => {
  // The contest page URL injects the literal `contest` segment between
  // handle and slug — `/{handle}/contest/{slug}` — so it sits as a
  // sibling to `/{handle}/album/{slug}` rather than as a child of the
  // track URL. These tests lock in that shape.
  it('rewrites the permalink into /{handle}/contest/{slug}', () => {
    expect(contestPage('/Protohype/ready-to-love')).toBe(
      '/Protohype/contest/ready-to-love'
    )
  })

  it('preserves uppercase and punctuation in the slug', () => {
    expect(contestPage('/Dj_Mix/My-Track--01')).toBe(
      '/Dj_Mix/contest/My-Track--01'
    )
  })
})

describe('fullContestPage route helper', () => {
  it('prefixes the base url to a contest permalink', () => {
    const expected = `${BASE_URL}/Protohype/contest/ready-to-love`
    expect(fullContestPage('/Protohype/ready-to-love')).toBe(expected)
  })
})

describe('CONTEST_PAGE route pattern', () => {
  it('matches the /:handle/contest/:slug nesting', () => {
    expect(CONTEST_PAGE).toBe('/:handle/contest/:slug')
  })

  it('does not collide with the sibling /remixes route', () => {
    expect(CONTEST_PAGE).not.toBe(TRACK_REMIXES_PAGE)
  })
})
