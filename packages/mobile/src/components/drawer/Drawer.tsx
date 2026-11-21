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
import { useAndroidBackHandler } from 'app/hooks/useAndroidBackHandler'
import { makeStyles } from 'app/styles'
import { attachToDy } from 'app/utils/animation'

import { DrawerHeader } from './DrawerHeader'
import { getFullDrawerHeight, useFullDrawerHeight } from './constants'

const MAX_SHADOW_OPACITY = 0.15
const ON_MOVE_RESPONDER_DY = 10
const MOVE_CUTOFF_CLOSE = 0.8
const BORDER_RADIUS = 40
const BACKGROUND_OPACITY = 0.5

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
  blockClose?: boolean
  isOpen: boolean
  children: ReactNode
  onClose: () => void
  onClosed?: () => void
  onOpen?: () => void
  disableSafeAreaView?: boolean
  title?: ReactNode
  titleIcon?: IconComponent
  titleImage?: ImageSourcePropType
  isFullscreen?: boolean
  isGestureSupported?: boolean
  gesturesDisabled?: boolean
  shouldBackgroundDim?: boolean
  shouldShowShadow?: boolean
  shouldAnimateShadow?: boolean
  animationStyle?: DrawerAnimationStyle
  initialOffsetPosition?: number
  dismissKeyboardOnOpen?: boolean
  shouldCloseToInitialOffset?: boolean
  shouldHaveRoundedBordersAtInitialOffset?: boolean
  zIndex?: number
  onPercentOpen?: (percentOpen: number) => void
  onPanResponderMove?: (
    e: GestureResponderEvent,
    gestureState: PanResponderGestureState
  ) => void
  onPanResponderRelease?: (
    e: GestureResponderEvent,
    gestureState: PanResponderGestureState
  ) => void
  drawerStyle?: ViewStyle

  drawerHeader?: ComponentType<{ onClose: () => void }>
  showBackButton?: boolean

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
      tension =
        70 + 60 * (1 - Math.min(drawerHeight / getFullDrawerHeight(), 1))
      friction =
        10 + 2 * (1 - Math.min(drawerHeight / getFullDrawerHeight(), 1))
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
  gesturesDisabled = false,
  animationStyle = DrawerAnimationStyle.SPRINGY,
  initialOffsetPosition = 0,
  shouldCloseToInitialOffset,
  shouldHaveRoundedBordersAtInitialOffset = false,
  zIndex = 5,
  drawerHeader: CustomDrawerHeader,
  showBackButton = false,
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
  const FULL_DRAWER_HEIGHT = useFullDrawerHeight()

  const [drawerHeight, setDrawerHeight] = useState(
    isFullscreen ? FULL_DRAWER_HEIGHT : 0
  )

  const initialPosition = FULL_DRAWER_HEIGHT
  const initialOffsetOpenPosition =
    FULL_DRAWER_HEIGHT - initialOffsetPosition - insets.bottom
  const openPosition = FULL_DRAWER_HEIGHT - drawerHeight

  const newTranslationAnim = useRef(new Animated.Value(initialPosition))
  const translationAnim = providedTranslationAnim || newTranslationAnim.current

  const shadowAnim = useRef(new Animated.Value(0))
  const borderRadiusAnim = useRef(new Animated.Value(BORDER_RADIUS))
  const backgroundOpacityAnim = useRef(new Animated.Value(0))

  const isOpenIntent = useRef(isOpen)

  const gesturesDisabledRef = useRef(gesturesDisabled)
  useEffect(() => {
    gesturesDisabledRef.current = gesturesDisabled
  }, [gesturesDisabled])

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

  useAndroidBackHandler(isOpen, handleClose)

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (e, gestureState) => {
          if (gesturesDisabledRef.current) return false
          return Math.abs(gestureState.dy) > ON_MOVE_RESPONDER_DY
        },
        onPanResponderMove: (e, gestureState) => {
          if (
            isOpen ||
            isOpenIntent.current ||
            (!isOpen && shouldCloseToInitialOffset)
          ) {
            if (gestureState.dy > 0) {
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

                if (initialOffsetPosition) {
                  const borderRadiusInitialOffset =
                    shouldHaveRoundedBordersAtInitialOffset
                      ? BORDER_RADIUS
                      : BORDER_RADIUS * percentOpen * 5
                  let newBorderRadius = Math.min(
                    borderRadiusInitialOffset,
                    BORDER_RADIUS
                  )
                  if (Platform.OS !== 'ios') {
                    newBorderRadius = Math.min(
                      newBorderRadius,
                      BORDER_RADIUS * 2 * (1 - percentOpen)
                    )
                  }
                  attachToDy(borderRadiusAnim.current, newBorderRadius)(e)
                }
              }

              if (!isOpenIntent.current && shouldCloseToInitialOffset) {
                const newTranslation =
                  initialOffsetOpenPosition +
                  gestureState.dy / OVERFLOW_FRICTION
                attachToDy(translationAnim, newTranslation)(e)
              }

              if (onPercentOpen) onPercentOpen(percentOpen)
            } else if (gestureState.dy < 0) {
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

              if (!isOpenIntent.current && shouldCloseToInitialOffset) {
                const newTranslation =
                  initialOffsetOpenPosition + gestureState.dy
                attachToDy(translationAnim, newTranslation)(e)

                const borderRadiusInitialOffset =
                  shouldHaveRoundedBordersAtInitialOffset
                    ? BORDER_RADIUS
                    : BORDER_RADIUS * percentOpen * 5
                let newBorderRadius = Math.min(
                  borderRadiusInitialOffset,
                  BORDER_RADIUS
                )
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
        onPanResponderRelease: (e, gestureState) => {
          if (
            isOpen ||
            isOpenIntent.current ||
            (!isOpen && shouldCloseToInitialOffset)
          ) {
            if (
              gestureState.vy > 0 &&
              gestureState.moveY >
                FULL_DRAWER_HEIGHT - MOVE_CUTOFF_CLOSE * drawerHeight
            ) {
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
                slideIn(openPosition, gestureState.vy, onOpen)
                isOpenIntent.current = true
              }
            } else {
              slideIn(openPosition, gestureState.vy, onOpen)
              isOpenIntent.current = true
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
      FULL_DRAWER_HEIGHT,
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
            showBackButton={showBackButton}
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
