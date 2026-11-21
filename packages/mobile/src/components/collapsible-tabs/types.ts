import React, { ComponentProps } from 'react'
import {
  FlatList,
  ScrollView,
  SectionList,
  StyleProp,
  ViewStyle
} from 'react-native'
import PagerView, { PagerViewProps } from 'react-native-pager-view'
import Animated, {
  AnimatedRef,
  SharedValue,
  AnimatedStyle
} from 'react-native-reanimated'

export type ContainerRef = PagerView

export type RefComponent =
  | FlatList<any>
  | ScrollView
  | Animated.ScrollView
  | SectionList<any>

export type Ref<T extends RefComponent> = React.RefObject<T>

export type TabName = string

export type RefHandler<T extends TabName = TabName> = {
  jumpToTab: (name: T) => boolean
  setIndex: (index: number) => boolean
  getFocusedTab: () => T
  getCurrentIndex: () => number
}

export type CollapsibleRef<T extends TabName = TabName> =
  | RefHandler<T>
  | undefined

export type TabBarProps<T extends TabName = TabName> = {
  indexDecimal: SharedValue<number>
  focusedTab: SharedValue<T>
  tabNames: T[]
  index: SharedValue<number>
  containerRef: React.RefObject<ContainerRef>
  onTabPress: (name: T) => void
  tabProps: TabsWithProps<T>

  width?: number
}

export type IndexChangeEventData<T extends TabName = TabName> = {
  prevIndex: number
  index: number
  prevTabName: T
  tabName: T
}

export type OnTabChangeCallback<T extends TabName = TabName> = (
  data: IndexChangeEventData<T>
) => void

export type TabReactElement<T extends TabName = TabName> = React.ReactElement<
  TabProps<T>
> | null

export type CollapsibleProps = {
  initialTabName?: TabName
  headerHeight?: number
  tabBarHeight?: number
  minHeaderHeight?: number
  revealHeaderOnScroll?: boolean
  snapThreshold?: number | null
  children: TabReactElement<TabName>[] | TabReactElement<TabName>

  renderHeader?: (props: TabBarProps<TabName>) => React.ReactElement | null

  renderTabBar?: (props: TabBarProps<TabName>) => React.ReactElement | null

  headerContainerStyle?: StyleProp<AnimatedStyle<ViewStyle>>
  containerStyle?: StyleProp<ViewStyle>
  cancelTranslation?: boolean
  lazy?: boolean
  cancelLazyFadeIn?: boolean
  pagerProps?: Omit<PagerViewProps, 'onPageScroll' | 'initialPage'>
  onIndexChange?: (index: number) => void

  onTabChange?: OnTabChangeCallback<TabName>

  width?: number

  allowHeaderOverscroll?: boolean
}

export type ContextType<T extends TabName = TabName> = {
  headerHeight: number
  tabBarHeight: number
  containerHeight: number
  revealHeaderOnScroll: boolean
  snapThreshold: number | null | undefined
  indexDecimal: SharedValue<number>
  tabNames: SharedValue<T[]>
  index: SharedValue<number>
  focusedTab: SharedValue<T>
  accDiffClamp: SharedValue<number>
  scrollYCurrent: SharedValue<number>
  scrollY: SharedValue<Record<string, number>>
  refMap: Record<TabName, AnimatedRef<RefComponent>>
  setRef: <T extends RefComponent>(
    key: TabName,
    ref: AnimatedRef<T>
  ) => AnimatedRef<T>
  headerScrollDistance: SharedValue<number>
  oldAccScrollY: SharedValue<number>
  accScrollY: SharedValue<number>
  offset: SharedValue<number>

  snappingTo: SharedValue<number>

  contentHeights: SharedValue<number[]>

  contentInset: number

  headerTranslateY: SharedValue<number>

  width: number

  allowHeaderOverscroll?: boolean

  minHeaderHeight: number
}

export type ScrollViewProps = ComponentProps<typeof Animated.ScrollView>

export type CollapsibleStyle = {
  style: { width: number }
  contentContainerStyle: {
    minHeight: number
    paddingTop: number
  }
  progressViewOffset: number
}

export type TabsWithProps<T extends TabName = TabName> = Map<
  T,
  Omit<TabProps<T>, 'children'> & { index: number }
>

export type TabItemProps<T extends TabName> = {
  name: T
  index: number
  indexDecimal: SharedValue<number>

  label: string | ((props: TabItemProps<T>) => React.ReactNode)
}

export type TabProps<T extends TabName> = {
  readonly name: T
  label?: TabItemProps<T>['label']
  children: React.ReactNode
}
