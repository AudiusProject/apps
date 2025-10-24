import { useUser } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { Flex, Text } from '@audius/harmony'

const messages = {
  followsYou: 'follows you'
}

type FollowsYouBadgeProps = {
  userId: ID
  variant?: 'standard' | 'flat'
}

const FollowsYouBadge = ({
  userId,
  variant = 'standard'
}: FollowsYouBadgeProps) => {
  const { data: doesFollowCurrentUser } = useUser(userId, {
    select: (user) => user.does_follow_current_user
  })

  if (!doesFollowCurrentUser) return null

  return (
    <Flex
      alignItems='center'
      justifyContent='center'
      borderRadius='s'
      ph='s'
      pv='xs'
      backgroundColor={variant === 'standard' ? 'white' : undefined}
      shadow={variant === 'standard' ? 'near' : undefined}
      border={variant === 'flat' ? 'strong' : undefined}
    >
      <Text variant='label' size='xs' strength='strong' color='subdued'>
        {messages.followsYou}
      </Text>
    </Flex>
  )
}

export default FollowsYouBadge
