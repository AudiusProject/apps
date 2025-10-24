import { Ref, forwardRef } from 'react'

import { CSSObject, useTheme } from '@emotion/react'

import { BaseButton } from '../button/BaseButton/BaseButton'
import { BaseButtonProps } from '../button/BaseButton/types'
import { Text } from '../text'

export type PillProps = BaseButtonProps & {
  variant?: 'default' | 'active' | 'primary' | 'custom'
}

/**
 * The Pill button is located in the sidebar and is used to open the
 * Add Playlist/Add Folder popover menu.
 * It can also be used in the NEW pill in the notification card.
 */
export const Pill = forwardRef(
  (props: PillProps, ref: Ref<HTMLButtonElement>) => {
    const { variant = 'default', children, ...other } = props
    const { onClick } = other
    const { color, spacing, cornerRadius } = useTheme()

    const backgroundColors = {
      default: color.background.surface2,
      active: color.background.accent,
      primary: color.background.primary,
      custom: undefined
    }

    const hoverBackgroundColors = {
      default: color.background.accent,
      active: color.background.accent,
      primary: color.background.accent,
      custom: undefined
    }

    const textColors = {
      default: color.text.subdued,
      active: color.text.white,
      primary: color.text.white,
      custom: color.text.white
    }

    const hoverTextColors = {
      default: color.text.white,
      active: color.text.white,
      primary: color.text.white,
      custom: color.text.white
    }

    const buttonCss: CSSObject = {
      gap: spacing['2xs'],
      paddingInline: 6,
      paddingBlock: spacing.xs,
      borderWidth: 0,
      borderRadius: cornerRadius.circle,
      backgroundColor: backgroundColors[variant],
      color: textColors[variant],
      '&:hover': {
        backgroundColor: hoverBackgroundColors[variant],
        color: hoverTextColors[variant]
      },
      pointerEvents: onClick ? 'auto' : 'none'
    }

    const iconCss = {
      height: 10,
      width: 10
    }

    return (
      <BaseButton
        ref={ref}
        styles={{ button: buttonCss, icon: iconCss }}
        asChild={!onClick}
        {...other}
      >
        <Text variant='label' size='s'>
          {children}
        </Text>
      </BaseButton>
    )
  }
)
