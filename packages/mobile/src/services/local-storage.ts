import { LocalStorage } from '@audius/common/services'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const localStorage = new LocalStorage({
  localStorage: AsyncStorage
})

// Pre-load the sync cache for the keys useCurrentAccount.placeholderData
// reads (AsyncStorage's getItem returns a Promise on RN, so the sync path
// used to silently return null and we'd flash the sign-on screen).
export const localStoragePreloadPromise = localStorage.preloadAccountSyncCache()
