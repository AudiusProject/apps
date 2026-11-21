import type React from 'react'

import type {
  LayoutChangeEvent,
  PressableProps,
  StyleProp,
  TextStyle,
  ViewStyle
} from 'react-native'
import type { AnimatedStyle, SharedValue } from 'react-native-reanimated'

import type { TabBarProps, TabItemProps } from 'app/components/collapsible-tabs'

type TabName = string

type AnimatedViewStyle = AnimatedStyle<ViewStyle>
type AnimatedTextStyle = AnimatedStyle<TextStyle>

export type MaterialTabItemProps<T extends TabName> = TabItemProps<T> & {
  onPress: (name: T) => void
  onLayout?: (event: LayoutChangeEvent) => void
  scrollEnabled?: boolean

  style?: StyleProp<ViewStyle>
  labelStyle?: AnimatedTextStyle
  inactiveOpacity?: number
  pressColor?: string
  pressOpacity?: number
  activeColor?: string
  inactiveColor?: string
} & Omit<PressableProps, 'onPress' | 'children'>

export type MaterialTabBarProps<N extends TabName> = TabBarProps<N> & {
  scrollEnabled?: boolean
  indicatorStyle?: AnimatedViewStyle
  TabItemComponent?: (props: MaterialTabItemProps<N>) => React.ReactElement
  getLabelText?: (name: N) => string
  style?: StyleProp<ViewStyle>
  contentContainerStyle?: StyleProp<ViewStyle>
  tabStyle?: StyleProp<ViewStyle>
  labelStyle?: AnimatedTextStyle
  activeColor?: string
  inactiveColor?: string

  keepActiveTabCentered?: boolean
}

export type ItemLayout = {
  width: number
  x: number
}

export type IndicatorProps = {
  indexDecimal: SharedValue<number>
  itemsLayout: ItemLayout[]
  style?: AnimatedViewStyle
  fadeIn?: boolean
}
