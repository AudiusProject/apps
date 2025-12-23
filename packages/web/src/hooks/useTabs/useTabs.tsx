import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  ReactNode,
  memo,
  useMemo,
  CSSProperties,
  RefObject,
  Ref,
  createRef
} from 'react'

import { useInstanceVar } from '@audius/common/hooks'
import { Text, Tooltip } from '@audius/harmony'
import { disableBodyScroll, clearAllBodyScrollLocks } from 'body-scroll-lock'
import cn from 'classnames'
import { throttle } from 'lodash'
// eslint-disable-next-line no-restricted-imports
import { animated, useTransition, useSpring } from 'react-spring'
import { useDrag } from 'react-use-gesture'

import { SeoLink } from 'components/link'

import styles from './TabStyles.module.css'
const animatedAny = animated as any

export type TabHeader = {
  icon?: ReactNode
  text: string
  label: string
  disabled?: boolean
  disabledTooltipText?: string
  to?: string
}

type TabProps = {
  onClick: () => void
  isActive: boolean
  isMobile: boolean
  isMobileV2: boolean
  icon?: ReactNode
  text: string
  label: string
  disabled: boolean
}

const Tab = forwardRef(
  (
    { onClick, icon, text, isActive, isMobile, isMobileV2, disabled }: TabProps,
    ref?: Ref<HTMLDivElement>
  ) => (
    <div
      className={cn(
        styles.tab,
        { [styles.tabMobile]: isMobile },
        { [styles.tabMobileV2]: isMobileV2 },
        { [styles.tabDesktop]: !isMobile && !isMobileV2 },
        { [styles.tabActive]: isActive },
        { [styles.tabDisabled]: disabled }
      )}
      onClick={() => !disabled && onClick?.()}
      ref={ref}
    >
      {icon && <div className={styles.icon}>{icon}</div>}
      {isMobile ? (
        <Text variant='body' size='xs' strength='strong' color='inherit'>
          {text}
        </Text>
      ) : isMobileV2 ? (
        <Text variant='body' strength='strong' color='inherit'>
          {text}
        </Text>
      ) : (
        <Text variant='title' color='inherit'>
          {text}
        </Text>
      )}
    </div>
  )
)

const TabAccent = ({ style }: { style: any }) => (
  <animatedAny.div className={styles.tabAccent} style={style} />
)

// How much the tab accent should horizontally stretch
// while it translates for a nice effect.
const ACCENT_STRETCH_FACTOR = 0.35

const interpPx = (x: number) => `${x}px`

type TabBarProps = {
  activeIndex: number
  tabs: TabHeader[]
  onClick: (index: number) => void
  shouldAnimate: boolean
  isMobile: boolean
  isMobileV2: boolean
  disabledTabTooltipText?: string
  // Offset the tab to the left or right.
  // offset of 1 offsets 1 tab to the right,
  // offset of -1 to the left.
  // Used to track in progress gestures.
  fractionalOffset?: number
  pathname?: string
}

