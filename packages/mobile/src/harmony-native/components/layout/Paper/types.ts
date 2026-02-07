import type { BasePaperProps } from '@audius/harmony/src/components/layout/Paper/types'
import type { GestureResponderEvent } from 'react-native'

import type { FlexProps } from '../Flex/types'

export type PaperProps = Omit<BasePaperProps, 'onClick'> & {
  onPress?: (e?: GestureResponderEvent) => void
} & FlexProps
