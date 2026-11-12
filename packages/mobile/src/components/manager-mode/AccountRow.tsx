import type { ReactNode } from 'react'

import type { UserMetadata } from '@audius/common/models'

import { Flex, Text } from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import { UserBadges } from 'app/components/user-badges'

type AccountRowProps = {
  user: Pick<UserMetadata, 'user_id' | 'name' | 'handle'>
  isSelected?: boolean
  /** Rendered on the right side of the row */
  children?: ReactNode
}

export const AccountRow = ({ user, isSelected, children }: AccountRowProps) => {
  const textColor = isSelected ? 'accent' : 'default'
  return (
    <Flex row alignItems='center' gap='m' flex={1}>
      <ProfilePicture userId={user.user_id} size='large' />
      <Flex flex={1} gap='2xs'>
        <Flex row alignItems='center' gap='xs'>
          <Text
            variant='body'
            size='m'
            strength='strong'
            color={textColor}
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {user.name}
          </Text>
          <UserBadges userId={user.user_id} badgeSize='xs' />
        </Flex>
        <Text variant='body' size='s' color={textColor} numberOfLines={1}>
          @{user.handle}
        </Text>
      </Flex>
      {children}
    </Flex>
  )
}