const TabBar = memo(
  ({
    activeIndex,
    tabs,
    onClick,
    isMobile,
    isMobileV2,
    disabledTabTooltipText,
    fractionalOffset = 0,
    pathname
  }: TabBarProps) => {
    const [accentPosition, setAccentPosition] = useState({
      top: 0,
      left: 0,
      width: 0
    })
    const [getDidPositionTab, setDidPositionTab] = useInstanceVar(false)

    const refsArr = useRef<any[]>([])

    if (!refsArr.current || !refsArr.current.length) {
      tabs.forEach(() => refsArr.current.push(createRef()))
    }

    // @ts-ignore
    const [{ top, left, width }, setAccentProps] = useSpring(() => ({
      to: { top: 0, left: 0, width: 0 },
      immediate: true,
      config: {
        mass: 1,
        tension: 300,
        friction: 32,
        clamp: true
      }
    }))

    const resizeTabs = useCallback(() => {
      const tabRef = refsArr.current[activeIndex]?.current
      if (!tabRef) return
      const {
        clientWidth: width,
        clientHeight: height,
        offsetLeft,
        offsetTop
      } = tabRef
      const newTop = offsetTop + height
      let newLeft = offsetLeft

      // Calculate how much to offset the position by if we're mid gesture.
      const gestureOffset = (() => {
        const movingLeft = fractionalOffset > 0
        // Don't move the tab accent if we're moving off the end of the tabs
        if (movingLeft && activeIndex === 0) return 0
        if (!movingLeft && activeIndex === tabs.length - 1) return 0
        const destIndex = movingLeft ? activeIndex - 1 : activeIndex + 1
        const destTabRef = refsArr.current[destIndex]
        if (!destTabRef) return
        const destTab = destTabRef.current

        const destDeltaX = Math.abs(destTab.offsetLeft - tabRef.offsetLeft)
        return destDeltaX * fractionalOffset * -1
      })()

      newLeft += gestureOffset
      if (
        newTop === accentPosition.top &&
        newLeft === accentPosition.left &&
        width === accentPosition.width
      ) {
        return
      }

      setAccentPosition({
        top: newTop,
        left: newLeft,
        width
      })

      const accentTransforms = {
        top: newTop,
        left: newLeft,
        width
      }

      const immediate = !getDidPositionTab()
      setAccentProps({ to: accentTransforms, immediate })
      setDidPositionTab(true)
    }, [
      activeIndex,
      accentPosition,
      fractionalOffset,
      getDidPositionTab,
      setAccentProps,
      setDidPositionTab,
      tabs
    ])

    // If we resize the window we'd better resposition
    // the accent.
    useEffect(() => {
      window.addEventListener('resize', resizeTabs)
      return () => {
        window.removeEventListener('resize', resizeTabs)
      }
    })

    useEffect(() => {
      resizeTabs()
    }, [activeIndex, tabs, resizeTabs, fractionalOffset])

    // Stretchy effect while translating.
    // Ask Michael to explain this if necessary.
    const interpolateScale = (x: number) => {
      const [first, second] = [
        refsArr.current[0].current,
        refsArr.current[1].current
      ]
      if (!(first && second)) {
        return 'scale(1, 1)'
      }
      const distanceBetweenTabs = second.offsetLeft - first.offsetLeft
      const absOffset = (x - first.offsetLeft) % distanceBetweenTabs
      const fracOffset = absOffset / distanceBetweenTabs
      const scaleX = Math.max(
        1,
        Math.sin(fracOffset * Math.PI) * ACCENT_STRETCH_FACTOR + 1
      )
      return `scale(${scaleX}, 1)`
    }

    return (
      <div
        className={cn(
          styles.tabBarContainer,
          { [styles.tabBarContainerMobile]: isMobile },
          { [styles.tabBarContainerMobileV2]: isMobileV2 },
          { [styles.tabBarContainerDesktop]: !isMobile && !isMobileV2 }
        )}
        role='tablist'
      >
        <TabAccent
          style={{
            top: top.interpolate(interpPx),
            left: left.interpolate(interpPx),
            width: width.interpolate(interpPx),
            transform: left.interpolate(interpolateScale)
          }}
        />
        {tabs.map((tab, i) => {
          const isActive = activeIndex === i
          const tooltipActive =
            (!!disabledTabTooltipText || !!tab.disabledTooltipText) &&
            tab.disabled

          const tabElement = (
            <Tab
              onClick={() => onClick(i)}
              ref={refsArr.current[i]}
              isActive={isActive}
              key={tab.label}
              isMobile={isMobile}
              isMobileV2={isMobileV2}
              disabled={!!tab.disabled}
              icon={tab.icon}
              label={tab.label}
              text={tab.text}
            />
          )

          const { to } = tab

          const rootProps = {
            role: 'tab',
            className: cn(styles.tabWrapper, {
              [styles.tabWrapperMobile]: isMobile
            })
          }

          return (
            <Tooltip
              text={tab.disabledTooltipText || disabledTabTooltipText}
              placement='bottom'
              disabled={!tooltipActive}
              key={i}
            >
              {to && pathname ? (
                <SeoLink {...rootProps} to={`${pathname}/${to}`}>
                  {tabElement}
                </SeoLink>
              ) : (
                <div {...rootProps}>{tabElement}</div>
              )}
            </Tooltip>
          )
        })}
      </div>
    )
  }
)

const elementContainerStyle = {
  position: 'absolute' as const,
  width: '100%'
}

