import { Flex, useTheme } from '@audius/harmony'

import type { IconComponent } from '@audius/harmony'

type CollapsedNavItemProps = {
  icon: IconComponent
  isSelected?: boolean
  disabled?: boolean
  onClick?: () => void
}

export const CollapsedNavItem = ({
  icon: Icon,
  isSelected = false,
  disabled = false,
  onClick
}: CollapsedNavItemProps) => {
  const { color, motion } = useTheme()

  const backgroundColor = isSelected ? color.secondary.s400 : undefined
  const insetBorderColor = isSelected
    ? 'none'
    : `inset 0 0 0 1px ${color.border.default}`

  return (
    <Flex
      w='64px'
      alignItems='center'
      justifyContent='center'
      pv='xs'
      css={{ cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}
      onClick={onClick}
    >
      <Flex
        alignItems='center'
        justifyContent='center'
        borderRadius='m'
        css={{
          width: 40,
          height: 40,
          backgroundColor,
          transition: `background-color ${motion.hover}`,
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
        <Icon size='l' color={isSelected ? 'white' : 'default'} />
      </Flex>
    </Flex>
  )
}
