import { Dimensions, Platform, useWindowDimensions } from 'react-native'

export const getFullDrawerHeight = () =>
  Dimensions.get(Platform.OS === 'ios' ? 'window' : 'screen').height

export const useFullDrawerHeight = () => {
  useWindowDimensions()
  return getFullDrawerHeight()
}