const useContainerDimensions = (
  activeIndex: number,
  dimensionsAreDirty?: boolean
): {
  containerWidth: number
  containerHeight: number
  containerCallbackRef: (node: HTMLDivElement) => void
  elementCallbackRef: (node: HTMLDivElement) => void
} => {
  // Compute width from container
  const containerRef = useRef<HTMLDivElement | null>(null)
  const elementRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(window.outerWidth)
  const [containerHeight, setContainerHeight] = useState(0)
  const updateSize = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth)
    }
    let height
    if (elementRef.current) {
      height = elementRef.current.clientHeight
    } else {
      height = window.innerHeight
    }

    setContainerHeight(height)
  }, [elementRef])

  const containerCallbackRef = useCallback(
    (node: HTMLDivElement) => {
      if (node) {
        containerRef.current = node
        updateSize()
      }
    },
    [updateSize]
  )

  const elementCallbackRef = useCallback(
    (node: HTMLDivElement) => {
      if (node) {
        elementRef.current = node
        updateSize()
      }
    },
    [updateSize]
  )

  // Listen to changes in container width
  // to compute scroll distance
  useEffect(() => {
    window.addEventListener('resize', updateSize)
    updateSize()
    return window.removeEventListener('resize', updateSize)
  }, [updateSize, activeIndex, dimensionsAreDirty])

  return {
    containerWidth,
    containerHeight,
    containerCallbackRef,
    elementCallbackRef
  }
}

type BodyContainerProps = {
  activeIndex: number
  setActiveIndex: (updater: (index: number) => number) => void
  onChangeComplete: (oldIndex: number, to: number) => void
  elements: ReactNode[]
  containerStyle: CSSProperties
  elementStyle: CSSProperties
  containerClassName?: string
  elementClassName?: string
  shouldAnimate: boolean
  lastActive: number
  didTransitionCallback: () => void
  isMobile: boolean
  isMobileV2: boolean
  interElementSpacing: number

  // If container dimensions are dirty and need a resize.
  dimensionsAreDirty: boolean
  didSetDimensions: () => void

  setTabBarFractionalOffset: (offset: number) => void

  // The intitial scroll offset height to adjust the window to on transition
  initialScrollOffset: number
}

// GestureSupportingBodyContainer Constants

// If we're gesturing within SNAPBACK_RATIO * containerWidth of the
// tab we're gesturing from, snap back to the tab.
const SNAPBACK_RATIO = 0.3

// How fast we need to be going to move to the next tab in a gesture.
const ESCAPE_VELOCITY = 0.5

const interpX = (x: number) => `translate3d(${x}px, 0, 0)`
const animConfig = {
  mass: 1,
  tension: 450,
  friction: 38
}

