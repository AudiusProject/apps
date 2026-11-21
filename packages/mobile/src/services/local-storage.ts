import { LocalStorage } from '@audius/common/services'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const localStorage = new LocalStorage({
  localStorage: AsyncStorage
})

export const localStoragePreloadPromise = localStorage.preloadAccountSyncCache()
