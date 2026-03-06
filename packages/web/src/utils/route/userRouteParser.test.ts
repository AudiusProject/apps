import { describe, expect, it } from 'vitest'

import { parseUserRoute } from './userRouteParser'

describe('parseUserRoute', () => {
  it('parses profile tab routes', () => {
    expect(parseUserRoute('/test-user/albums')).toEqual({
      handle: 'test-user',
      userId: null,
      tab: 'albums'
    })
  })

  it('parses base profile routes', () => {
    expect(parseUserRoute('/test-user')).toEqual({
      handle: 'test-user',
      userId: null,
      tab: null
    })
  })

  it('does not parse static routes as user profiles', () => {
    expect(parseUserRoute('/search/albums')).toBeNull()
  })
})