// GestureSupportingBodyContainer works by wrapping all of it's children
// in a single animated div and translating that div. It tries to obey
// the injected activeIndex value like a good controlled component,
// but in the case of a gesture it has to temporarily
// control it's own animations. It eventually calls setActiveIndex when the
// gesture terminates to keep the system consistent.
const GestureSupportingBodyContainer = memo(
  ({
    activeIndex,
    setActiveIndex,
    onChangeComplete,
    elements,
    containerStyle,
    containerClassName,
    setTabBarFractionalOffset,
    dimensionsAreDirty,
    didSetDimensions,
    initialScrollOffset,
    isMobile
  }: BodyContainerProps) => {
    const { containerWidth, containerCallbackRef, elementCallbackRef } =
      useContainerDimensions(activeIndex, dimensionsAreDirty)

    if (dimensionsAreDirty) {
      didSetDimensions()
    }

    // State

    // Tracks our last seen activeIndex.
    const [internalIndex, setInternalIndex] = useState(activeIndex)

    // Instance Vars

    // The difference between injected activeIndex and internalIndex.
    // 0 means no movement, < 0 moving to left tab, > 0 right tab.
    const [getIndexDelta, setIndexDelta] = useInstanceVar(0)
    // Whether there's a current gesture
    // Needs to be an instance var so onRest doesn't capture it
    const [getGestureInProgress, setGestureInProgress] = useInstanceVar(false)
    // Our scroll position
    const [getScrollPos, setScrollPos] = useInstanceVar(0)
    // -1 left, 0 stationary, 1 right
    const [movementDirection, setMovementDirection] = useState(0)
    // Hold onto some transition info state to callback in onRest
    const [getTransitionInfo, setTransitionInfo] = useInstanceVar({
      from: 0,
      to: 0
    })
    // Need to know if there's ongoing animations to know when
    // to squash the heights in render
    const [isOngoingAnimation, setIsOngoingAnimation] = useState(false)

    const [getCachedIndices, setCachedIndicies] = useInstanceVar(new Set())

    const snapbackInterval = containerWidth * SNAPBACK_RATIO

    // Throttle the callbacks to set the tab accent for performance.
    const throttledSetTabBarOffset = useMemo(
      () => throttle(setTabBarFractionalOffset, 150),
      [setTabBarFractionalOffset]
    )

    const onFrame = useCallback(
      (frame: any) => {
        setScrollPos(frame.x)
      },
      [setScrollPos]
    )

    // When an animation finishes, sync up
    // the internalIndex with activeIndex and
    // reset the delta.
    const onRest = useCallback(() => {
      if (getGestureInProgress()) return
      const { from, to } = getTransitionInfo()
      if (from === to) return
      onChangeComplete(from, to)
      setInternalIndex((i) => i + getIndexDelta())
      setIndexDelta(0)
      setTransitionInfo({ from: 0, to: 0 })
      setIsOngoingAnimation(false)
    }, [
      getGestureInProgress,
      getIndexDelta,
      getTransitionInfo,
      onChangeComplete,
      setIndexDelta,
      setTransitionInfo
    ])
    const [scrollContainerProps, setScrollContainerProps] = useSpring(() => ({
      to: {
        x: -1 * activeIndex * containerWidth // Account for starting out on non-zero tab index
      },
      config: animConfig,
      onRest,
      onFrame
    }))

    useEffect(() => {
      setScrollContainerProps({
        to: {
          x: -1 * activeIndex * containerWidth // Account for starting out on non-zero tab index
        },
        config: animConfig,
        onRest,
        onFrame
      })
    }, [activeIndex, containerWidth, onFrame, onRest, setScrollContainerProps])

    const setScrollContainerX = (x: number, immediate: boolean) => {
      setScrollContainerProps({
        to: { x },
        immediate,
        config: animConfig
      })
    }

    // If the active index has changed, either because
    // we've clicked a new tab or finished a gesture,
    // begin animations and track the index delta.
    // We have to track the delta as opposed to the last seen
    useEffect(() => {
      const newIndexDelta = activeIndex - internalIndex
      if (newIndexDelta !== getIndexDelta()) {
        // If newIndexDelta !== 0, that means we're starting a
        // new transition from a tab click, so remember it
        // for onRest.
        if (newIndexDelta !== 0) {
          setTransitionInfo({ from: internalIndex, to: activeIndex })
          setIsOngoingAnimation(true)
        }
        setIndexDelta(newIndexDelta)
        setScrollContainerX(-1 * activeIndex * containerWidth, false)
        window.scrollTo(0, initialScrollOffset)
      }
      // Disable exhaustive deps because we only need to run this if the active index has changed:
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeIndex, internalIndex])

    const isMovingLeft = (x: number) => x < -1 * containerWidth * activeIndex

    const rootElement = document.querySelector('#root')
    const bind = useDrag(
      ({ last, first, vxvy: [vx], movement: [mx] }) => {
        // Filter out 'empty' gestures.
        // For some reason, setting `filterTaps: true` or setting a threshold
        // doesnt do this.
        // If it's the first gesture and there's no vx, or if it's the last gesture
        // and we never set a gestureInProgress (because there was never vx),
        // filter it.
        if ((first && !vx) || (last && !getGestureInProgress())) {
          return
        }

        // disable body scrolling
        if (first && rootElement) {
          disableBodyScroll(rootElement)
        }
        if (last) {
          clearAllBodyScrollLocks()
        }

        // Only set a new gesture if we're actually moving.
        // Sometimes useDrag fires with 0 vx
        if (vx && !getGestureInProgress()) {
          setGestureInProgress(true)
          setIsOngoingAnimation(true)
        }

        // Figure out which direction we're gesturing
        const movingLeft = isMovingLeft(mx)

        // Store out movementDirection in state to trigger a rerender
        const newMovementDirection = movingLeft ? -1 : 1
        if (newMovementDirection !== movementDirection) {
          setMovementDirection(newMovementDirection)
        }

        if (last) {
          // Reset state
          // @ts-ignore: cancelable but the hook swallows that type
          throttledSetTabBarOffset.cancel()
          setTabBarFractionalOffset(0)

          // See if our velocity takes us to the next tab. Return early.
          if (Math.abs(vx) >= ESCAPE_VELOCITY) {
            let indexAdjustment = 0
            if (movingLeft && activeIndex < elements.length - 1) {
              indexAdjustment = 1
            } else if (!movingLeft && activeIndex > 0) {
              indexAdjustment = -1
            }

            if (indexAdjustment) {
              setActiveIndex((i) => i + indexAdjustment)
              setGestureInProgress(false)
              setMovementDirection(0)
              setTransitionInfo({
                from: activeIndex,
                to: activeIndex + indexAdjustment
              })
              window.scrollTo(0, initialScrollOffset)
              return
            }
          }

          // Figure out which tab we should end up at, setting active index.
          // We generate 'breakpoints' and see if we're within
          // snapbackInterval of them. The calculation
          // changes depending on your direction.
          const positiveX = -1 * mx
          let newActiveIndex = activeIndex
          for (let i = 0; i < elements.length - 1; i++) {
            const break1 = i * containerWidth
            const break2 = (i + 1) * containerWidth

            // If we've gesturing left, the snapback interval can be thought of as
            // to the right of the breakpoints, and we're trying to increment active index.
            // Opposite logic for gesturing right.
            if (movingLeft) {
              if (
                positiveX > break1 + snapbackInterval &&
                positiveX <= break2
              ) {
                newActiveIndex = i + 1
                break
              }
            } else if (
              positiveX < break2 - snapbackInterval &&
              positiveX >= break1
            ) {
              newActiveIndex = i
              break
            }
          }

          // Did we go anywhere?
          if (newActiveIndex === activeIndex) {
            // Return home
            const home = -1 * activeIndex * containerWidth
            setScrollPos(home)
            setScrollContainerX(home, false)
          } else {
            // Set new active index and let
            // the regular animations take us there.
            setActiveIndex((_) => newActiveIndex)
            window.scrollTo(0, initialScrollOffset)
            setTransitionInfo({ from: activeIndex, to: newActiveIndex })
          }
          setGestureInProgress(false)
          setMovementDirection(0)
        } else if (!first) {
          // Track the gesture
          setScrollContainerX(mx, true)
          setScrollPos(mx)

          // Get the fractional offset
          const oldScrollPos = activeIndex * containerWidth
          const scrollDelta = mx * -1 - oldScrollPos
          const fractionalOffset = (-1 * scrollDelta) / containerWidth
          throttledSetTabBarOffset(fractionalOffset)
        }
      },
      {
        axis: 'x',
        initial: () => [getScrollPos(), 0],
        filterTaps: true,
        bounds: {
          left: -1 * (elements.length - 1) * containerWidth,
          right: 0,
          top: 0,
          bottom: 0
        },
        rubberband: 0.3
      }
    )

    return (
      <div
        className={cn(
          styles.bodyContainer,
          styles.gestureContainer,
          containerClassName
        )}
        ref={containerCallbackRef}
        style={containerStyle as CSSProperties}
      >
        <animatedAny.div
          className={styles.elementScrollContainer}
          {...bind()}
          style={{
            // @ts-ignore
            transform: scrollContainerProps.x.interpolate(interpX),
            width: containerWidth * elements.length
          }}
        >
          {(() => {
            let nextIndex = -1
            if (internalIndex !== activeIndex) {
              nextIndex = internalIndex
            } else if (getGestureInProgress()) {
              nextIndex = movementDirection * -1 + activeIndex
            }

            return elements.map((e, i) => {
              // Cache indices we've seen before so subsequent tab switches are faster
              const shouldRender =
                i === activeIndex ||
                i === nextIndex ||
                getCachedIndices().has(i)

              if (shouldRender) {
                setCachedIndicies((s) => s.add(i))
              }

              // If we're not transitioning, set
              // non-visible elements to 1px height so they don't
              // impact scrolling behavior. For some reason setting to 0px
              // breaks touch events in iOS *facepalm*
              const style: CSSProperties = {
                width: containerWidth,
                height:
                  !isOngoingAnimation && i !== activeIndex ? '1px' : 'auto'
              }

              return (
                <div
                  key={`tab-${i}`}
                  ref={i === activeIndex ? elementCallbackRef : undefined}
                  style={style}
                  className={cn(styles.elementWrapper, {
                    [styles.isDragging]: getGestureInProgress()
                  })}
                >
                  {shouldRender && e}
                </div>
              )
            })
          })()}
        </animatedAny.div>
      </div>
    )
  }
)

