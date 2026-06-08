import type { LocalStorage } from '@audius/common/services'

export const createMockLocalStorage = () => {
  const storage = new Map<string, string>()
  const mockLocalStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    }
  }

  return {
    localStorage: mockLocalStorage,
    preloadSyncKeys: async () => {},
    preloadAccountSyncCache: async () => {},
    getItem: async (key: string) => storage.get(key) ?? null,
    getItemSync: (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: async (key: string) => {
      storage.delete(key)
    },
    getValue: async (key: string) => storage.get(key) ?? null,
    getValueSync: (key: string) => storage.get(key) ?? null,
    setValue: async (key: string, value: string) => {
      storage.set(key, value)
    },
    getJSONValue: async (key: string) => {
      const value = storage.get(key)
      return value ? JSON.parse(value) : null
    },
    getJSONValueSync: (key: string) => {
      const value = storage.get(key)
      return value ? JSON.parse(value) : null
    },
    getExpiringJSONValue: async (key: string) => {
      const value = storage.get(key)
      return value ? JSON.parse(value) : null
    },
    setJSONValue: async (key: string, value: any) => {
      storage.set(key, JSON.stringify(value))
    },
    setExpiringJSONValue: async (key: string, value: any) => {
      storage.set(key, JSON.stringify(value))
    },
    clear: async () => {
      storage.clear()
    },
    removeJSONValue: async (key: string) => {
      storage.delete(key)
    },
    removeExpiringJSONValue: async (key: string) => {
      storage.delete(key)
    },
    getKeysThatMatch: async (pattern: string) => {
      return Array.from(storage.keys()).filter((key) => key.match(pattern))
    },
    getAll: async () => {
      return Object.fromEntries(storage.entries())
    },
    getAllJSON: async () => {
      const entries = Array.from(storage.entries())
      return Object.fromEntries(
        entries.map(([key, value]) => [key, JSON.parse(value)])
      )
    },
    getAllExpiringJSON: async () => {
      const entries = Array.from(storage.entries())
      return Object.fromEntries(
        entries.map(([key, value]) => [key, JSON.parse(value)])
      )
    },
    getAudiusAccount: async () => null,
    getAudiusAccountSync: () => null,
    setAudiusAccount: async () => {},
    clearAudiusAccount: async () => {},
    getAudiusAccountUser: async () => null,
    getAudiusAccountUserSync: () => null,
    setAudiusAccountUser: async () => {},
    clearAudiusAccountUser: async () => {},
    clearAudiusUserWalletOverride: async () => {},
    getAudiusUserWalletOverride: async () => null,
    setAudiusUserWalletOverride: async () => {},
    getAudiusUserWalletAddress: async () => null,
    setAudiusUserWalletAddress: async () => {},
    clearAudiusUserWalletAddress: async () => {},
    clearPlaybackRate: async () => {}
  } as unknown as LocalStorage
}
