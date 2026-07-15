import { useUser } from '@audius/common/api'
import {
  imageCoverPhotoBlank,
  imageProfilePicEmpty
} from '@audius/common/assets'
import { useImageSize } from '@audius/common/hooks'
import { SquareSizes, WidthSizes, ID } from '@audius/common/models'
import { pick } from 'lodash'

import { preload } from 'utils/image'

import { shouldUseProfilePictureAsCoverPhoto } from './useCoverPhotoUtils'
import { useProfilePicture } from './useProfilePicture'

export const useCoverPhoto = ({
  userId,
  size,
  defaultImage
}: {
  userId?: ID
  size: WidthSizes
  defaultImage?: string
}) => {
  const profilePicture = useProfilePicture({
    userId,
    size:
      size === WidthSizes.SIZE_640
        ? SquareSizes.SIZE_480_BY_480
        : SquareSizes.SIZE_1000_BY_1000,
    defaultImage: imageProfilePicEmpty
  })
  const { data: partialUser } = useUser(userId, {
    select: (user) =>
      pick(user, 'cover_photo', 'updatedCoverPhoto', 'is_deactivated')
  })
  const { cover_photo, updatedCoverPhoto, is_deactivated } = partialUser ?? {}
  const { imageUrl } = useImageSize({
    // Deactivated/deleted accounts must not expose their cover photo
    // (privacy/GDPR) — force the default placeholder instead.
    artwork: is_deactivated ? undefined : cover_photo,
    targetSize: size,
    defaultImage: defaultImage ?? imageCoverPhotoBlank,
    preloadImageFn: preload
  })

  const isDefaultCover = imageUrl === imageCoverPhotoBlank
  const isDefaultProfile = profilePicture === imageProfilePicEmpty
  const shouldBlur = isDefaultCover && !isDefaultProfile
  const shouldUseProfilePicture = shouldUseProfilePictureAsCoverPhoto({
    coverPhoto: cover_photo,
    profilePicture,
    defaultProfilePicture: imageProfilePicEmpty
  })

  if (is_deactivated) {
    return { image: defaultImage ?? imageCoverPhotoBlank, shouldBlur: false }
  }
  if (updatedCoverPhoto) {
    return { image: updatedCoverPhoto.url, shouldBlur: false }
  }
  if (shouldUseProfilePicture) {
    return { image: profilePicture, shouldBlur: true }
  }

  return { image: shouldBlur ? profilePicture : imageUrl, shouldBlur }
}
