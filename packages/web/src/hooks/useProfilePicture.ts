import { useUser } from '@audius/common/api'
import { imageProfilePicEmpty as profilePicEmpty } from '@audius/common/assets'
import { useImageSize } from '@audius/common/hooks'
import { SquareSizes, ID } from '@audius/common/models'
import { pick } from 'lodash'

import { preload } from 'utils/image'

export const useProfilePicture = ({
  userId,
  size,
  defaultImage
}: {
  userId?: ID
  size: SquareSizes
  defaultImage?: string
}) => {
  const { data: partialUser } = useUser(userId, {
    select: (user) =>
      pick(user, 'profile_picture', 'updatedProfilePicture', 'is_deactivated')
  })
  const { profile_picture, updatedProfilePicture, is_deactivated } =
    partialUser ?? {}

  const { imageUrl } = useImageSize({
    // Deactivated/deleted accounts must not expose their profile picture
    // (privacy/GDPR) — force the default placeholder instead.
    artwork: is_deactivated ? undefined : profile_picture,
    targetSize: size,
    defaultImage: defaultImage ?? profilePicEmpty,
    preloadImageFn: preload
  })

  if (is_deactivated) {
    return defaultImage ?? profilePicEmpty
  }
  if (updatedProfilePicture) {
    return updatedProfilePicture.url
  }
  return imageUrl
}
