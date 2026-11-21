import { forwardRef, MouseEventHandler, Ref, useCallback } from 'react'

import { CSSObject } from '@emotion/react'

import { Text } from '~harmony/components/text/Text'
import { useTheme } from '~harmony/foundations'

import { BaseButton } from '../BaseButton/BaseButton'

import { FilterButtonOptionType } from './types'

type FilterButtonOptionProps<Value extends string> = {
  activeValue?: Value | null
  isActive?: boolean
  option: FilterButtonOptionType<Value>
  onChange: (option: Value) => void
}

export const FilterButtonOption = forwardRef(function <Value extends string>(
  props: FilterButtonOptionProps<Value>,
  ref: Ref<HTMLButtonElement>
) {
  const { activeValue, option, onChange, isActive } = props
  const { color, cornerRadius, spacing, typography } = useTheme()

  const optionIconCss: CSSObject = {
    width: spacing.unit4,
    height: spacing.unit4
  }

  const activeOptionCss: CSSObject = {
    transform: 'none',
    backgroundColor: color.secondary.s300,
    color: color.static.white
  }

  const optionCss: CSSObject = {
    background: 'transparent',
    border: 'none',
    color: color.text.default,
    fontWeight: typography.weight.medium,
    gap: spacing.s,
    paddingLeft: spacing.m,
    paddingRight: spacing.m,
    paddingTop: spacing.s,
    paddingBottom: spacing.s,
    width: '100%',
    borderRadius: cornerRadius.s,
    justifyContent: 'flex-start',

    '&:hover': activeOptionCss,
    '&:hover .helperText': {
      color: color.static.white
    },

    '&:active': {
      transform: 'none'
    }
  }

  const handleChange = useCallback<MouseEventHandler>(
    (e) => {
      e.stopPropagation()
      onChange(option.value)
    },
    [option.value, onChange]
  )

  return (
    <BaseButton
      ref={ref}
      key={option.value}
      iconLeft={option.icon}
      styles={{
        button: {
          ...optionCss,
          ...(option.value === activeValue || isActive ? activeOptionCss : {})
        },
        icon: optionIconCss
      }}
      aria-label={option.label ?? option.value}
      role='option'
      onClick={handleChange}
    >
      {option.leadingElement ?? null}
      <Text variant='body' strength='strong'>
        {option.label ?? option.value}
      </Text>
      {option.helperText ? (
        <Text
          variant='body'
          strength='strong'
          color={option.value === activeValue ? 'white' : 'subdued'}
          className='helperText'
        >
          {option.helperText}
        </Text>
      ) : null}
    </BaseButton>
  )
})