const BodyContainer = memo(
  ({
    activeIndex,
    elements,
    containerStyle,
    elementStyle,
    elementClassName,
    containerClassName,
    shouldAnimate,
    lastActive,
    didTransitionCallback,
    isMobile,
    interElementSpacing,
    dimensionsAreDirty,
    didSetDimensions
  }: BodyContainerProps) => {
    // Get a ref to the element to use for calculating height
    const {
      containerWidth,
      containerHeight,
      containerCallbackRef,
      elementCallbackRef
    } = useContainerDimensions(activeIndex, dimensionsAreDirty)

    // NOTE: the active transition is set to -1 to account for the initial transition
    const [activeTransitions, setActiveTransitions] = useState(-1)
    // NOTE: The height of the parent container must be at least the hight of its tallest
    // child element so that while transitioning the content is not cut off.
    const [transitionContainerHeight, setTransitionContainerHeight] =
      useState(containerHeight)
    useEffect(() => {
      if (activeTransitions > 0) {
        setTransitionContainerHeight(
          Math.max(transitionContainerHeight, containerHeight)
        )
      } else if (activeTransitions === 0) {
        setTransitionContainerHeight(containerHeight)
      }

      didSetDimensions()
    }, [
      activeTransitions,
      containerHeight,
      transitionContainerHeight,
      dimensionsAreDirty,
      didSetDimensions
    ])

    const transitions = useTransition(activeIndex, null, {
      leave: (_: any) => {
        const movingToLeft = activeIndex > lastActive
        return {
          transform: `translate3d(${movingToLeft ? '-' : ''}${
            containerWidth + interElementSpacing
          }px, 0px, 0px)`,
          opacity: 0
        }
      },
      enter: (_: any) => {
        setActiveTransitions((t) => t + 1)
        return {
          transform: 'translate3d(0px, 0px, 0px)',
          opacity: 1
        }
      },
      from: (_: any) => {
        return {
          transform: shouldAnimate
            ? `translate3d(${activeIndex > lastActive ? '' : '-'}${
                containerWidth + interElementSpacing
              }px, 0px, 0px)`
            : 'translate3d(0px, 0px, 0px)',
          opacity: shouldAnimate ? (isMobile ? 1 : 0.3) : 1
        }
      },
      onDestroyed: () => {
        setActiveTransitions((t) => t - 1)
        didTransitionCallback()
      },
      config: (key) => {
        return isMobile
          ? {} // use default config for mobile
          : key === activeIndex
            ? {
                mass: 1,
                tension: 380,
                friction: 40,
                clamp: true
              }
            : {
                duration: 1
              }
      }
    })

    return (
      <div
        className={cn(
          styles.bodyContainer,
          styles.bodyContainerDesktop,
          containerClassName
        )}
        ref={containerCallbackRef}
        style={{
          height: `${transitionContainerHeight}px`,
          ...(containerStyle as object)
        }}
      >
        {transitions.map(({ item, props, key }) => (
          <animatedAny.div
            key={key}
            style={{
              ...(props as any),
              ...elementContainerStyle,
              ...elementStyle
            }}
            ref={elementCallbackRef}
            className={cn(styles.elementWrapper, elementClassName)}
          >
            {elements[item]}
          </animatedAny.div>
        ))}
      </div>
    )
  }
)

