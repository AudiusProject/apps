import { forwardRef } from 'react'

import { useTheme, type CSSObject } from '@emotion/react'

import type { IconComponent, IconProps } from '../../icon'
import { BaseButton } from '../BaseButton/BaseButton'
import type { BaseButtonProps } from '../BaseButton/types'

export type IconButtonProps = {
  icon: IconComponent
  ripple?: boolean
  'aria-label': string
  iconCss?: CSSObject
} & Pick<IconProps, 'color' | 'size' | 'shadow' | 'height' | 'width'> &
  Pick<
    BaseButtonProps,
    'onClick' | 'disabled' | 'className' | 'type' | 'children'
  >

/**
 * The icon component allows you to pass in an icon and
 * apply color and sizing properties.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (props: IconButtonProps, ref) => {
    const {
      icon: Icon,
      color: iconColor,
      size = 'l',
      shadow,
      ripple,
      height,
      width,
      iconCss,
      children,
      ...other
    } = props
    const { disabled } = other
    const { color, cornerRadius, spacing, motion } = useTheme()

    const buttonCss: CSSObject = {
      background: 'transparent',
      border: 'none',
      borderRadius: '50%',
      padding: spacing.xs,
      overflow: 'unset',
      svg: {
        transition: `
        transform ${motion.hover},
        color ${motion.hover}
        `
      },
      '&:hover': {
        transform: 'scale(1.0)',
        svg: {
          transform: 'scale(1.1)'
        }
      },
      '&:active': {
        transform: 'scale(1.0)',
        svg: {
          transform: 'scale(0.98)'
        }
      }
    }

    const rippleCss: CSSObject = {
      '&:hover': {
        backgroundColor: color.neutral.n100
      },
      '&:active': {
        backgroundColor: color.neutral.n150
      },
      '&:focus-visible': {
        border: `1px solid ${color.secondary.secondary}`,
        borderRadius: cornerRadius.s
      }
    }

    return (
      <BaseButton
        ref={ref}
        type='button'
        {...other}
        css={[buttonCss, ripple && rippleCss]}
      >
        <Icon
          aria-hidden
          color={disabled ? 'disabled' : iconColor}
          size={size}
          shadow={shadow}
          height={height}
          width={width}
          css={iconCss}
        />
        {children}
      </BaseButton>
    )
  }
)
