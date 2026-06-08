import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ReactNativeStyle } from '@emotion/native'
import { useTheme } from '@emotion/react'
import { isNil } from 'lodash'
import { Pressable, type GestureResponderEvent } from 'react-native'

import type { IconProps } from '@audius/harmony-native'
import { IconCloseAlt, Text } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import { BaseButton } from '../BaseButton/BaseButton'

import type { FilterButtonProps } from './types'

export const FilterButton = <Value extends string>(
  props: FilterButtonProps<Value>
) => {
  const {
    value,
    label,
    onPress,
    onOpen,
    onReset,
    disabled,
    variant = 'fillContainer',
    size = 'default',
    iconRight,
    leadingElement,
    onChange,
    filterScreen = 'FilterButton',
    options,
    screen,
    disableSearch
  } = props

  const selectedOption = options?.find((option) => option.value === value)
  const selectedLabel = selectedOption?.label ?? selectedOption?.value

  const navigation = useNavigation()

  const { color, cornerRadius, spacing, typography } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  // Size Styles
  const defaultStyles: ReactNativeStyle = {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s
  }

  const smallStyles: ReactNativeStyle = {
    paddingHorizontal: spacing.m,
    height: spacing.unit8
  }

  // TODO: Update these are the button styles to use animated styles for the background, border, text, and icon
  // State Styles
  const fillContainerStyles: ReactNativeStyle = {
    backgroundColor: color.secondary.s400,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.secondary.s400
  }

  const activeStyle: ReactNativeStyle =
    variant !== 'fillContainer' || isNil(value)
      ? {
          backgroundColor: color.background.surface2,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: color.border.strong
        }
      : {}

  // Button Styles
  const buttonStyles: ReactNativeStyle = {
    backgroundColor: color.background.white,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.border.strong,
    borderRadius: cornerRadius.s,
    color:
      variant === 'fillContainer' && !isNil(value)
        ? color.static.white
        : color.text.default,
    gap: spacing.xs,
    fontSize: typography.size.s,
    fontWeight: '600',
    lineHeight: typography.lineHeight.s,
    opacity: disabled ? 0.6 : 1,

    ...(size === 'small' ? smallStyles : defaultStyles),
    ...(isOpen ? activeStyle : {}),
    ...(variant === 'fillContainer' && !isNil(value) ? fillContainerStyles : {})
  }

  const iconSize = size === 'small' ? '2xs' : 's'
  const textColor =
    !isNil(value) && variant === 'fillContainer' ? 'white' : 'default'

  useEffect(() => {
    if (isOpen) {
      onOpen?.()
    }
  }, [isOpen, onOpen])

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      onPress?.(e)
      setIsOpen((isOpen) => !isOpen)
      if (options || screen) {
        navigation.navigate(filterScreen, {
          options,
          title: label,
          onChange,
          value,
          screen,
          disableSearch
        })
      }
    },
    [
      onPress,
      options,
      screen,
      navigation,
      filterScreen,
      label,
      onChange,
      value,
      disableSearch
    ]
  )

  const Icon = useMemo(() => {
    return variant === 'fillContainer' && !isNil(value)
      ? (props: IconProps) => (
          <Pressable
            hitSlop={20}
            onPress={(e: GestureResponderEvent) => {
              e.stopPropagation()
              onPress?.(e)
              onChange?.(undefined)
              onReset?.()
            }}
          >
            <IconCloseAlt aria-label='cancel' {...props} />
          </Pressable>
        )
      : (iconRight ?? undefined)
  }, [variant, value, iconRight, onPress, onChange, onReset])

  return (
    <BaseButton
      style={buttonStyles}
      innerProps={{ icon: { color: 'white', size: iconSize } }}
      onPress={handlePress}
      iconRight={Icon}
      disabled={disabled}
      aria-haspopup='listbox'
      aria-expanded={isOpen}
    >
      {leadingElement}
      <Text color={textColor}>{selectedLabel ?? label}</Text>
    </BaseButton>
  )
}
