import { Platform } from 'react-native'
import ReactNativeHapticFeedback from 'react-native-haptic-feedback'

const options = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false
}

export const light = () => {
  if (Platform.OS === 'android') {
    ReactNativeHapticFeedback.trigger('keyboardPress', options)
  } else {
    ReactNativeHapticFeedback.trigger('impactLight', options)
  }
}

export const medium = () => {
  if (Platform.OS === 'android') {
    ReactNativeHapticFeedback.trigger('keyboardPress', options)
  } else {
    ReactNativeHapticFeedback.trigger('impactMedium', options)
  }
}
