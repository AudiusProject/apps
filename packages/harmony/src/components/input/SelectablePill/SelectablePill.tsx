import { ComponentProps } from 'react'

import { CSSObject, useTheme } from '@emotion/react'

import { HiddenInput } from '~harmony/components/common/HiddenInput'
import { useRadioGroup } from '~harmony/components/radio-group/useRadioGroup'
import { Text } from '~harmony/components/text'

import type { SelectablePillProps } from './types'

const RadioInput = (props: ComponentProps<'input'>) => {
  const { name, checked, onChange } = useRadioGroup(props)
  return (
    <HiddenInput {...props} name={name} checked={checked} onChange={onChange} />
  )
}

export const SelectablePill = (props: SelectablePillProps) => {
  const {
    isSelected: isSelectedProp,
    size = 'small',
    _isHovered,
    icon: Icon,
    className,
    ...other
  } = props

  const { disabled, type } = other
  const isSelected =
    type === 'checkbox' || type === 'radio'
      ? (other.checked ?? isSelectedProp)
      : isSelectedProp

  const theme = useTheme()
  const { spacing } = theme

  const hoverCss: CSSObject = {
    backgroundColor: theme.color.secondary.s200,
    color: theme.color.static.white,
    border: `1px solid ${theme.color.secondary.secondary}`,
    ...(size === 'large' && {
      boxShadow: 'none'
    })
  }

  const activeCss: CSSObject = {
    backgroundColor: theme.color.secondary.s400,
    color: theme.color.static.white,
    border: `1px solid ${theme.color.secondary.s400}`,
    ...(size === 'large' && {
      boxShadow: 'none'
    })
  }

  const rootCss: CSSObject = {
    display: 'inline-flex',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
    color: theme.color.text.default,
    backgroundColor: theme.color.background.white,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.12s ease-out',
    textWrap: 'nowrap',
    border: `1px solid ${theme.color.border.strong}`,
    borderRadius: theme.cornerRadius['2xl'],
    ...(size === 'small' && {
      height: theme.spacing.xl,
      paddingInline: theme.spacing.m
    }),
    ...(size === 'large' && {
      height: theme.spacing['2xl'],
      paddingInline: theme.spacing.l,
      boxShadow: theme.shadows.near
    }),
    ...(size === 'oversized' && {
      height: spacing.unit12,
      padding: spacing.m,
      borderWidth: 2
    }),
    ...(disabled && { opacity: 0.45 }),
    ...(_isHovered && hoverCss),
    ...(isSelected && activeCss),
    ...((disabled || _isHovered) && {
      pointerEvents: 'none'
    }),
    ':hover': hoverCss,
    ':active': activeCss
  }

  const iconCss = {
    '& path': {
      fill: 'currentColor'
    }
  }

  const rootProps = {
    css: rootCss,
    className
  }

  const pillContent = (
    <>
      {size !== 'small' && Icon ? <Icon size='s' css={iconCss} /> : null}
      {'label' in other ? (
        <Text
          variant={size === 'oversized' ? 'heading' : 'body'}
          tag='span'
          css={size === 'oversized' && { textTransform: 'uppercase' }}
        >
          {other.label}
        </Text>
      ) : null}
    </>
  )

  switch (type) {
    case 'checkbox': {
      return (
        <label {...rootProps}>
          {pillContent}
          <HiddenInput {...other} checked={isSelected} />
        </label>
      )
    }
    case 'radio': {
      return (
        <label {...rootProps}>
          {pillContent}
          <RadioInput {...other} checked={isSelected} />
        </label>
      )
    }
    case 'button':
    case 'reset':
    case 'submit':
    default: {
      return (
        <button {...rootProps} {...other}>
          {pillContent}
        </button>
      )
    }
  }
}
