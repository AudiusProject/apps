import {
  useMemo,
  Children,
  useState,
  useCallback,
  useContext,
  MutableRefObject,
  useEffect,
  useRef
} from 'react'
import { LayoutChangeEvent, StyleSheet, ViewProps } from 'react-native'
import { PagerViewOnPageScrollEvent } from 'react-native-pager-view'
import {
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
  withDelay,
  withTiming,
  interpolate,
  useEvent,
  useHandler,
  AnimatedRef,
  Extrapolation,
  SharedValue
} from 'react-native-reanimated'
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets'
import { useDeepCompareMemo } from 'use-deep-compare'

import { Context, TabNameContext } from './Context'
import { IS_IOS, ONE_FRAME_MS, scrollToImpl } from './helpers'
import {
  CollapsibleStyle,
  ContainerRef,
  ContextType,
  RefComponent,
  TabName,
  TabReactElement,
  TabsWithProps
} from './types'

export function useContainerRef() {
  return useAnimatedRef<ContainerRef>()
}

export function useAnimatedDynamicRefs(): [
  ContextType['refMap'],
  ContextType['setRef']
] {
  const [map, setMap] = useState<ContextType['refMap']>({})
  const setRef = useCallback((key: TabName, ref: AnimatedRef<RefComponent>) => {
    setMap((map) => ({ ...map, [key]: ref }))
    return ref
  }, [])

  return [map, setRef as ContextType['setRef']]
}

export function useTabProps<T extends TabName>(
  children: TabReactElement<T>[] | TabReactElement<T>,
  tabType: Function
): [TabsWithProps<T>, T[]] {
  const options = useMemo(() => {
    const tabOptions: TabsWithProps<T> = new Map()
    if (children) {
      Children.forEach(children, (element, index) => {
        if (!element) return

        if (element.type !== tabType)
          throw new Error(
            'Container children must be wrapped in a <Tabs.Tab ... /> component'
          )

        const { name, children, ...options } = element.props
        if (tabOptions.has(name))
          throw new Error(`Tab names must be unique, ${name} already exists`)

        tabOptions.set(name, {
          index,
          name,
          ...options
        })
      })
    }
    return tabOptions
  }, [children, tabType])
  const optionEntries = Array.from(options.entries())
  const optionKeys = Array.from(options.keys())
  const memoizedOptions = useDeepCompareMemo(() => options, [optionEntries])
  const memoizedTabNames = useDeepCompareMemo(() => optionKeys, [optionKeys])
  return [memoizedOptions, memoizedTabNames]
}

export function useTabsContext(): ContextType<TabName> {
  const c = useContext(Context)
  if (!c) throw new Error('useTabsContext must be inside a Tabs.Container')
  return c
}

export function useTabNameContext(): TabName {
  const c = useContext(TabNameContext)
  if (!c) throw new Error('useTabNameContext must be inside a TabNameContext')
  return c
}

export function useLayoutHeight(initialHeight: number = 0) {
  const [height, setHeight] = useState(initialHeight)

  const getHeight = useCallback(
    (event: LayoutChangeEvent) => {
      const latestHeight = event.nativeEvent.layout.height
      if (latestHeight !== height) {
        setHeight(latestHeight)
      }
    },
    [height, setHeight]
  )
  return [height, getHeight] as const
}
export function useCollapsibleStyle(): CollapsibleStyle {
  const {
    headerHeight,
    tabBarHeight,
    containerHeight,
    width,
    allowHeaderOverscroll,
    minHeaderHeight
  } = useTabsContext()
  const containerHeightWithMinHeader = Math.max(
    0,
    (containerHeight ?? 0) - minHeaderHeight
  )

  return useMemo(
    () => ({
      style: { width },
      contentContainerStyle: {
        minHeight:
          IS_IOS && !allowHeaderOverscroll
            ? containerHeightWithMinHeader - (tabBarHeight || 0)
            : containerHeightWithMinHeader + (headerHeight || 0),
        paddingTop:
          IS_IOS && !allowHeaderOverscroll
            ? 0
            : (headerHeight || 0) + (tabBarHeight || 0)
      },
      progressViewOffset:
        IS_IOS && allowHeaderOverscroll
          ? 0
          : (headerHeight || 0) + (tabBarHeight || 0)
    }),
    [
      allowHeaderOverscroll,
      headerHeight,
      tabBarHeight,
      width,
      containerHeightWithMinHeader
    ]
  )
}

export function useUpdateScrollViewContentSize({ name }: { name: TabName }) {
  const { tabNames, contentHeights } = useTabsContext()
  const setContentHeights = useCallback(
    (name: TabName, height: number) => {
      'worklet'
      const tabIndex = tabNames.value.indexOf(name)
      contentHeights.value[tabIndex] = height
      contentHeights.value = [...contentHeights.value]
    },
    [contentHeights, tabNames]
  )

  const scrollContentSizeChange = useCallback(
    (_: number, h: number) => {
      scheduleOnUI(setContentHeights, name, h)
    },
    [setContentHeights, name]
  )

  return scrollContentSizeChange
}

