import type { ReactNode } from 'react'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

import type { LottieViewProps } from 'lottie-react-native'
import LottieView from 'lottie-react-native'
import type {
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  ViewStyle
} from 'react-native'
import { Pressable } from 'react-native'
import { usePrevious } from 'react-use'

import { light, medium } from 'app/haptics'
import type { GestureResponderHandler } from 'app/types/gesture'

export type IconJSON = LottieViewProps['source']

export type Haptics = boolean | 'light' | 'medium'

export type AnimatedButtonProps = {
  iconIndex?: number
  iconJSON: IconJSON | IconJSON[]
  isActive?: boolean
  isDisabled?: boolean
  onLongPress?: GestureResponderHandler
  onPress?: GestureResponderHandler
  renderUnderlay?: (state: PressableStateCallbackType) => ReactNode
  resizeMode?: LottieViewProps['resizeMode']
  style?: PressableProps['style']
  wrapperStyle?: StyleProp<ViewStyle>
  haptics?: Haptics
  hapticsConfig?: Haptics[]
  waitForAnimationFinish?: boolean
  children?: ReactNode
  lottieProps?: Partial<LottieViewProps>
} & PressableProps

export const AnimatedButton = ({
  iconIndex: externalIconIndex,
  iconJSON,
  isActive,
  isDisabled = false,
  onLongPress,
  onPress,
  renderUnderlay,
  resizeMode,
  style,
  wrapperStyle,
  haptics,
  hapticsConfig,
  waitForAnimationFinish = true,
  children,
  lottieProps,
  ...pressableProps
}: AnimatedButtonProps) => {
  const [iconIndex, setIconIndex] = useState<number>(externalIconIndex ?? 0)
  const [isPlaying, setIsPlaying] = useState(false)
  const animationRef = useRef<LottieView | null | undefined>(undefined)
  const previousExternalIconIndex = usePrevious(externalIconIndex)
  const previousActiveState = usePrevious(isActive)

  // When externalIconIndex is updated, update iconIndex
  // if animation isn't currently playing
  if (
    externalIconIndex !== undefined &&
    previousExternalIconIndex !== undefined &&
    previousExternalIconIndex !== externalIconIndex &&
    iconIndex !== externalIconIndex &&
    !isPlaying
  ) {
    setIconIndex(externalIconIndex)
  }

  const hasMultipleStates = Array.isArray(iconJSON)
  let source: IconJSON
  if (hasMultipleStates) {
    source = iconJSON[iconIndex]
  } else {
    source = iconJSON
  }

  const handleHaptics = useCallback(() => {
    const haptic = haptics ?? hapticsConfig?.[iconIndex]
    if (haptic === 'light') light()
    else if (haptic === 'medium') medium()
    else if (haptic) medium()
  }, [haptics, hapticsConfig, iconIndex])

  const handleAnimationFinish = useCallback(() => {
    if (waitForAnimationFinish) {
      onPress?.()
    }
    if (hasMultipleStates) {
      setIconIndex((iconIndex) => {
        // If externalIconIndex is provided,
        // set iconIndex to it
        if (externalIconIndex !== undefined) {
          return externalIconIndex
        }
        // Otherwise increment iconIndex
        return (iconIndex + 1) % iconJSON.length
      })
    }
    setIsPlaying(false)
  }, [
    waitForAnimationFinish,
    onPress,
    hasMultipleStates,
    setIconIndex,
    setIsPlaying,
    iconJSON,
    externalIconIndex
  ])

  const handlePress = useCallback(() => {
    handleHaptics()

    if (hasMultipleStates || !isActive) {
      animationRef.current?.play()
      setIsPlaying(true)
    }
    if (!waitForAnimationFinish) {
      onPress?.()
    }
  }, [
    handleHaptics,
    isActive,
    setIsPlaying,
    hasMultipleStates,
    animationRef,
    waitForAnimationFinish,
    onPress
  ])

  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      handleHaptics()
      onLongPress()
    } else {
      handlePress()
    }
  }, [onLongPress, handleHaptics, handlePress])

  // For multi state buttons, when `isActive` flips, trigger
  // the animation to run
  useEffect(() => {
    if (hasMultipleStates) {
      if (isActive !== previousActiveState && !isPlaying) {
        animationRef.current?.play()
        setIsPlaying(true)
      }
    }
  }, [
    isActive,
    previousActiveState,
    isPlaying,
    setIsPlaying,
    hasMultipleStates,
    animationRef
  ])

  const progress = useMemo(() => {
    if (hasMultipleStates || isPlaying) {
      return undefined
    }

    return isActive ? 1 : 0
  }, [isPlaying, isActive, hasMultipleStates])

  // For binary state buttons, reset the animation
  // when not playing. This prevents the animation from getting stuck
  // in the active state when many rerenders are happening
  useEffect(() => {
    if (!hasMultipleStates && !isActive && !isPlaying) {
      animationRef.current?.reset()
    }
  }, [hasMultipleStates, isActive, isPlaying])

  return iconJSON ? (
    <Pressable
      hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      {...pressableProps}
      disabled={isDisabled}
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={style}
    >
      {(pressableState) => (
        <>
          {renderUnderlay?.(pressableState)}
          {/* The key is needed for animations to work on android  */}
          <LottieView
            style={[
              !hasMultipleStates ? { opacity: isActive ? 1 : 0 } : undefined,
              wrapperStyle
            ]}
            key={hasMultipleStates ? iconIndex : undefined}
            ref={(animation) => {
              if (animation) {
                animationRef.current = animation
              }
            }}
            onAnimationFinish={handleAnimationFinish}
            progress={progress}
            loop={false}
            source={source}
            resizeMode={resizeMode}
            {...lottieProps}
          />
          {/**
           * Secondary animation that is visible when inactive. This ensures
           * active->inactive transition is smooth, since Lottie onAnimationFinish
           * does not do this smoothly and results in partially inactive states.
           */}
          {!hasMultipleStates ? (
            <LottieView
              key={isActive ? 'active' : 'inactive'}
              style={[{ opacity: isActive ? 0 : 1 }, wrapperStyle]}
              progress={0}
              loop={false}
              source={source}
              resizeMode={resizeMode}
            />
          ) : null}
          {children}
        </>
      )}
    </Pressable>
  ) : null
}
