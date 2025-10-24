import type { ComponentType, ReactNode } from 'react'
import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react'

import type {
  GestureResponderEvent,
  ImageSourcePropType,
  LayoutChangeEvent,
  PanResponderGestureState,
  ViewStyle
} from 'react-native'
import {
  Keyboard,
  Animated,
  PanResponder,
  Platform,
  TouchableWithoutFeedback,
  View
} from 'react-native'
import type { Edge } from 'react-native-safe-area-context'
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context'

import type { IconComponent } from '@audius/harmony-native'
import { makeStyles } from 'app/styles'
import { attachToDy } from 'app/utils/animation'

import { DrawerHeader } from './DrawerHeader'
import { FULL_DRAWER_HEIGHT } from './constants'

const MAX_SHADOW_OPACITY = 0.15
const ON_MOVE_RESPONDER_DY = 10
const MOVE_CUTOFF_CLOSE = 0.8
const BORDER_RADIUS = 40
const BACKGROUND_OPACITY = 0.5

// Controls the amount of friction in swiping when overflowing up or down
const OVERFLOW_FRICTION = 4

export const useStyles = makeStyles(({ palette }) => ({
  drawer: {
    backgroundColor: palette.white,
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    shadowRadius: 15,
    borderTopRightRadius: BORDER_RADIUS,
    borderTopLeftRadius: BORDER_RADIUS,
    overflow: 'hidden'
  },
  fullDrawer: {
    top: 0,
    height: '100%'
  },
  content: {
    height: 'auto'
  },
  fullScreenContent: {
    height: '100%'
  },
  dismissContainer: {
    position: 'absolute',
    top: 24,
    left: 24
  },
  backgroundRoot: {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '100%'
  },
  background: {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '100%',
    backgroundColor: 'black'
  },
  skirt: {
    backgroundColor: palette.neutralLight10,
    width: '100%',
    height: 800
  }
}))

export enum DrawerAnimationStyle {
  STIFF = 'STIFF',
  SPRINGY = 'SPRINGY'
}

export type DrawerProps = {
  /** Disable close behavior. Useful if the drawer is processing an operation that
   * must complete before closing. Only supported for fullscreen drawers with gesture
   * support disabled.
   */
  blockClose?: boolean
  /**
   * Whether or not the drawer is open
   */
  isOpen: boolean
  /**
   * Contents to render inside the drawer
   */
  children: ReactNode
  /**
   * Callback fired when the drawer is closed or swiped away
   */
  onClose: () => void
  onClosed?: () => void
  /**
   * Callback fired when the drawer is opened or summoned
   */
  onOpen?: () => void
  /**
   * Disable the SafeAreaView
   */
  disableSafeAreaView?: boolean
  /**
   * Header title if this drawer has a header
   */
  title?: ReactNode
  /**
   * Icon to display in the header next to the title (must also include title)
   */
  titleIcon?: IconComponent
  /**
   * Icon (as image source) to display in the header next to the title (must also include title)
   */
  titleImage?: ImageSourcePropType
  /**
   * Whether or not this is a fullscreen drawer with a dismiss button
   */
  isFullscreen?: boolean
  /**
   * Whether or not gestures are supported by the drawer
   */
  isGestureSupported?: boolean
  /**
   * Whether or not the background behind the drawer should dim
   */
  shouldBackgroundDim?: boolean
  /**
   * Whether or not to show the shadow on top of the drawer.
   * Default to true.
   */
  shouldShowShadow?: boolean
  /**
   * Whether or not to animate the shadow on top of the drawer.
   * Default to true.
   */
  shouldAnimateShadow?: boolean
  /**
   * The style that controls slideIn and slideOut animations
   */
  animationStyle?: DrawerAnimationStyle
  /**
   * Position from bottom (initial offset) of the Drawer
   * so that it may be dragged open in addition to closed.
   * The NowPlayingDrawer exhibits this behavior.
   */
  initialOffsetPosition?: number
  /**
   * Dismiss the keyboard when this drawer opens. Defaults to `false`
   */
  dismissKeyboardOnOpen?: boolean
  /**
   * Whether or not the drawer should close to the initial offset. i.e.
   * has it been opened to the offset once?
   */
  shouldCloseToInitialOffset?: boolean
  /**
   * Whether or not we should be showing rounded or straight borders at
   * the initial offset if one is enabled.
   */
  shouldHaveRoundedBordersAtInitialOffset?: boolean
  /**
   * Drawer zIndex. Default to 5.
   */
  zIndex?: number
  /**
   * Optional callback fired during drag of the drawer with the percentage
   * of how open the drawer is (0% being closed, 100% being open)
   */
  onPercentOpen?: (percentOpen: number) => void
  /**
   * Optional callback attached to the drawer's onPanResponderMove.
   * Other UI that wishes to attach to the animation of the drawer
   * may use this prop to respond to the drag gesture.
   */
  onPanResponderMove?: (
    e: GestureResponderEvent,
    gestureState: PanResponderGestureState
  ) => void
  /**
   * Optional callback attached to the drawer's onPanResponderRelease.
   * Other UI that wishes to attach to the animation of the drawer
   * may use this prop to respond to the drag gesture.
   */
  onPanResponderRelease?: (
    e: GestureResponderEvent,
    gestureState: PanResponderGestureState
  ) => void
  /**
   * Optional styles to apply to the Drawer container
   */
  drawerStyle?: ViewStyle

  /**
   * Optional replacement component for the drawer header
   */
  drawerHeader?: ComponentType<{ onClose: () => void }>

  translationAnim?: Animated.Value
}