export function useChainCallback(fns: (Function | undefined)[]) {
  const callAll = useCallback(
    (...args: unknown[]) => {
      fns.forEach((fn) => {
        if (typeof fn === 'function') {
          fn(...args)
        }
      })
    },
    [fns]
  )
  return callAll
}

export function useScroller<T extends RefComponent>() {
  const { contentInset } = useTabsContext()

  const scroller = useCallback(
    (
      ref: AnimatedRef<T> | undefined,
      x: number,
      y: number,
      animated: boolean,
      _debugKey: string
    ) => {
      'worklet'
      if (!ref) return
      scrollToImpl(ref, x, y - contentInset, animated)
    },
    [contentInset]
  )

  return scroller
}

export const useScrollHandlerY = (name: TabName) => {
  const {
    accDiffClamp,
    focusedTab,
    snapThreshold,
    revealHeaderOnScroll,
    refMap,
    tabNames,
    headerHeight,
    contentInset,
    containerHeight,
    scrollYCurrent,
    scrollY,
    oldAccScrollY,
    accScrollY,
    offset,
    headerScrollDistance,
    snappingTo,
    contentHeights,
    indexDecimal,
    allowHeaderOverscroll
  } = useTabsContext()

  const enabled = useSharedValue(false)

  const scrollTo = useScroller()

  const enable = useCallback(
    (toggle: boolean) => {
      'worklet'
      enabled.value = toggle
    },
    [enabled]
  )

  const afterDrag = useSharedValue(0)

  const scrollAnimation = useSharedValue<number | undefined>(undefined)

  useAnimatedReaction(
    () => scrollAnimation.value,
    (val) => {
      if (val !== undefined) {
        scrollTo(refMap[name], 0, val, false, '[useAnimatedReaction scroll]')
      }
    }
  )

  const onMomentumEnd = () => {
    'worklet'
    if (!enabled.value) return

    if (typeof snapThreshold === 'number') {
      if (revealHeaderOnScroll) {
        if (accDiffClamp.value > 0) {
          if (
            scrollYCurrent.value >
            headerScrollDistance.value * snapThreshold
          ) {
            if (
              accDiffClamp.value <=
              headerScrollDistance.value * snapThreshold
            ) {
              accDiffClamp.value = withTiming(0)
            } else if (accDiffClamp.value < headerScrollDistance.value) {
              accDiffClamp.value = withTiming(headerScrollDistance.value)

              if (scrollYCurrent.value < headerScrollDistance.value) {
                scrollAnimation.value = scrollYCurrent.value
                scrollAnimation.value = withTiming(headerScrollDistance.value)
                //console.log('[${name}] sticky snap up')
              }
            }
          } else {
            accDiffClamp.value = withTiming(0)
          }
        }
      } else {
        if (
          scrollYCurrent.value <=
          headerScrollDistance.value * snapThreshold
        ) {
          snappingTo.value = 0
          scrollAnimation.value = scrollYCurrent.value
          scrollAnimation.value = withTiming(0)
          //console.log('[${name}] snap down')
        } else if (scrollYCurrent.value <= headerScrollDistance.value) {
          snappingTo.value = headerScrollDistance.value
          scrollAnimation.value = scrollYCurrent.value
          scrollAnimation.value = withTiming(headerScrollDistance.value)
          //console.log('[${name}] snap up')
        }
      }
    }
  }

  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        if (!enabled.value) return

        if (focusedTab.value === name) {
          if (IS_IOS) {
            let { y } = event.contentOffset
            y = y + contentInset

            const contentHeight =
              contentHeights.value[tabNames.value.indexOf(name)] ||
              Number.MAX_VALUE

            const clampMax =
              contentHeight - (containerHeight || 0) + contentInset
            scrollYCurrent.value = allowHeaderOverscroll
              ? y
              : interpolate(
                  y,
                  [0, clampMax],
                  [0, clampMax],
                  Extrapolation.CLAMP
                )
          } else {
            const { y } = event.contentOffset
            scrollYCurrent.value = y
          }

          scrollY.value[name] = scrollYCurrent.value
          oldAccScrollY.value = accScrollY.value
          accScrollY.value = scrollY.value[name] + offset.value

          if (revealHeaderOnScroll) {
            const delta = accScrollY.value - oldAccScrollY.value
            const nextValue = accDiffClamp.value + delta
            if (delta > 0) {
              accDiffClamp.value = Math.min(
                headerScrollDistance.value,
                nextValue
              )
            } else if (delta < 0) {
              accDiffClamp.value = Math.max(0, nextValue)
            }
          }
        }
      },
      onBeginDrag: () => {
        if (!enabled.value) return

        cancelAnimation(accDiffClamp)

        if (IS_IOS) cancelAnimation(afterDrag)
      },
      onEndDrag: () => {
        if (!enabled.value) return

        if (IS_IOS) {
          afterDrag.value = withDelay(
            ONE_FRAME_MS,
            withTiming(0, { duration: 0 }, (isFinished) => {
              if (isFinished) {
                onMomentumEnd()
              }
            })
          )
        }
      },
      onMomentumBegin: () => {
        if (!enabled.value) return

        if (IS_IOS) {
          cancelAnimation(afterDrag)
        }
      },
      onMomentumEnd
    },
    [
      refMap,
      name,
      revealHeaderOnScroll,
      containerHeight,
      contentInset,
      snapThreshold,
      enabled,
      scrollTo
    ]
  )

  useAnimatedReaction(
    () => {
      const isChangingPane = !Number.isInteger(indexDecimal.value)

      return isChangingPane
    },
    (isSyncNeeded, wasSyncNeeded) => {
      if (
        isSyncNeeded &&
        isSyncNeeded !== wasSyncNeeded &&
        focusedTab.value !== name
      ) {
        let nextPosition: number | null = null
        const focusedScrollY = scrollY.value[focusedTab.value]
        const tabScrollY = scrollY.value[name]
        const areEqual = focusedScrollY === tabScrollY

        if (!areEqual) {
          const currIsOnTop =
            tabScrollY + StyleSheet.hairlineWidth <= headerScrollDistance.value
          const focusedIsOnTop =
            focusedScrollY + StyleSheet.hairlineWidth <=
            headerScrollDistance.value

          if (revealHeaderOnScroll) {
            const hasGap = accDiffClamp.value > tabScrollY
            if (hasGap || currIsOnTop) {
              nextPosition = accDiffClamp.value
            }
          } else if (typeof snapThreshold === 'number') {
            if (focusedIsOnTop) {
              nextPosition = snappingTo.value
            } else if (currIsOnTop) {
              nextPosition = headerHeight || 0
            }
          } else if (currIsOnTop || focusedIsOnTop) {
            nextPosition = Math.min(focusedScrollY, headerScrollDistance.value)
          }
        }

        if (nextPosition !== null) {
          scrollY.value[name] = nextPosition
          scrollTo(refMap[name], 0, nextPosition, false, `[${name}] sync pane`)
        }
      }
    },
    [revealHeaderOnScroll, refMap, snapThreshold, enabled, scrollTo]
  )

  return { scrollHandler, enable }
}

