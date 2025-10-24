import { useUser } from '@audius/common/api'
import type { ID } from '@audius/common/models'

import { Flex, Text } from '@audius/harmony-native'

const messages = {
  followsYou: 'follows you'
}

type FollowsYouBadgeProps = {
  userId: ID
}

export const FollowsYouBadge = (props: FollowsYouBadgeProps) => {
  const { userId } = props
  const { data: doesFollowCurrentUser } = useUser(userId, {
    select: (user) => user?.does_follow_current_user
  })
  if (!doesFollowCurrentUser) return null

  return (
    <Flex
      alignItems='center'
      justifyContent='center'
      borderRadius='s'
      ph='s'
      pv='xs'
      border='strong'
    >
      <Text variant='label' size='xs' strength='strong' color='subdued'>
        {messages.followsYou}
      </Text>
    </Flex>
  )
}
