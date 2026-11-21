import React from 'react'
import { ScrollViewProps, ScrollView as RNScrollView } from 'react-native'
import Animated from 'react-native-reanimated'

import {
  useAfterMountEffect,
  useChainCallback,
  useCollapsibleStyle,
  useScrollHandlerY,
  useSharedAnimatedRef,
  useTabNameContext,
  useTabsContext,
  useUpdateScrollViewContentSize
} from './hooks'

const ScrollViewMemo = React.memo(
  React.forwardRef<RNScrollView, React.PropsWithChildren<ScrollViewProps>>(
    (props, passRef) => {
      return <Animated.ScrollView ref={passRef} {...props} />
    }
  )
)

export const ScrollView = React.forwardRef<
  RNScrollView,
  React.PropsWithChildren<Omit<ScrollViewProps, 'onScroll'>>
>(
  (
    {
      contentContainerStyle,
      style,
      onContentSizeChange,
      children,
      refreshControl,
      ...rest
    },
    passRef
  ) => {
    const name = useTabNameContext()
    const ref = useSharedAnimatedRef<RNScrollView>(passRef)
    const { setRef, contentInset } = useTabsContext()
    const {
      style: _style,
      contentContainerStyle: _contentContainerStyle,
      progressViewOffset
    } = useCollapsibleStyle()
    const { scrollHandler, enable } = useScrollHandlerY(name)
    const onLayout = useAfterMountEffect(rest.onLayout, () => {
      'worklet'
      enable(true)
    })

    React.useEffect(() => {
      setRef(name, ref)
    }, [name, ref, setRef])

    const scrollContentSizeChange = useUpdateScrollViewContentSize({
      name
    })

    const scrollContentSizeChangeHandlers = useChainCallback(
      React.useMemo(
        () => [scrollContentSizeChange, onContentSizeChange],
        [onContentSizeChange, scrollContentSizeChange]
      )
    )

    const memoRefreshControl = React.useMemo(
      () =>
        refreshControl &&
        React.cloneElement(refreshControl, {
          progressViewOffset,
          ...refreshControl.props
        }),
      [progressViewOffset, refreshControl]
    )

    const memoContentInset = React.useMemo(
      () => ({ top: contentInset }),
      [contentInset]
    )

    const memoContentOffset = React.useMemo(
      () => ({ x: 0, y: -contentInset }),
      [contentInset]
    )

    const memoContentContainerStyle = React.useMemo(
      () => [_contentContainerStyle, contentContainerStyle as any],
      [_contentContainerStyle, contentContainerStyle]
    )
    const memoStyle = React.useMemo(() => [_style, style], [_style, style])

    return (
      <ScrollViewMemo
        {...rest}
        onLayout={onLayout}
        ref={ref}
        bouncesZoom={false}
        style={memoStyle}
        contentContainerStyle={memoContentContainerStyle}
        onScroll={scrollHandler}
        onContentSizeChange={scrollContentSizeChangeHandlers}
        scrollEventThrottle={16}
        contentInset={memoContentInset}
        contentOffset={memoContentOffset}
        automaticallyAdjustContentInsets={false}
        refreshControl={memoRefreshControl}
      >
        {children}
      </ScrollViewMemo>
    )
  }
)