export const springToValue = ({
  animation,
  value,
  animationStyle,
  drawerHeight,
  finished,
  velocity,
  overshootClamping
}: {
  animation: Animated.Value
  value: number
  animationStyle: DrawerAnimationStyle
  drawerHeight: number
  finished?: ({ finished }: { finished: boolean }) => void
  velocity?: number
  overshootClamping?: boolean
}) => {
  let tension: number
  let friction: number
  switch (animationStyle) {
    case DrawerAnimationStyle.STIFF:
      tension = 150
      friction = 25
      break
    case DrawerAnimationStyle.SPRINGY:
      // Factor the height of the drawer into the spring physics.
      // Without this, short drawers tend to feel sluggish while
      // tall drawers really get going.
      tension = 70 + 60 * (1 - Math.min(drawerHeight / FULL_DRAWER_HEIGHT, 1))
      friction = 10 + 2 * (1 - Math.min(drawerHeight / FULL_DRAWER_HEIGHT, 1))
      break
  }
  Animated.spring(animation, {
    toValue: value,
    tension,
    friction,
    useNativeDriver: true,
    velocity,
    overshootClamping
  }).start(finished)
}

// Only allow titleIcon with title
type DrawerComponent = {
  (props: DrawerProps & { title: string }): React.ReactElement
  (props: Omit<DrawerProps, 'titleIcon' | 'titleImage'>): React.ReactElement
}
export const Drawer: DrawerComponent = ({
  blockClose = false,
  isOpen,
  children,
  onClose,
  onClosed,
  onOpen,
  title,
  titleIcon,
  titleImage,
  isFullscreen,
  shouldBackgroundDim = true,
  isGestureSupported = true,
  animationStyle = DrawerAnimationStyle.SPRINGY,
  initialOffsetPosition = 0,
  shouldCloseToInitialOffset,
  shouldHaveRoundedBordersAtInitialOffset = false,
  zIndex = 5,
  drawerHeader: CustomDrawerHeader,
  drawerStyle,
  shouldShowShadow = true,
  shouldAnimateShadow,
  onPercentOpen,
  onPanResponderMove,
  onPanResponderRelease,
  translationAnim: providedTranslationAnim,
  disableSafeAreaView,
  dismissKeyboardOnOpen = false
}: DrawerProps) => {
  const styles = useStyles()
  const insets = useSafeAreaInsets()

  const [drawerHeight, setDrawerHeight] = useState(
    isFullscreen ? FULL_DRAWER_HEIGHT : 0
  )

  // Initial position of the drawer when closed
  const initialPosition = FULL_DRAWER_HEIGHT
  // Position of the drawer when it is in an offset but closed state
  const initialOffsetOpenPosition =
    FULL_DRAWER_HEIGHT - initialOffsetPosition - insets.bottom
  // Position of the fully opened drawer
  const openPosition = FULL_DRAWER_HEIGHT - drawerHeight

  const newTranslationAnim = useRef(new Animated.Value(initialPosition))
  const translationAnim = providedTranslationAnim || newTranslationAnim.current

  const shadowAnim = useRef(new Animated.Value(0))
  const borderRadiusAnim = useRef(new Animated.Value(BORDER_RADIUS))
  const backgroundOpacityAnim = useRef(new Animated.Value(0))

  // Capture the intent of opening the drawer (for use in pan responder release).
  // Generally when releasing a pan responder, we don't want to update state until
  // the resulting animation has completed. The completion of that animation may be
  // well after the user has started yet another pan gesture though, and we definitely
  // want to capture the users previous intent so that our next pan gesture can be
  // handled properly.
  const isOpenIntent = useRef(isOpen)

  const slideIn = useCallback(
    (position: number, velocity?: number, onFinished?: () => void) => {
      springToValue({
        animation: translationAnim,
        value: position,
        animationStyle,
        drawerHeight,
        velocity,
        finished: ({ finished }) => {
          if (finished) {
            onFinished?.()
          }
        }
      })
      if (isFullscreen) {
        springToValue({
          animation: borderRadiusAnim.current,
          value: 0,
          drawerHeight,
          animationStyle,
          velocity
        })
      }
      if (shouldBackgroundDim) {
        springToValue({
          animation: shadowAnim.current,
          value: MAX_SHADOW_OPACITY,
          drawerHeight,
          animationStyle,
          overshootClamping: true
        })
        springToValue({
          animation: backgroundOpacityAnim.current,
          value: BACKGROUND_OPACITY,
          drawerHeight,
          animationStyle,
          overshootClamping: true
        })
      }
    },
    [
      translationAnim,
      shouldBackgroundDim,
      isFullscreen,
      animationStyle,
      drawerHeight
    ]
  )

  const slideOut = useCallback(
    (position: number, velocity?: number, onFinished?: () => void) => {
      springToValue({
        animation: translationAnim,
        value: position,
        drawerHeight,
        animationStyle,
        overshootClamping: true,
        finished: ({ finished }) => {
          if (finished) {
            onFinished?.()
            onClosed?.()
          }
        },
        velocity
      })
      if (isFullscreen) {
        springToValue({
          animation: borderRadiusAnim.current,
          value: BORDER_RADIUS,
          drawerHeight,
          animationStyle,
          overshootClamping: true
        })
      }
      if (shouldBackgroundDim) {
        springToValue({
          animation: shadowAnim.current,
          value: 0,
          drawerHeight,
          animationStyle,
          overshootClamping: true
        })
        springToValue({
          animation: backgroundOpacityAnim.current,
          value: 0,
          drawerHeight,
          animationStyle,
          overshootClamping: true
        })
      }
    },
    [
      translationAnim,
      isFullscreen,
      shouldBackgroundDim,
      animationStyle,
      onClosed,
      drawerHeight
    ]
  )

  // If keyboard was visible when a drawer opens, hide it.
  useEffect(() => {
    if (isOpen && dismissKeyboardOnOpen && Keyboard.isVisible()) {
      Keyboard.dismiss()
    }
  }, [isOpen, dismissKeyboardOnOpen])

  useEffect(() => {
    if (isOpen) {
      isOpenIntent.current = true
      slideIn(openPosition)
    } else {
      isOpenIntent.current = false
      if (!isOpen && shouldCloseToInitialOffset) {
        borderRadiusAnim.current.setValue(0)
        slideOut(initialOffsetOpenPosition)
      } else {
        slideOut(initialPosition)
      }
    }
  }, [
    slideIn,
    slideOut,
    isOpen,
    openPosition,
    initialPosition,
    shouldCloseToInitialOffset,
    initialOffsetOpenPosition
  ])

  const handleClose = useCallback(() => {
    if (!blockClose) {
      onClose()
    }
  }, [blockClose, onClose])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (e, gestureState) => {
          return Math.abs(gestureState.dy) > ON_MOVE_RESPONDER_DY
        },
        /**
         * Callback when the user is dragging on the drawer.
         * There are two primary modes of operation:
         *  - Normal drawers that open by some UI action and can be swiped away by a user
         *  - Drawers that are partially showing on the screen (e.g. Now Playing)
         *    that start at an initial offset and can be dragged open
         */
        onPanResponderMove: (e, gestureState) => {
          if (
            isOpen ||
            isOpenIntent.current ||
            (!isOpen && shouldCloseToInitialOffset)
          ) {
            if (gestureState.dy > 0) {
              // Dragging downwards
              // Bound percentOpen to [0, 1]
              const percentOpen =
                (drawerHeight -
                  (!isOpenIntent.current ? drawerHeight : gestureState.dy)) /
                drawerHeight

              if (isOpenIntent.current) {
                const newTranslation = openPosition + gestureState.dy
                attachToDy(translationAnim, newTranslation)(e)

                if (shouldBackgroundDim) {
                  const newOpacity = BACKGROUND_OPACITY * percentOpen
                  attachToDy(backgroundOpacityAnim.current, newOpacity)(e)
                }

                if (isFullscreen) {
                  const newBorderRadius = BORDER_RADIUS * (1 - percentOpen)
                  attachToDy(borderRadiusAnim.current, newBorderRadius)(e)
                }

                // If we are "closing" the drawer to an offset position
                if (initialOffsetPosition) {
                  const borderRadiusInitialOffset =
                    shouldHaveRoundedBordersAtInitialOffset
                      ? // Border radius has rounded corners at the initial offset
                        BORDER_RADIUS
                      : // Border radius gains radius (quicklky) as the initial offset is
                        // left and the drawer drags open
                        BORDER_RADIUS * percentOpen * 5
                  // Cap the border radius at the maximum (BORDER_RADIUS)
                  let newBorderRadius = Math.min(
                    borderRadiusInitialOffset,
                    BORDER_RADIUS
                  )
                  // On non-iOS platforms, bring the border radius back to 0 at the fully open state
                  if (Platform.OS !== 'ios') {
                    newBorderRadius = Math.min(
                      newBorderRadius,
                      BORDER_RADIUS * 2 * (1 - percentOpen)
                    )
                  }
                  attachToDy(borderRadiusAnim.current, newBorderRadius)(e)
                }
              }

              // Dragging downwards with an initial offset
              if (!isOpenIntent.current && shouldCloseToInitialOffset) {
                const newTranslation =
                  initialOffsetOpenPosition +
                  gestureState.dy / OVERFLOW_FRICTION
                attachToDy(translationAnim, newTranslation)(e)
              }

              if (onPercentOpen) onPercentOpen(percentOpen)
            } else if (gestureState.dy < 0) {
              // Dragging upwards
              // Bound percentOpen to [0, 1]
              const percentOpen =
                (-1 *
                  (isOpenIntent.current
                    ? -1 * drawerHeight
                    : gestureState.dy)) /
                drawerHeight

              if (isOpenIntent.current) {
                const newTranslation =
                  openPosition + gestureState.dy / OVERFLOW_FRICTION
                attachToDy(translationAnim, newTranslation)(e)
              }

              // Dragging upwards with an initial offset
              if (!isOpenIntent.current && shouldCloseToInitialOffset) {
                const newTranslation =
                  initialOffsetOpenPosition + gestureState.dy
                attachToDy(translationAnim, newTranslation)(e)

                // Set up border animations so that
                // - In the offset position, they are either 0 or BORDER_RADIUS
                // - While dragging open, they have BORDER_RADIUS
                // - While fully open, they are 0
                const borderRadiusInitialOffset =
                  shouldHaveRoundedBordersAtInitialOffset
                    ? BORDER_RADIUS
                    : BORDER_RADIUS * percentOpen * 5
                let newBorderRadius = Math.min(
                  borderRadiusInitialOffset,
                  BORDER_RADIUS
                )
                // On non-iOS platforms, bring the border radius back to 0 at the fully open state
                if (Platform.OS !== 'ios') {
                  newBorderRadius = Math.min(
                    newBorderRadius,
                    BORDER_RADIUS * 2 * (1 - percentOpen)
                  )
                }

                attachToDy(borderRadiusAnim.current, newBorderRadius)(e)
              }

              if (onPercentOpen) onPercentOpen(percentOpen)
            }
          }
          if (onPanResponderMove) onPanResponderMove(e, gestureState)
        },
        /**
         * When the user releases their hold of the drawer
         */
        onPanResponderRelease: (e, gestureState) => {
          if (
            isOpen ||
            isOpenIntent.current ||
            (!isOpen && shouldCloseToInitialOffset)
          ) {
            // Close if open & drag is past cutoff
            if (
              gestureState.vy > 0 &&
              gestureState.moveY >
                FULL_DRAWER_HEIGHT - MOVE_CUTOFF_CLOSE * drawerHeight
            ) {
              // Check blockClose BEFORE starting close animation
              if (!blockClose) {
                if (shouldCloseToInitialOffset) {
                  slideOut(initialOffsetOpenPosition, gestureState.vy, onClose)
                  isOpenIntent.current = false
                  borderRadiusAnim.current.setValue(0)
                } else {
                  slideOut(initialPosition, gestureState.vy, onClose)
                  isOpenIntent.current = false
                }
              } else {
                // If blockClose is true, snap back to open position instead of closing
                slideIn(openPosition, gestureState.vy, onOpen)
                isOpenIntent.current = true
              }
            } else {
              slideIn(openPosition, gestureState.vy, onOpen)
              isOpenIntent.current = true
              // If an initial offset is defined, clear the border radius
              if (
                shouldHaveRoundedBordersAtInitialOffset &&
                initialOffsetOpenPosition
              ) {
                borderRadiusAnim.current.setValue(0)
              }
            }
          }
          if (onPanResponderRelease) onPanResponderRelease(e, gestureState)
        }
      }),
    [
      translationAnim,
      drawerHeight,
      initialOffsetOpenPosition,
      isFullscreen,
      initialOffsetPosition,
      initialPosition,
      isOpen,
      onClose,
      onOpen,
      onPanResponderMove,
      onPanResponderRelease,
      onPercentOpen,
      openPosition,
      shouldBackgroundDim,
      shouldCloseToInitialOffset,
      shouldHaveRoundedBordersAtInitialOffset,
      slideIn,
      slideOut,
      blockClose
    ]
  )

  // NOTE: sk - Need to interpolate the border radius bc of a funky
  // issue with border radius under 1 in ios
  const interpolatedBorderRadius = borderRadiusAnim.current.interpolate({
    inputRange: [0, 0.99, 1, BORDER_RADIUS],
    outputRange: [0, 0, 1, BORDER_RADIUS]
  })

  const renderBackground = () => {
    return (
      <View
        pointerEvents={isOpen ? undefined : 'none'}
        style={[styles.backgroundRoot, { zIndex }]}
      >
        <TouchableWithoutFeedback
          onPress={isGestureSupported ? handleClose : undefined}
        >
          <Animated.View
            style={[
              styles.background,
              { opacity: backgroundOpacityAnim.current }
            ]}
          />
        </TouchableWithoutFeedback>
      </View>
    )
  }

  const renderContent = () => {
    const ViewComponent = disableSafeAreaView ? View : SafeAreaView

    const edgeProps = disableSafeAreaView
      ? undefined
      : {
          edges: ['bottom', ...(isFullscreen ? ['top'] : [])] as Edge[]
        }

    return (
      <ViewComponent
        style={isFullscreen ? styles.fullScreenContent : styles.content}
        onLayout={(event: LayoutChangeEvent) => {
          if (!isFullscreen) {
            const { height } = event.nativeEvent.layout
            setDrawerHeight(height)
          }
        }}
        {...edgeProps}
      >
        {CustomDrawerHeader ? (
          <CustomDrawerHeader onClose={handleClose} />
        ) : (
          <DrawerHeader
            onClose={handleClose}
            title={title}
            titleIcon={titleIcon}
            titleImage={titleImage}
            isFullscreen={isFullscreen}
            blockClose={blockClose}
          />
        )}
        {children}
      </ViewComponent>
    )
  }

  return (
    <>
      {shouldBackgroundDim ? renderBackground() : null}
      <Animated.View
        {...(isGestureSupported && !blockClose ? panResponder.panHandlers : {})}
        style={[
          styles.drawer,
          drawerStyle,
          isFullscreen && styles.fullDrawer,
          {
            elevation: zIndex,
            zIndex,
            shadowOpacity: shouldShowShadow
              ? shouldAnimateShadow
                ? shadowAnim.current
                : MAX_SHADOW_OPACITY
              : 0,
            transform: [
              {
                translateY: translationAnim
              }
            ],
            borderTopRightRadius: interpolatedBorderRadius,
            borderTopLeftRadius: interpolatedBorderRadius
          }
        ]}
      >
        {renderContent()}
        <View style={styles.skirt} />
      </Animated.View>
    </>
  )
}

export default Drawer
