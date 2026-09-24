import { useUser } from '@audius/common/api'
import { imageProfilePicEmpty as profilePicEmpty } from '@audius/common/assets'
import { useImageSize } from '@audius/common/hooks'
import { SquareSizes, ID } from '@audius/common/models'
import { pick } from 'lodash'

import { preload } from 'utils/image'

type UseProfilePictureArgs = {
  userId?: ID
  size: SquareSizes
  defaultImage?: string
}

/**
 * Like `useProfilePicture`, but also returns `useImageSize`'s `onError`, so an
 * `<img>` render failure can advance to the next mirror. `preload` alone can
 * miss a node that fails the render request.
 */
export const useProfilePictureSource = ({
  userId,
  size,
  defaultImage
}: UseProfilePictureArgs) => {
  const { data: partialUser } = useUser(userId, {
    select: (user) =>
      pick(user, 'profile_picture', 'updatedProfilePicture', 'is_deactivated')
  })
  const { profile_picture, updatedProfilePicture, is_deactivated } =
    partialUser ?? {}

  const { imageUrl, onError } = useImageSize({
    // Deactivated/deleted accounts must not expose their profile picture
    // (privacy/GDPR) — force the default placeholder instead.
    artwork: is_deactivated ? undefined : profile_picture,
    targetSize: size,
    defaultImage: defaultImage ?? profilePicEmpty,
    preloadImageFn: preload
  })

  if (is_deactivated) {
    return { imageUrl: defaultImage ?? profilePicEmpty, onError: undefined }
  }
  if (updatedProfilePicture) {
    return { imageUrl: updatedProfilePicture.url, onError: undefined }
  }
  return { imageUrl, onError }
}

export const useProfilePicture = (args: UseProfilePictureArgs) =>
  useProfilePictureSource(args).imageUrl
