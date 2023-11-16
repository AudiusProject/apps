import { CSSProperties, forwardRef } from 'react'

import { CSSObject, useTheme } from '@emotion/react'

import { toCSSVariableName } from '../../../utils/styles'
import { BaseButton } from '../BaseButton/BaseButton'
import { ButtonProps, ButtonSize, ButtonType } from '../types'

type CSSCustomProperties = CSSProperties & {
  [index: `--${string}`]: any
}

/**
 * Buttons allow users to trigger an action or event with a single click.
 * For example, you can use a button for allowing the functionality of
 * submitting a form, opening a dialog, canceling an action, or performing
 * a delete operation.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const {
      color,
      hexColor,
      variant = ButtonType.PRIMARY,
      size = ButtonSize.DEFAULT,
      disabled,
      ...baseProps
    } = props
    const { _isHovered, _isPressed, isLoading } = baseProps
    const isDisabled = disabled || isLoading
    const {
      type,
      color: themeColors,
      cornerRadius,
      shadows,
      spacing,
      typography
    } = useTheme()

    // Size Styles
    const smallStyles: CSSObject = {
      gap: spacing.xs,
      height: spacing.unit8,
      paddingInline: spacing.m,
      fontSize: typography.size.s,
      fontWeight: typography.weight.bold,
      lineHeight: typography.lineHeight.s,
      textTransform: 'capitalize'
    }
    const smallIconStyles: CSSObject = {
      zIndex: 1,
      width: spacing.unit4,
      height: spacing.unit4
    }

    const defaultStyles: CSSObject = {
      gap: spacing.s,
      height: spacing.unit12,
      paddingInline: spacing.xl,
      fontSize: typography.size.l,
      fontWeight: typography.weight.bold,
      lineHeight: typography.lineHeight.l,
      textTransform: 'capitalize'
    }
    const defaultIconStyles: CSSObject = {
      zIndex: 1,
      width: spacing.unit5,
      height: spacing.unit5
    }

    const largeStyles: CSSObject = {
      gap: spacing.s,
      height: spacing.unit16,
      paddingInline: spacing.xl,
      fontSize: typography.size.xl,
      fontWeight: typography.weight.bold,
      lineHeight: typography.lineHeight.m,
      letterSpacing: '0.25px',
      textTransform: 'uppercase'
    }
    const largeIconStyles: CSSObject = {
      zIndex: 1,
      width: spacing.unit6,
      height: spacing.unit6
    }

    // Variant Styles
    const primaryStyles: CSSObject = {
      '&:hover': { color: themeColors.static.white },

      ...((_isHovered || _isPressed) && { color: themeColors.static.white }),
      ...(isDisabled && {
        backgroundColor: themeColors.neutral.n150,
        boxShadow: 'none'
      })
    }

    const secondaryHoverStyles: CSSObject = {
      backgroundColor: themeColors.primary.primary,
      color: themeColors.static.white
    }
    const secondaryStyles: CSSObject = {
      backgroundColor: 'transparent',
      color: themeColors.text.default,
      boxShadow: `0 0 0 1px inset ${themeColors.border.strong}`,

      '&:hover': secondaryHoverStyles,
      '&:active': secondaryHoverStyles,

      ...((_isHovered || _isPressed) && secondaryHoverStyles),
      ...(isDisabled && {
        backgroundColor: themeColors.neutral.n150,
        color: themeColors.static.white,
        boxShadow: 'none'
      })
    }

    const tertiaryHoverStyles: CSSObject = {
      backgroundColor: themeColors.background.white,
      boxShadow: `0 0 0 1px inset ${themeColors.border.strong}, ${shadows.mid}`,
      color: themeColors.text.default
    }
    const tertiaryActiveStyles: CSSObject = {
      backgroundColor: themeColors.background.surface2,
      backdropFilter: 'none',
      color: themeColors.text.default,
      boxShadow: `0 0 0 1px inset ${themeColors.border.strong}`
    }
    const tertiaryStyles: CSSObject = {
      backgroundColor:
        type === 'dark' ? 'rgba(50, 51, 77, 0.6)' : 'rgb(255, 255, 255, 0.85)',
      color: themeColors.text.default,
      backdropFilter: 'blur(6px)',
      boxShadow: `0 0 0 1px inset ${themeColors.border.default}, ${shadows.near}`,

      '&:hover': tertiaryHoverStyles,
      '&:active': tertiaryActiveStyles,

      ...(_isHovered && tertiaryHoverStyles),
      ...(_isPressed && tertiaryActiveStyles),
      ...(isDisabled && {
        opacity: 0.45
      })
    }

    const destructiveHoverStyles: CSSObject = {
      backgroundColor: themeColors.special.red,
      color: themeColors.static.white
    }
    const destructiveStyles: CSSObject = {
      backgroundColor: 'transparent',
      color: themeColors.special.red,
      boxShadow: `0 0 0 1px inset ${themeColors.special.red}`,

      '&:hover': destructiveHoverStyles,
      '&:active': destructiveHoverStyles,

      ...((_isHovered || _isPressed) && destructiveHoverStyles),
      ...(isDisabled && {
        opacity: 0.45
      })
    }

    const hoverStyles: CSSObject = {
      boxShadow: shadows.mid,
      '&::before': {
        backgroundColor: 'rgba(255, 255, 255, 0.2)'
      }
    }
    const activeStyles: CSSObject = {
      boxShadow: 'none',
      '&::before': {
        backgroundColor: 'rgba(0, 0, 0, 0.2)'
      }
    }

    const buttonCss: CSSObject = {
      backgroundColor: themeColors.primary.primary,
      color: themeColors.static.white,
      boxSizing: 'border-box',
      border: 'none',
      borderRadius: cornerRadius.s,
      boxShadow: shadows.near,

      ...(size === ButtonSize.SMALL
        ? smallStyles
        : size === ButtonSize.LARGE
        ? largeStyles
        : defaultStyles),

      ...(variant === ButtonType.SECONDARY
        ? secondaryStyles
        : variant === ButtonType.TERTIARY
        ? tertiaryStyles
        : variant === ButtonType.DESTRUCTIVE
        ? destructiveStyles
        : primaryStyles),

      '::before': {
        zIndex: -1,
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0)'
      },

      ...(variant !== ButtonType.TERTIARY && {
        ':hover': hoverStyles,
        ':active': activeStyles,
        ...(_isHovered && hoverStyles),
        ...(_isPressed && activeStyles)
      })
    }

    const iconCss =
      size === ButtonSize.SMALL
        ? smallIconStyles
        : size === ButtonSize.LARGE
        ? largeIconStyles
        : defaultIconStyles

    const style: CSSCustomProperties =
      variant === ButtonType.PRIMARY && !isDisabled
        ? {
            backgroundColor:
              hexColor ||
              (color ? `var(${toCSSVariableName(color)})` : undefined)
          }
        : {}

    return (
      <BaseButton
        ref={ref}
        disabled={isDisabled}
        styles={{
          button: buttonCss,
          icon: iconCss
        }}
        style={style}
        {...baseProps}
      />
    )
  }
)
