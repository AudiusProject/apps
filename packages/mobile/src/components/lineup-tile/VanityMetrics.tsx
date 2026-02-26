import type { ReactNode } from 'react'

import { useUser } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { TouchableOpacity } from 'react-native'

import type { IconComponent } from '@audius/harmony-native'
import { DEFAULT_HIT_SLOP, Flex, Text } from '@audius/harmony-native'

import { useTilePressBlock } from './TilePressBlockContext'

type VanityMetricProps = {
  icon?: IconComponent
  children?: ReactNode
  onPress?: () => void
  disabled?: boolean
}

export const VanityMetric = (props: VanityMetricProps) => {
  const { icon: Icon, children, onPress, disabled } = props
  const blockTilePress = useTilePressBlock()

  const handlePress = () => {
    if (onPress && !disabled) {
      blockTilePress?.()
      onPress()
    }
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      hitSlop={DEFAULT_HIT_SLOP}
    >
      <Flex row alignItems='center' gap='xs'>
        {Icon ? <Icon size='s' color='subdued' /> : null}
        <Text size='xs' color='subdued'>
          {children}
        </Text>
      </Flex>
    </TouchableOpacity>
  )
}

export const UserName = (props: { userId: ID }) => {
  const { userId } = props
  const { data: userName } = useUser(userId, {
    select: (user) => user?.name
  })

  return <Text>{userName}</Text>
}
