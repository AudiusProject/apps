import type { ReactNode } from 'react'

import { TouchableOpacity, View } from 'react-native'
import type { ViewStyle } from 'react-native'

import { useTheme } from '../../foundations/theme'
import type { IconComponent } from '../../icons'
import { Text } from '../Text/Text'
import type { FlexProps } from '../layout'
import { Flex } from '../layout/Flex/Flex'

import { useRadioGroup } from './useRadioGroup'

export type RadioProps = FlexProps & {
  checked?: boolean
  value: string
  onValueChange?: (value: string) => void
  label?: string | ReactNode
  icon?: IconComponent
  disabled?: boolean
  size?: 'default' | 'large'
  children?: ReactNode
  startAdornment?: ReactNode
}

export const Radio = (props: RadioProps) => {
  const {
    checked: checkedProp,
    value,
    onValueChange: onValueChangeProp,
    label,
    icon: Icon,
    startAdornment,
    disabled,
    children,
    style,
    size,
    ...flexProps
  } = props
  const { cornerRadius, spacing, color } = useTheme()

  const { checked, onValueChange } = useRadioGroup({
    checked: checkedProp,
    value,
    onValueChange: onValueChangeProp
  })

  const rootStyles: ViewStyle = {
    borderRadius: cornerRadius.circle,
    height: spacing.xl,
    width: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: checked
      ? color.secondary.secondary
      : disabled
        ? color.neutral.n300
        : color.neutral.n700
  }

  const innerActive: ViewStyle = {
    backgroundColor: disabled ? color.neutral.n300 : color.special.white,
    borderRadius: cornerRadius.circle,
    height: 14,
    width: 14
  }

  const innerInactive: ViewStyle = {
    backgroundColor: disabled ? color.neutral.n300 : color.neutral.n200,
    borderRadius: cornerRadius.circle,
    height: 22.5,
    width: 22.5,
    position: 'absolute',
    right: 0.15,
    bottom: 0.15,
    shadowColor: color.neutral.n200,
    shadowOpacity: 0.75,
    shadowRadius: 1,
    shadowOffset: { height: -1, width: -1 }
  }

  return (
    <TouchableOpacity
      onPress={onValueChange}
      style={[style, disabled && { opacity: 0.5 }]}
      disabled={disabled}
      activeOpacity={Number(checked)}
    >
      <Flex gap='l' {...flexProps}>
        <Flex direction='row' gap='m'>
          <Flex alignItems='center' justifyContent='center' style={rootStyles}>
            <View style={checked ? innerActive : innerInactive} />
          </Flex>
          {label ? (
            <Flex direction='row' gap='s'>
              {Icon ? <Icon color={checked ? 'accent' : 'default'} /> : null}
              {startAdornment ? <View>{startAdornment}</View> : null}
              <Text
                variant='title'
                size={size === 'large' ? 'l' : 'm'}
                color={checked ? 'accent' : 'default'}
              >
                {label}
              </Text>
            </Flex>
          ) : null}
        </Flex>
        {children}
      </Flex>
    </TouchableOpacity>
  )
}