type TabRecalculator = {
  recalculate: () => void
  _setRecalculateFunc: (recalculateFunc: () => void) => void
}

export const useTabRecalculator = (): TabRecalculator => {
  // eslint-disable-next-line
  const [getTabRecalculator, setTabRecalculator] = useInstanceVar<{
    recalculator: (() => void) | null
  }>({ recalculator: null })

  const recalculator = useMemo(
    () => ({
      // Call `recalculate` to force tabs to manually recalculate.
      recalculate: () => {
        setImmediate(() => {
          const { recalculator } = getTabRecalculator()
          if (!recalculator) return
          recalculator()
        })
      },

      // Private method, called by useTabs.
      _setRecalculateFunc: (recalculateFunc: () => void) => {
        setTabRecalculator({ recalculator: recalculateFunc })
      }
    }),
    [getTabRecalculator, setTabRecalculator]
  )

  return recalculator
}

type UseTabsArguments = {
  tabs: TabHeader[]
  elements: ReactNode[]
  onTabClick?: (label: string) => void
  didChangeTabsFrom?: (label: string, to: string) => void
  bodyClassName?: string
  elementClassName?: string
  isMobile?: boolean
  isMobileV2?: boolean

  // Optionally allow useTabs to be a controlled component
  selectedTabLabel?: string

  // Optionally start on a particular tab
  initialTab?: string

  didTransitionCallback?: () => void

  // useFullWidthTransitions allows
  // you to have the transition animation take place
  // over a wider width than the individual transitioning elements.
  useFullWidthTransitions?: {
    // The max width of the internal transitioning element
    maxElementWidth: number

    // Allow the possibility to transition over a wider witdth than
    // provided by the width of the ref (e.g. if the ref has margins/padding)
    extraContainerWidth: number
  }

  // Extra spacing to add between elements
  interElementSpacing?: number

  // Optional text to display as a tooltip on hover over disabled tabs.
  // If left undefined, no tooltip will be shown.
  disabledTabTooltipText?: string

  tabRecalculator?: TabRecalculator

  // The intitial scroll offset height to adjust the window to on transition
  initialScrollOffset?: number
  // The base pathname url of the page to determine tab navigation
  pathname?: string
}

