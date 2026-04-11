import type { Ref, RefObject } from 'react'
import { forwardRef, useCallback, useContext, useRef } from 'react'

import { Portal } from '@gorhom/portal'
import type {
  DefaultSectionT,
  LayoutChangeEvent,
  SectionList as RNSectionList,
  SectionListProps as RNSectionListProps
} from 'react-native'
import { Animated, Platform, RefreshControl, View } from 'react-native'
import {
  Tabs,
  useCollapsibleStyle,
  useCurrentTabScrollY
} from 'react-native-collapsible-tab-view'
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue
} from 'react-native-reanimated'

import { useThemeColors } from 'app/utils/theme'

import { CollapsibleTabNavigatorContext } from '../top-tab-bar'

import { PlayBarChin } from './PlayBarChin'
import { PullToRefresh, useOverflowHandlers } from './PullToRefresh'

type CollapsibleSectionListProps<ItemT> = RNSectionListProps<ItemT>

const CollapsibleSectionList = <ItemT,>(
  props: CollapsibleSectionListProps<ItemT>
) => {
  const {
    onEndReached,
    onEndReachedThreshold,
    onContentSizeChange,
    ...restProps
  } = props
  const { refreshing, onRefresh } = useContext(CollapsibleTabNavigatorContext)
  const { progressViewOffset } = useCollapsibleStyle()
  const { neutral, staticWhite } = useThemeColors()
  const scrollY = useCurrentTabScrollY()

  // Tabs.SectionList overrides onScroll with its own Reanimated handler,
  // which prevents VirtualizedList's internal onEndReached from firing.
  // We synthesize onEndReached by watching the Reanimated scroll value.
  const contentHeight = useSharedValue(0)
  const layoutHeight = useSharedValue(0)
  const onEndReachedRef = useRef(onEndReached)
  onEndReachedRef.current = onEndReached

  const fireOnEndReached = useCallback(() => {
    onEndReachedRef.current?.({ distanceFromEnd: 0 })
  }, [])

  const handleContentSizeChange = useCallback(
    (w: number, h: number) => {
      contentHeight.value = h
      onContentSizeChange?.(w, h)
    },
    [contentHeight, onContentSizeChange]
  )

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      layoutHeight.value = e.nativeEvent.layout.height
    },
    [layoutHeight]
  )

  useAnimatedReaction(
    () => {
      const threshold = onEndReachedThreshold ?? 0.5
      const layout = layoutHeight.value
      const content = contentHeight.value
      if (layout === 0 || content === 0) return false
      return layout + scrollY.value >= content - threshold * layout
    },
    (isPastEnd, wasPastEnd) => {
      if (isPastEnd && !wasPastEnd) {
        runOnJS(fireOnEndReached)()
      }
    }
  )

  return (
    <View onLayout={handleLayout}>
      {Platform.OS === 'ios' && onRefresh ? (
        <Portal hostName='PullToRefreshPortalHost'>
          <PullToRefresh
            isRefreshing={refreshing}
            onRefresh={onRefresh}
            scrollY={scrollY}
            topOffset={40}
            color={staticWhite}
          />
        </Portal>
      ) : null}
      <Tabs.SectionList
        {...restProps}
        onContentSizeChange={handleContentSizeChange}
        scrollToOverflowEnabled
        refreshControl={
          Platform.OS === 'ios' ? undefined : (
            <RefreshControl
              progressViewOffset={progressViewOffset}
              refreshing={!!refreshing}
              onRefresh={onRefresh ?? undefined}
              colors={[neutral]}
            />
          )
        }
      />
    </View>
  )
}

const AnimatedSectionList = forwardRef(function AnimatedSectionList<
  ItemT,
  SectionT = DefaultSectionT
>(
  props: Animated.AnimatedProps<RNSectionListProps<ItemT, SectionT>>,
  ref: RefObject<RNSectionList<ItemT, SectionT>>
) {
  const { refreshing, onRefresh, onScroll, ...other } = props
  const { neutral } = useThemeColors()
  const scrollResponder = ref?.current?.getScrollResponder()
  const {
    isRefreshing,
    isRefreshDisabled,
    handleRefresh,
    scrollAnim,
    handleScroll,
    onScrollBeginDrag,
    onScrollEndDrag
  } = useOverflowHandlers({
    isRefreshing: Boolean(refreshing),
    scrollResponder,
    onRefresh,
    onScroll
  })

  return (
    <View>
      {Platform.OS === 'ios' && handleRefresh ? (
        <PullToRefresh
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          scrollY={scrollAnim}
          isRefreshDisabled={isRefreshDisabled}
          yOffsetDisappearance={-16}
        />
      ) : null}

      <Animated.SectionList
        {...other}
        scrollToOverflowEnabled
        refreshControl={
          Platform.OS === 'ios' ? undefined : (
            <RefreshControl
              refreshing={!!isRefreshing}
              onRefresh={onRefresh ?? undefined}
              colors={[neutral]}
            />
          )
        }
        // Have to cast here because Animated version doesn't type getScrollResponder
        ref={ref as Ref<Animated.SectionList<ItemT, SectionT>>}
        onScroll={handleScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
      />
    </View>
  )
})

export const SectionList = forwardRef(function SectionList<
  ItemT,
  SectionT = DefaultSectionT
>(
  props: Animated.AnimatedProps<RNSectionListProps<ItemT, SectionT>> & {
    hidePlayBarChin?: boolean
  },
  ref: Ref<RNSectionList<ItemT, SectionT>>
) {
  const { ListFooterComponent, hidePlayBarChin, ...other } = props

  const FooterComponent = ListFooterComponent ? (
    <>
      {ListFooterComponent}
      {hidePlayBarChin ? null : <PlayBarChin />}
    </>
  ) : hidePlayBarChin ? null : (
    <PlayBarChin />
  )

  const sectionListProps = {
    ...other,
    ListFooterComponent: FooterComponent
  }

  const collapsibleContext = useContext(CollapsibleTabNavigatorContext)
  const isCollapsible = Object.keys(collapsibleContext).length > 0

  if (isCollapsible) {
    // @ts-expect-error using reanimated types: TODO update AnimatedSectionList to use reanimated types
    return <CollapsibleSectionList {...sectionListProps} />
  }
  return <AnimatedSectionList ref={ref} {...sectionListProps} />
})
