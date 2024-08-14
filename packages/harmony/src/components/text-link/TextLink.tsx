import { Ref, forwardRef } from 'react'

import { useTheme } from '@emotion/react'
import { Slot } from '@radix-ui/react-slot'

import { Text } from '../text'

import type { TextLinkProps } from './types'

/**
 * Also known as hyperlinks, these are words or phrases that can be clicked to navigate to a linked webpage.
 */
export const TextLink = forwardRef((props: TextLinkProps, ref: Ref<'a'>) => {
  const {
    asChild = false,
    children,
    variant = 'default',
    isActive,
    isExternal = false,
    onClick,
    textVariant,
    showUnderline,
    applyHoverStylesToInnerSvg,
    disabled,
    ...other
  } = props

  const { color, spacing, motion } = useTheme()

  const variantColors = {
    default: color.link.default,
    subdued: color.link.subdued,
    visible: color.link.visible,
    inverted: color.static.white,
    secondary: color.secondary.secondary,
    active: color.primary.primary
  }

  const variantHoverColors = {
    default: color.primary.p300,
    subdued: color.primary.p300,
    visible: color.link.visible,
    inverted: color.static.white,
    secondary: color.secondary.secondary,
    active: color.primary.primary
  }

  const hoverStyles = {
    textDecoration: 'underline',
    color: variantHoverColors[variant],
    ...(applyHoverStylesToInnerSvg
      ? {
          path: {
            fill: variantHoverColors[variant]
          }
        }
      : {})
  }

  return (
    <Text
      ref={ref}
      asChild
      onClick={onClick}
      css={{
        display: 'inline-flex',
        gap: spacing.s,
        color: variantColors[variant],
        textDecoration: 'none',
        transition: `color ${motion.hover}`,
        cursor: 'pointer',
        pointerEvents: disabled ? 'none' : undefined,
        ':hover': hoverStyles,
        ...(isActive && { ...hoverStyles, textDecoration: 'none' }),
        ...(showUnderline && hoverStyles)
      }}
      variant={textVariant}
      {...other}
    >
      {asChild ? (
        <Slot>{children}</Slot>
      ) : (
        <a
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noreferrer' : undefined}
        >
          {children}
        </a>
      )}
    </Text>
  )
})