type UseTabsResult = {
  tabs: JSX.Element
  body: JSX.Element

  // Plug this ref into the object you with to
  // have a full width transition in.
  fullWidthContainerRef: RefObject<HTMLDivElement | null>

  // Manually recalculate body dimensions.
  // You shouldn't need this except in rare circumstances.
  //
  // One such circumstance is tabs elements with dynamically
  // changing heights - if the height of an element changes
  // after mount, the tab system won't know to resize the body
  // automatically.
  recalculateDimensions: () => void
}

const useTabs = ({
  tabs,
  elements,
  didChangeTabsFrom,
  didTransitionCallback,
  onTabClick: onTabClickCb,
  selectedTabLabel,
  initialTab,
  useFullWidthTransitions,
  bodyClassName,
  elementClassName,
  isMobile = true,
  isMobileV2 = false,
  interElementSpacing = 0,
  disabledTabTooltipText,
  tabRecalculator,
  initialScrollOffset = 0,
  pathname
}: UseTabsArguments): UseTabsResult => {
  if (tabs.length !== elements.length)
    throw new Error('Non-matching number of tabs and elements')

  const isControlled = !!selectedTabLabel

  // Set up full width transitions
  const fullWidthContainerRef = useRef<HTMLDivElement>(null)

  const [computedBodyStyle, computedElementStyle] = useMemo(() => {
    let computedBodyStyle = {}
    let computedElementStyle = {}

    if (useFullWidthTransitions) {
      const pageWidth = fullWidthContainerRef.current
        ? fullWidthContainerRef.current.clientWidth
        : 0
      const maxInnerWidth = useFullWidthTransitions.maxElementWidth
      const extraWidth = useFullWidthTransitions.extraContainerWidth

      // Find the difference between the transitionable area width
      // and element width
      const margin = pageWidth - extraWidth * 2 - maxInnerWidth

      const leftOffset = margin / 2 + extraWidth

      computedBodyStyle = {
        ...computedBodyStyle,
        width: `${pageWidth}px`,
        left: `-${leftOffset}px`,
        display: 'flex',
        justifyContent: 'center'
      }

      computedElementStyle = {
        ...computedElementStyle,
        maxWidth: `${useFullWidthTransitions.maxElementWidth}px`
      }
    }

    return [computedBodyStyle, computedElementStyle]
  }, [useFullWidthTransitions])

  // Find the starting index
  const controlledIndex = isControlled
    ? tabs.findIndex((t) => t.label === selectedTabLabel)
    : initialTab
      ? tabs.findIndex((t) => t.label === initialTab)
      : 0
  const [activeIndex, setActiveIndex] = useState(controlledIndex)

  const onChangeComplete = useCallback(
    (oldIndex: number, to: number) => {
      const [previousLabel, currentLabel] = [
        tabs[oldIndex].label,
        tabs[to].label
      ]
      didChangeTabsFrom && didChangeTabsFrom(previousLabel, currentLabel)
    },
    [tabs, didChangeTabsFrom]
  )

  // If controlled and the injected tab changed, set a new activeIndex
  if (isControlled && controlledIndex !== activeIndex) {
    setActiveIndex(controlledIndex)
  }

  // Store lastActive to know which direction we're
  // transitioning
  const [lastActive, setLastActive] = useState(activeIndex)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  // Animate the thing if we've either gestured, or if we've moved
  // to a new tab via clicking a tab.
  const [accentFractionalOffset, setAccentFractionalOffset] = useState(0)
  if (
    !shouldAnimate &&
    (lastActive !== activeIndex || accentFractionalOffset !== 0)
  ) {
    setShouldAnimate(true)
  }

  // If we get new tabs, we need to reset the active index
  const [getPrevTabs, setPrevTab] = useInstanceVar(tabs)
  if (tabs.length !== getPrevTabs().length) {
    // After adding new tabs, the active index should be whatever active index
    // is currently in state or the controlled index if provided
    let index
    if (controlledIndex) index = controlledIndex
    else index = activeIndex
    const newTab = Math.max(0, Math.min(index, tabs.length - 1))
    // Set active index and last active index so that no animation is
    // triggered.
    setActiveIndex(newTab)
    setLastActive(newTab)
  }
  setPrevTab(tabs)

  useEffect(() => {
    if (lastActive !== activeIndex) {
      setLastActive(activeIndex)
    }
  }, [activeIndex, lastActive])

  // Handle manual dimension recalculation
  const [dimensionsAreDirty, setDimensionsAreDirty] = useState(false)
  // Callback passed out of useTabs to clients
  const recalculateDimensions = useCallback(
    () => setDimensionsAreDirty(true),
    []
  )
  // Callback passed into bodyContainer
  const didSetDimensions = useCallback(() => setDimensionsAreDirty(false), [])

  if (tabRecalculator) {
    tabRecalculator._setRecalculateFunc(recalculateDimensions)
  }

  // TODO: Add isMobileV2 to the condition and fix the bugs with scrolling
  const BodyContainerElement = isMobile
    ? GestureSupportingBodyContainer
    : BodyContainer
  const emptyDidTransitionCallback = useCallback(() => {}, [])

  const onTabClick = useCallback(
    (newIndex: number) => {
      if (isControlled) {
        onChangeComplete(activeIndex, newIndex)
        onTabClickCb && onTabClickCb(tabs[newIndex].label)
        return
      }

      // On mobile, onChangeComplete gets fired
      // when the animation finishes. On desktop, it's fired
      // immediately
      setActiveIndex(newIndex)
      !isMobile && !isMobileV2 && onChangeComplete(activeIndex, newIndex)
      onTabClickCb && onTabClickCb(tabs[newIndex].label)
    },
    [
      isControlled,
      isMobile,
      isMobileV2,
      onChangeComplete,
      activeIndex,
      onTabClickCb,
      tabs
    ]
  )

  const tabBarKey = tabs.map((t) => t.label).join('-')

  const MemoizedTabBar = useMemo(
    () => (
      <TabBar
        key={tabBarKey}
        activeIndex={activeIndex}
        tabs={tabs}
        onClick={onTabClick}
        shouldAnimate={shouldAnimate}
        isMobile={isMobile}
        isMobileV2={isMobileV2}
        disabledTabTooltipText={disabledTabTooltipText}
        fractionalOffset={accentFractionalOffset}
        pathname={pathname}
      />
    ),
    [
      activeIndex,
      tabBarKey,
      tabs,
      onTabClick,
      shouldAnimate,
      isMobile,
      isMobileV2,
      disabledTabTooltipText,
      accentFractionalOffset,
      pathname
    ]
  )

  const MemoizedBodyContainer = useMemo(
    () => (
      <BodyContainerElement
        activeIndex={activeIndex}
        elements={elements}
        containerStyle={computedBodyStyle}
        elementStyle={computedElementStyle}
        containerClassName={bodyClassName}
        elementClassName={elementClassName}
        shouldAnimate={shouldAnimate}
        lastActive={lastActive}
        didTransitionCallback={
          didTransitionCallback || emptyDidTransitionCallback
        }
        isMobile={isMobile}
        isMobileV2={isMobileV2}
        interElementSpacing={interElementSpacing}
        dimensionsAreDirty={dimensionsAreDirty}
        didSetDimensions={didSetDimensions}
        setActiveIndex={setActiveIndex}
        onChangeComplete={onChangeComplete}
        setTabBarFractionalOffset={setAccentFractionalOffset}
        initialScrollOffset={initialScrollOffset}
      />
    ),
    [
      activeIndex,
      elements,
      computedBodyStyle,
      computedElementStyle,
      bodyClassName,
      elementClassName,
      shouldAnimate,
      lastActive,
      didTransitionCallback,
      emptyDidTransitionCallback,
      isMobile,
      isMobileV2,
      interElementSpacing,
      dimensionsAreDirty,
      didSetDimensions,
      setActiveIndex,
      onChangeComplete,
      setAccentFractionalOffset,
      initialScrollOffset,
      BodyContainerElement
    ]
  )

  return {
    tabs: MemoizedTabBar,
    body: MemoizedBodyContainer,
    fullWidthContainerRef,
    recalculateDimensions
  }
}

export default useTabs
