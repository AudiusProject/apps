import { beforeEach, describe, expect, it, vi } from 'vitest'

import { persistStorage } from './persistStorage'

const localforageItems = new Map<string, unknown>()
const getItemMock = vi.fn(async (key: string) => localforageItems.get(key))

vi.mock('localforage', () => ({
  default: { getItem: (key: string) => getItemMock(key) }
}))

describe('persistStorage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
    localforageItems.clear()
    getItemMock.mockClear()
  })

  it('reads and writes localStorage', async () => {
    await persistStorage.setItem('persist:search', '{"history":"[]"}')
    expect(await persistStorage.getItem('persist:search')).toBe(
      '{"history":"[]"}'
    )
    expect(getItemMock).not.toHaveBeenCalled()
  })

  it('copies a value from localforage once', async () => {
    localforageItems.set('persist:search', '{"history":"[\\"a\\"]"}')

    expect(await persistStorage.getItem('persist:search')).toBe(
      '{"history":"[\\"a\\"]"}'
    )
    expect(window.localStorage.getItem('persist:search')).toBe(
      '{"history":"[\\"a\\"]"}'
    )
    expect(await persistStorage.getItem('persist:search')).toBe(
      '{"history":"[\\"a\\"]"}'
    )
    expect(getItemMock).toHaveBeenCalledTimes(1)
  })

  it('only checks localforage once when it has nothing', async () => {
    expect(await persistStorage.getItem('persist:library-page')).toBeNull()
    expect(await persistStorage.getItem('persist:library-page')).toBeNull()
    expect(getItemMock).toHaveBeenCalledTimes(1)
  })

  it('does not restore from localforage after a removal', async () => {
    localforageItems.set('persist:search', 'old')
    await persistStorage.getItem('persist:search')
    await persistStorage.removeItem('persist:search')
    expect(await persistStorage.getItem('persist:search')).toBeNull()
  })

  it('skips localforage when its database does not exist', async () => {
    vi.stubGlobal('indexedDB', { databases: async () => [{ name: 'other' }] })
    localforageItems.set('persist:search', 'old')
    expect(await persistStorage.getItem('persist:search')).toBeNull()
    expect(await persistStorage.getItem('persist:search')).toBeNull()
    expect(getItemMock).not.toHaveBeenCalled()
  })

  it('migrates when the localforage database exists', async () => {
    vi.stubGlobal('indexedDB', {
      databases: async () => [{ name: 'localforage' }]
    })
    localforageItems.set('persist:search', 'old')
    expect(await persistStorage.getItem('persist:search')).toBe('old')
    expect(getItemMock).toHaveBeenCalledTimes(1)
  })
})
