import type { ReactNode } from 'react'
import { useEffect, useRef, useCallback, useMemo, useState } from 'react'

import { useTheme } from '@emotion/react'
import type { LottieViewProps } from 'lottie-react-native'
import LottieView from 'lottie-react-native'
import { Pressable, StyleSheet } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { usePrevious } from 'react-use'

import * as haptics from 'app/haptics'

import { BOTTOM_BAR_BUTTON_HEIGHT } from '../constants'

export type BaseBottomTabBarButtonProps = {
  name: string
  children?: ReactNode
  isActive: boolean
  onPress: (isActive: boolean, routeName: string, routeKey: string) => void
  onLongPress: () => void
  routeKey: string
}

export type BottomTabBarButtonProps = BaseBottomTabBarButtonProps & {
  colorKeypaths?: string[]
  routeKey: string
} & LottieViewProps

const styles = StyleSheet.create({
  root: {
    width: '20%',
    alignItems: 'center'
  },
  iconWrapper: {
    width: 28,
    height: BOTTOM_BAR_BUTTON_HEIGHT
  },
  underlay: {
    width: '100%',
    height: BOTTOM_BAR_BUTTON_HEIGHT,
    position: 'absolute'
  }
})

export const BottomTabBarButton = (props: BottomTabBarButtonProps) => {
  const {
    name,
    routeKey,
    isActive,
    onPress,
    onLongPress,
    children,
    colorKeypaths: keypaths,
    ...lottieProps
  } = props
  const { color } = useTheme()
  const animationRef = useRef<LottieView | null | undefined>(undefined)
  const previousActive = usePrevious(isActive)
  const initialIsActive = Boolean(
    (isActive && previousActive === undefined) || (previousActive && isActive)
  )
  const [isPressing, setIsPressing] = useState(false)

  const handlePressIn = useCallback(() => {
    // Trigger haptics on press down
    if (isActive) {
      haptics.light()
    } else {
      haptics.medium()
    }
  }, [isActive])

  const handlePress = useCallback(() => {
    if (!isActive) {
      animationRef.current?.play()
      setIsPressing(true)
    }
    onPress(isActive, name, routeKey)
  }, [onPress, routeKey, isActive, name, setIsPressing])

  useEffect(() => {
    if (previousActive && !isActive) {
      animationRef.current?.reset()
      setIsPressing(false)
    }
  }, [isActive, previousActive])

  const handleLongPress = useCallback(() => {
    haptics.medium()
    if (isActive) {
      onLongPress()
    } else {
      handlePress()
    }
  }, [onLongPress, handlePress, isActive])

  const { primary } = color.primary
  const { neutral } = color.neutral

  const isColorActive = isPressing || isActive

  const colorFilters = useMemo(() => {
    return keypaths?.map((keypath) => ({
      keypath,
      color: isColorActive ? primary : neutral
    }))
  }, [isColorActive, keypaths, primary, neutral])

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onLongPress={handleLongPress}
      pointerEvents='box-only'
      style={styles.root}
    >
      {({ pressed }) => {
        return (
          <>
            {pressed ? (
              <LinearGradient
                style={styles.underlay}
                colors={[color.neutral.n100, color.neutral.n25]}
              />
            ) : null}
            <LottieView
              ref={(animation) => {
                animationRef.current = animation
              }}
              {...lottieProps}
              loop={false}
              style={styles.iconWrapper}
              autoPlay={initialIsActive}
              colorFilters={colorFilters}
            />
            {children}
          </>
        )
      }}
    </Pressable>
  )
}
