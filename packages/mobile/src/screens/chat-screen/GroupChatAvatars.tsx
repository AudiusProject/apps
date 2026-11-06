import type { User } from '@audius/common/models'
import { css } from '@emotion/native'

import { Flex } from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'

type GroupChatAvatarsProps = {
  users: Pick<User, 'user_id'>[]
  /** Diameter of each avatar in points. */
  size: number
  limit?: number
}

/** Overlapping avatars for a group chat's members. */
export const GroupChatAvatars = ({
  users,
  size,
  limit = 3
}: GroupChatAvatarsProps) => {
  const shown = users.slice(0, limit)
  return (
    <Flex row alignItems='center'>
      {shown.map((user, index) => (
        <ProfilePicture
          key={user.user_id}
          userId={user.user_id}
          borderWidth='thin'
          style={css({
            width: size,
            height: size,
            marginLeft: index === 0 ? 0 : -size / 3,
            zIndex: shown.length - index
          })}
        />
      ))}
    </Flex>
  )
}
