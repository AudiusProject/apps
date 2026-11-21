import { useUser } from '@audius/common/api'
import type { ID, User } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'

import type { AvatarProps } from '@audius/harmony-native'
import { Avatar } from '@audius/harmony-native'

import { useProfilePicture } from '../image/UserImage'

const messages = {
  profilePictureFor: 'Profile picture for'
}

const PROFILE_PICTURE_TIMEOUT_MS = 3000

type BaseAvatarProps = Omit<AvatarProps, 'source' | 'accessibilityLabel'>

type ProfilePictureUserProps =
  | {
      userId: ID | undefined | null
    }
  | { user: Pick<User, 'user_id' | 'name' | 'profile_picture_sizes'> }

export type ProfilePictureProps = BaseAvatarProps & ProfilePictureUserProps

export const ProfilePicture = (props: ProfilePictureProps) => {
  const { onError: callerOnError, ...restProps } = props as BaseAvatarProps &
    ProfilePictureUserProps
  const userId = 'user' in restProps ? restProps.user.user_id : restProps.userId

  const { data: userQuery } = useUser(userId, {
    enabled: !('user' in restProps)
  })
  const user = 'user' in restProps ? restProps.user : userQuery

  const accessibilityLabel = `${messages.profilePictureFor} ${user?.name}`

  const {
    source,
    priorityLowResSource,
    onError: onImageError
  } = useProfilePicture({
    userId,
    size: SquareSizes.SIZE_150_BY_150
  })

  const handleError = (error: { nativeEvent: { error: string } }) => {
    if (source && typeof source === 'object' && 'uri' in source) {
      onImageError?.(source.uri as string)
    }
    callerOnError?.(error)
  }

  return (
    <Avatar
      {...restProps}
      source={source}
      priorityLowResSource={priorityLowResSource}
      accessibilityLabel={accessibilityLabel}
      onError={handleError}
      timeoutMs={PROFILE_PICTURE_TIMEOUT_MS}
    />
  )
}
