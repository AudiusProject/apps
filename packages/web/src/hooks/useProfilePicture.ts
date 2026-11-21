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
