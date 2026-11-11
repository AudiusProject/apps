import type { Storage } from 'redux-persist'

// redux-persist used to write through localforage (IndexedDB). Keys that
// have not been read from localStorage yet are copied over once, and
// localforage is only loaded for that copy.
const MIGRATED_PREFIX = 'persist-migrated-from-localforage:'

const getLocalStorage = () => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

// localforage's default IndexedDB database. A browser without it (every new
// visitor) has nothing to migrate, so skip loading localforage at all.
const LOCALFORAGE_DB_NAME = 'localforage'

const mayHaveLocalforageData = async () => {
  try {
    if (typeof indexedDB?.databases !== 'function') return true
    const databases = await indexedDB.databases()
    return databases.some(({ name }) => name === LOCALFORAGE_DB_NAME)
  } catch {
    return true
  }
}

const migrateFromLocalforage = async (
  localStorage: globalThis.Storage,
  key: string
): Promise<string | null> => {
  let value: string | null = null
  try {
    if (!(await mayHaveLocalforageData())) {
      localStorage.setItem(MIGRATED_PREFIX + key, 'true')
      return null
    }
    const { default: localforage } = await import('localforage')
    const stored = await localforage.getItem<unknown>(key)
    if (typeof stored === 'string') {
      value = stored
      localStorage.setItem(key, stored)
    }
  } catch (e) {
    console.warn(`Failed to migrate ${key} from localforage`, e)
  }
  try {
    localStorage.setItem(MIGRATED_PREFIX + key, 'true')
  } catch {
    // Storage full or unavailable; we'll retry next load
  }
  return value
}

export const persistStorage: Storage = {
  getItem: async (key: string) => {
    const localStorage = getLocalStorage()
    if (!localStorage) return null
    const value = localStorage.getItem(key)
    if (value !== null || localStorage.getItem(MIGRATED_PREFIX + key)) {
      return value
    }
    return migrateFromLocalforage(localStorage, key)
  },
  setItem: async (key: string, value: string) => {
    getLocalStorage()?.setItem(key, value)
  },
  removeItem: async (key: string) => {
    getLocalStorage()?.removeItem(key)
  }
}
