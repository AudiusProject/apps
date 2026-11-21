import type { BaseBoxProps } from '@audius/harmony/src/components/layout/Box/types'
import type { ViewProps, ViewStyle } from 'react-native'

export type BoxProps = Omit<BaseBoxProps, 'flex' | 'alignSelf'> & {
  flex?: ViewStyle['flex']
  alignSelf?: ViewStyle['alignSelf']
} & ViewProps
