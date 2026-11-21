import type { LocalStorage } from '@audius/hedgehog'

export const getPlatformLocalStorage = async (): Promise<LocalStorage> => {
  if (typeof window === 'undefined' || window === null) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const LocalStorage = (await import('node-localstorage')).LocalStorage
    return new LocalStorage('./local-storage')
  } else {
    return window.localStorage
  }
}

export type { LocalStorage } from '@audius/hedgehog'
