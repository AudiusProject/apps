import { useUser } from '@audius/common/api'
import type { ID, User } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'

import type { AvatarProps } from '@audius/harmony-native'
import { Avatar } from '@audius/harmony-native'

import { useProfilePicture } from '../image/UserImage'

const messages = {
  profilePictureFor: 'Profile picture for'
}

// Per-URL render timeout (ms) so a hung connection from a slow Open Audio
// Validator Node advances to the next mirror instead of blocking on the OS
// TCP timeout (60–90s). Matches the web MirrorImage pattern.
const PROFILE_PICTURE_TIMEOUT_MS = 3000

type BaseAvatarProps = Omit<AvatarProps, 'source' | 'accessibilityLabel'>

// User should prefer userId, and provide user if it's not in the cache
type ProfilePictureUserProps =
  | {
      userId: ID | undefined | null
    }
  | { user: Pick<User, 'user_id' | 'name' | 'profile_picture_sizes'> }

export type ProfilePictureProps = BaseAvatarProps & ProfilePictureUserProps

export const ProfilePicture = (props: ProfilePictureProps) => {
  // Pull onError off so we can chain it with the mirror-retry handler from
  // `useProfilePicture` instead of being clobbered by the props spread.
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

  // Forward render-time failures to `useImageSize` so it can mark the URL
  // failed and swap in the next mirror. Without this wiring the mirror
  // retry only ever fires on prefetch failures, not on stalled renders.
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
