import type { MutableRefObject, Ref } from 'react'
import { forwardRef, useContext, useRef } from 'react'

import { Portal } from '@gorhom/portal'
import type {
  FlatListProps as RNFlatListProps,
  FlatList as RNFlatList
} from 'react-native'
import { Animated, Platform, RefreshControl, View } from 'react-native'
import { Tabs, useCurrentTabScrollY } from 'react-native-collapsible-tab-view'

import { useThemeColors } from 'app/utils/theme'

import { CollapsibleTabNavigatorContext } from '../top-tab-bar'

import { PlayBarChin } from './PlayBarChin'
import { PullToRefresh, useOverflowHandlers } from './PullToRefresh'

export type FlatListT<ItemT> = RNFlatList<ItemT>
export type AnimatedFlatListT<ItemT> = Animated.FlatList<ItemT>

type CollapsibleFlatListProps<ItemT> = RNFlatListProps<ItemT>

function CollapsibleFlatList<ItemT>(props: CollapsibleFlatListProps<ItemT>) {
  const { neutral, staticWhite } = useThemeColors()

  // Pull refresh state from CollapsibleTabNavigatorContext when the host
  // screen provides one (profile, contest). Falling back to the props lets
  // direct callers (anything outside the navigator) keep the legacy inline
  // RefreshControl behavior.
  const collapsibleContext = useContext(CollapsibleTabNavigatorContext)
  const refreshing =
    collapsibleContext.refreshing !== undefined
      ? collapsibleContext.refreshing
      : props.refreshing
  const onRefresh = collapsibleContext.onRefresh ?? props.onRefresh
  const isFromContext = collapsibleContext.onRefresh !== undefined

  const scrollY = useCurrentTabScrollY()

  return (
    <View>
      {/* When the host screen exposes a `PullToRefreshPortalHost` (profile,
          contest), portal the iOS pull-to-refresh into it so the gesture
          expands the cover photo instead of leaving a blank gap above the
          list. Mirrors `CollapsibleSectionList`'s portal usage. */}
      {Platform.OS === 'ios' && onRefresh && isFromContext ? (
        <Portal hostName='PullToRefreshPortalHost'>
          <PullToRefresh
            isRefreshing={refreshing ?? undefined}
            onRefresh={onRefresh}
            scrollY={scrollY}
            topOffset={40}
            color={staticWhite}
          />
        </Portal>
      ) : Platform.OS === 'ios' && onRefresh ? (
        <PullToRefresh scrollY={scrollY} />
      ) : null}
      <Tabs.FlatList
        {...props}
        refreshControl={
          Platform.OS === 'ios' ? undefined : (
            <RefreshControl
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

const AnimatedFlatList = forwardRef(function AnimatedFlatList<ItemT>(
  props: Animated.AnimatedProps<RNFlatListProps<ItemT>>,
  ref: MutableRefObject<Animated.FlatList<ItemT> | null>
) {
  const { refreshing, onRefresh, onScroll, ...other } = props
  const scrollRef = useRef<Animated.FlatList>(null)
  const { neutral } = useThemeColors()

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
    // @ts-expect-error: weirdness around types here, but it works
    scrollResponder: ref?.current || scrollRef.current,
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
      <Animated.FlatList
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
        ref={ref || scrollRef}
        onScroll={handleScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
      />
    </View>
  )
})

export type FlatListProps<ItemT> = RNFlatListProps<ItemT> & {
  isCollapsible?: boolean
}

/**
 * Provides either a FlatList or an animated FlatList
 * depending on whether or not the list is found in a "collapsible" header tab
 */
export const FlatList = forwardRef(function FlatList<ItemT>(
  props: FlatListProps<ItemT>,
  ref: Ref<FlatListT<ItemT>>
) {
  const {
    ListFooterComponent,
    isCollapsible: isCollapsibleProp,
    ...other
  } = props
  const collapsibleContext = useContext(CollapsibleTabNavigatorContext)
  const isCollapsible =
    isCollapsibleProp ?? Object.keys(collapsibleContext).length > 0
  const FooterComponent = ListFooterComponent ? (
    <>
      {ListFooterComponent}
      <PlayBarChin />
    </>
  ) : (
    PlayBarChin
  )

  const flatListProps = {
    ...other,
    ListFooterComponent: FooterComponent
  }

  if (isCollapsible) {
    return <CollapsibleFlatList {...flatListProps} />
  }
  return (
    <AnimatedFlatList
      ref={ref as Ref<AnimatedFlatListT<ItemT>>}
      {...(flatListProps as Animated.AnimatedProps<RNFlatListProps<ItemT>>)}
    />
  )
})
