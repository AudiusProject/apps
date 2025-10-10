import { Platform } from 'react-native'

export const isIos = Platform.OS === 'ios'

export const isAndroid = Platform.OS === 'android'

export const isSolanaPhone =
  Platform.OS === 'android' &&
  (Platform.constants.Model === 'Saga' ||
    Platform.constants.Model === 'Seeker')
