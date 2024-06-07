import { ComponentPropsWithoutRef } from 'react'

import { useTheme } from '@emotion/react'
import Color from 'color'

import type { IconComponent } from 'components/icon'
import { SpecialColors } from 'foundations'

import { Flex } from '../layout/Flex'
import { Text } from '../text/Text'

export type MusicBadgeVariant = 'default' | 'accent'

export type MusicBadgeProps = {
  /**
   * The type of the MusicBadge
   */
  variant?: MusicBadgeVariant
  /**
   * The icon to display in the left of the MusicBadge
   */
  icon?: IconComponent
  /**
   * Override the colors of the MusicBadge
   */
  color?: SpecialColors
} & ComponentPropsWithoutRef<'div'>

export const MusicBadge = (props: MusicBadgeProps) => {
  const { variant = 'default', icon: Icon, color: colorProp, children } = props
  const { color } = useTheme()

  const backgroundColor = colorProp
    ? color.special[colorProp]
    : variant === 'default'
    ? color.background.default
    : color.background.accent
  const textColor = colorProp
    ? color.special[colorProp]
    : variant === 'default'
    ? color.text.default
    : color.text.accent
  const iconColor = colorProp
    ? color.special[colorProp]
    : variant === 'default'
    ? color.icon.default
    : color.icon.accent
  const borderColor = colorProp
    ? Color(color.special[colorProp]).fade(0.5).toString()
    : variant === 'default'
    ? color.border.strong
    : color.border.accent

  return (
    <Flex
      alignItems='center'
      justifyContent='center'
      borderRadius='s'
      border='strong'
      gap='s'
      h='2xl'
      ph='m'
      css={{
        backgroundColor: Color(backgroundColor).fade(0.92).toString(),
        borderColor
      }}
    >
      {Icon ? <Icon size='m' fill={iconColor} /> : null}
      <Text variant='label' css={{ color: textColor }}>
        {children}
      </Text>
    </Flex>
  )
}
