import { useMemo } from 'react'

import { useTheme } from '@emotion/react'

import { motion } from '../../foundations/motion'
import { Flex } from '../layout/Flex'
import { NotificationCount } from '../notification-count'
import { Text } from '../text/Text'

import type { NavItemProps } from './types'

/**
 * A navigation item component, typically used in sidebars or navigation menus.
 * Supports default, hover, and selected states, as well as optional left and right icons.
 */
export const NavItem = ({
  children,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  isSelected = false,
  isFocusVisible = false,
  onClick,
  textSize = 'l',
  hasNotification = false,
  leftOverride,
  variant = 'default',
  isChild = false,
  ...props
}: NavItemProps) => {
  const { color } = useTheme()

  const hasLeftIcon = !!LeftIcon
  const hasRightIcon = !!RightIcon

  const backgroundColor = isSelected ? color.secondary.s400 : undefined

  const textAndIconColor = isSelected ? 'white' : 'default'
  const insetBorderColor = isSelected
    ? 'none'
    : `inset 0 0 0 1px ${color.border.default}`

  const leftIconWithNotification = useMemo(() => {
    const icon = hasLeftIcon ? (
      <LeftIcon size='l' color={textAndIconColor} />
    ) : null

    if (hasNotification && !!icon) {
      return (
        <NotificationCount size='s' isSelected={isSelected}>
          {icon}
        </NotificationCount>
      )
    }
    return icon
  }, [hasNotification, hasLeftIcon, LeftIcon, textAndIconColor, isSelected])

  return (
    <Flex
      alignItems='center'
      gap='s'
      pl='s'
      pr='s'
      w='240px'
      css={{
        cursor: 'pointer',
        transition: `background-color ${motion.hover}`
      }}
      {...props}
      onClick={onClick}
    >
      <Flex
        alignItems='center'
        flex={1}
        gap='m'
        p='s'
        borderRadius='m'
        css={{
          backgroundColor,
          ...(isFocusVisible && {
            boxShadow:
              'inset 0 0 0 2px var(--harmony-focus, var(--harmony-secondary))'
          }),
          transition: `opacity ${motion.quick}`,
          '&:hover': {
            backgroundColor: isSelected ? undefined : color.background.surface2,
            boxShadow: insetBorderColor
          },
          '&:active': {
            opacity: !isSelected ? 0.8 : undefined,
            transition: `opacity ${motion.quick}`
          }
        }}
      >
        <Flex
          alignItems='center'
          gap={variant === 'compact' ? 'xs' : 'm'}
          flex={1}
          h={variant === 'compact' ? 'unit5' : 'unit6'}
          pv='s'
          css={{
            maxWidth: '240px'
          }}
        >
          {leftOverride || leftIconWithNotification}
          <Text
            variant='title'
            size={textSize}
            strength='weak'
            lineHeight='single'
            color={textAndIconColor}
            ellipses
            css={{
              flex: 1,
              marginLeft: isChild ? 'm' : undefined
            }}
          >
            {children}
          </Text>
        </Flex>
        {hasRightIcon ? RightIcon : null}
      </Flex>
    </Flex>
  )
}
