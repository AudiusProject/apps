import { ComponentProps, useMemo } from 'react'

import { Text, TextProps } from '@audius/harmony'
import { CSSInterpolation } from '@emotion/css'
import { Interpolation, Theme, useTheme } from '@emotion/react'
import { Slot } from '@radix-ui/react-slot'
import { NavLink, NavLinkProps } from 'react-router-dom'

export type LeftNavLinkProps =
  | { disabled?: boolean; asChild?: boolean } & (
      | Omit<NavLinkProps, 'onDrop'>
      | Omit<ComponentProps<'div'>, 'onDrop'>
    )

export const LeftNavLink = (props: LeftNavLinkProps) => {
  const { asChild, disabled, children, ...other } = props

  const theme = useTheme()

  const css = useMemo(() => {
    const { color, spacing, typography, cornerRadius } = theme
    const indicatorCss: CSSInterpolation = {
      content: '""',
      display: 'block',
      width: spacing.unit5,
      height: spacing.unit5,
      position: 'absolute',
      top: 0,
      bottom: 0,
      margin: 'auto 0',
      left: -spacing.l,
      borderRadius: cornerRadius.s,
      borderRightWidth: cornerRadius.s,
      borderRightStyle: 'solid',
      borderRightColor: 'transparent'
    }

    const linkInteractionCss: CSSInterpolation = {
      '&:hover': {
        cursor: 'pointer',
        color: color.neutral.n950
      },
      '&:hover:before': [
        indicatorCss,
        {
          borderRightColor: color.neutral.n400
        }
      ],
      '&.active': {
        color: color.text.active,
        fontWeight: typography.weight.medium
      },
      '&.active:before': [
        indicatorCss,
        {
          borderRightColor: color.primary.primary
        }
      ]
    }

    const disabledDropCss: CSSInterpolation = {
      opacity: 0.6,
      cursor: 'not-allowed'
    }

    const combined: Interpolation<Theme> = [
      {
        position: 'relative',
        height: spacing.xl,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.s,
        minWidth: 100,
        // Leaves space for the hover indicator
        paddingLeft: spacing.unit7,
        paddingRight: spacing.l,
        color: color.text.default,
        border: 0,
        background: 'none',
        textAlign: 'inherit'
      },
      linkInteractionCss,
      disabled && disabledDropCss
    ]
    return combined
  }, [disabled, theme])

  const TextComp = asChild ? Slot : Text
  const textProps = asChild
    ? undefined
    : ({
        tag: 'span',
        size: 's',
        css: { display: 'flex', alignItems: 'center' }
      } as TextProps<'span'>)

  if ('to' in other) {
    return (
      <NavLink {...other} activeClassName='active' css={css}>
        <TextComp {...textProps}>{children}</TextComp>
      </NavLink>
    )
  }
  return (
    <div {...other} css={css}>
      <TextComp {...textProps}>{children}</TextComp>
    </div>
  )
}
