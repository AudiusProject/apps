import { LocalStorage } from '@audius/common/services'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const localStorage = new LocalStorage({
  localStorage: AsyncStorage
})

// Pre-load the keys that useCurrentAccount.placeholderData reads on first
// render. AsyncStorage is async, so without this preload the sync read returns
// null and we briefly render the sign-on screen before the network resolves.
export const localStoragePreloadPromise = localStorage.preloadAccountSyncCache()