type ForwardRefType<T> =
  | ((instance: T | null) => void)
  | MutableRefObject<T | null>
  | null

export function useSharedAnimatedRef<T extends RefComponent>(
  outerRef: ForwardRefType<T>
) {
  const ref = useAnimatedRef<T>()

  useEffect(() => {
    if (!outerRef) {
      return
    }
    const current = ref.current as T | null
    if (typeof outerRef === 'function') {
      outerRef(current)
    } else {
      outerRef.current = current
    }
  })

  return ref
}

export function useAfterMountEffect(
  nextOnLayout: ViewProps['onLayout'],
  effect: React.EffectCallback
) {
  const didExecute = useRef(false)
  const didMount = useSharedValue(false)

  useAnimatedReaction(
    () => {
      return didMount.value
    },
    (didMount, prevDidMount) => {
      if (didMount && !prevDidMount) {
        if (didExecute.current) return

        effect()
        didExecute.current = true
      }
    }
  )

  const onLayoutOut: NonNullable<ViewProps['onLayout']> = useCallback(
    (event: LayoutChangeEvent) => {
      requestAnimationFrame(() => {
        didMount.value = true
      })
      return nextOnLayout?.(event)
    },
    [didMount, nextOnLayout]
  )

  return onLayoutOut
}

export function useConvertAnimatedToValue<T>(animatedValue: SharedValue<T>) {
  const [value, setValue] = useState<T>(animatedValue.value)

  useAnimatedReaction(
    () => {
      return animatedValue.value
    },
    (animValue) => {
      if (animValue !== value) {
        scheduleOnRN(setValue, animValue)
      }
    },
    [value]
  )

  return value || 0
}

export interface HeaderMeasurements {
  top: SharedValue<number>
  height: number
}

export function useHeaderMeasurements(): HeaderMeasurements {
  const { headerTranslateY, headerHeight } = useTabsContext()
  return {
    top: headerTranslateY,
    height: headerHeight
  }
}

export function useCurrentTabScrollY(): SharedValue<number> {
  const { scrollYCurrent } = useTabsContext()
  return scrollYCurrent
}

export function useFocusedTab() {
  const { focusedTab } = useTabsContext()
  const focusedTabValue = useConvertAnimatedToValue(focusedTab)
  return focusedTabValue
}

export function useAnimatedTabIndex() {
  const { indexDecimal } = useTabsContext()
  return indexDecimal
}

export const usePageScrollHandler = (
  handlers: {
    onPageScroll: (
      event: PagerViewOnPageScrollEvent['nativeEvent'],
      context: unknown
    ) => unknown
  },
  dependencies?: unknown[]
) => {
  const { context, doDependenciesDiffer } = useHandler(handlers, dependencies)
  const subscribeForEvents = ['onPageScroll']

  return useEvent<any>(
    (event) => {
      'worklet'
      const { onPageScroll } = handlers
      if (onPageScroll && event.eventName.endsWith('onPageScroll')) {
        onPageScroll(event, context)
      }
    },
    subscribeForEvents,
    doDependenciesDiffer
  )
}
