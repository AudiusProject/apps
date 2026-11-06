import { describe, expect, it } from 'vitest'

import { formatGroupChatTitle } from './chatUtils'

describe('formatGroupChatTitle', () => {
  const users = (...names: string[]) => names.map((name) => ({ name }))

  it('lists up to two names', () => {
    expect(formatGroupChatTitle(users('Ann'))).toBe('Ann')
    expect(formatGroupChatTitle(users('Ann', 'Bo'))).toBe('Ann & Bo')
  })

  it('summarizes the rest', () => {
    expect(formatGroupChatTitle(users('Ann', 'Bo', 'Cy'))).toBe(
      'Ann, Bo & 1 other'
    )
    expect(formatGroupChatTitle(users('Ann', 'Bo', 'Cy', 'Di'))).toBe(
      'Ann, Bo & 2 others'
    )
  })

  it('falls back when no one is left', () => {
    expect(formatGroupChatTitle([])).toBe('Group')
  })
})
