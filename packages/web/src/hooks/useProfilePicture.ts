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
 * Like `useProfilePicture`, but also returns the `onError` callback from
 * `useImageSize`. Callers that render the url in an `<img>` should pass it
 * through, so that a render-time failure (which `preload` can miss — the two
 * requests are separate and a node can fail one and serve the other) advances
 * to the next mirror instead of stranding the image on a dead host.
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
