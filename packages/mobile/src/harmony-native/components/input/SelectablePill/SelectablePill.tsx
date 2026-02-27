import React, { useCallback, useEffect, useState } from 'react'

import { useControlled } from '@audius/harmony/src/hooks/useControlled'
import { css } from '@emotion/native'
import { Pressable } from 'react-native'
import type { GestureResponderEvent } from 'react-native'
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'

import { DEFAULT_HIT_SLOP } from '@audius/harmony-native'

import { useTheme } from '../../../foundations/theme'
import { Text } from '../../Text/Text'
import { Flex } from '../../layout'

import type { SelectablePillProps } from './types'

const AnimatedFlex = Animated.createAnimatedComponent(Flex)
const AnimatedText = Animated.createAnimatedComponent(Text)

export const SelectablePill = (props: SelectablePillProps) => {
  const {
    type,
    icon: Icon,
    size = 'small',
    isSelected: isSelectedProp,
    isControlled,
    disabled,
    onPress,
    onChange,
    value,
    style: styleProp,
    fullWidth,
    disableUnselectAnimation,
    'aria-label': ariaLabel,
    accessibilityLabel: accessibilityLabelProp,
    ...other
  } = props

  const label = 'label' in props ? props.label : undefined
  const isIconOnly = !('label' in props) && !!Icon
  const displayLabel = label
  const a11yLabel = ariaLabel ?? accessibilityLabelProp
  const {
    color,
    motion,
    cornerRadius,
    typography,
    type: themeType
  } = useTheme()
  const [isPressing, setIsPressing] = useState(false)
  const [isSelected, setIsSelected] = useControlled({
    controlledProp: isSelectedProp,
    defaultValue: false,
    componentName: 'SelectablePill'
  })

  const pressed = useSharedValue(0)
  const selected = useSharedValue(isSelected ? 1 : 0)

  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, motion.press)
    setIsPressing(true)
  }, [pressed, motion.press, setIsPressing])

  const handlePressOut = useCallback(() => {
    pressed.value = withTiming(0, motion.press)
    setIsPressing(false)
  }, [pressed, motion.press, setIsPressing])

  const handleTouchCancel = useCallback(() => {
    pressed.value = withTiming(0, motion.press)
    setIsPressing(false)
  }, [pressed, motion.press, setIsPressing])

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      onPress?.(e)
      if (value) {
        onChange?.(value, !isSelected)
      }
      if (!isControlled) {
        setIsSelected(!isSelected)
        if (isSelected) {
          selected.value = disableUnselectAnimation
            ? 0
            : withTiming(0, motion.press)
        }
      }
    },
    [
      onPress,
      value,
      setIsSelected,
      isSelected,
      onChange,
      selected,
      disableUnselectAnimation,
      motion.press,
      isControlled
    ]
  )

  useEffect(() => {
    setIsSelected(isSelectedProp)
    if (isSelectedProp) {
      selected.value = withTiming(1, motion.press)
    } else {
      selected.value = disableUnselectAnimation
        ? 0
        : withTiming(0, motion.press)
    }
  }, [
    isSelectedProp,
    motion.press,
    selected,
    setIsSelected,
    disableUnselectAnimation
  ])

  const animatedRootStyles = useAnimatedStyle(
    () => ({
      opacity: withTiming(disabled ? 0.45 : 1, motion.press),
      backgroundColor: interpolateColor(
        selected.value,
        [0, 1],
        [color.background.white, color.secondary.s400]
      ),
      borderColor: interpolateColor(
        selected.value,
        [0, 1],
        [color.border.strong, color.secondary.s400]
      ),
      transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.95]) }]
    }),
    [disabled, themeType]
  )

  const animatedTextStyles = useAnimatedStyle(
    () => ({
      color: interpolateColor(
        selected.value,
        [0, 1],
        [color.text.default, color.static.white]
      )
    }),
    [themeType]
  )

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onTouchCancel={handleTouchCancel}
      onPress={handlePress}
      hitSlop={DEFAULT_HIT_SLOP}
      accessibilityLabel={isIconOnly ? a11yLabel : undefined}
      style={[
        css({ alignSelf: 'flex-start', borderRadius: cornerRadius['2xl'] }),
        styleProp
      ]}
    >
      <AnimatedFlex
        accessibilityRole={type}
        accessibilityState={{
          checked: type === 'checkbox' ? isSelected : undefined,
          selected: type === 'radio' ? isSelected : undefined,
          disabled: !!disabled
        }}
        direction='row'
        gap='s'
        alignItems='center'
        justifyContent='center'
        alignSelf='flex-start'
        border='strong'
        borderRadius='2xl'
        h={size === 'small' ? 'xl' : '2xl'}
        ph={size === 'small' ? 'm' : 'l'}
        shadow={size === 'large' ? (isSelected ? 'flat' : 'near') : undefined}
        style={[animatedRootStyles, fullWidth ? { width: '100%' } : undefined]}
        {...other}
      >
        {(isIconOnly || (size !== 'small' && Icon)) && Icon ? (
          <Icon
            size='s'
            color={isSelected || isPressing ? 'white' : 'default'}
          />
        ) : null}
        {displayLabel != null ? (
          <AnimatedText
            numberOfLines={1}
            variant='body'
            style={[
              animatedTextStyles,
              { lineHeight: typography.lineHeight.m }
            ]}
          >
            {displayLabel}
          </AnimatedText>
        ) : null}
      </AnimatedFlex>
    </Pressable>
  )
}
