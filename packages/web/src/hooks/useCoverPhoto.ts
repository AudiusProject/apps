import { useUser } from '@audius/common/api'
import {
  imageCoverPhotoBlank,
  imageProfilePicEmpty
} from '@audius/common/assets'
import { useImageSize } from '@audius/common/hooks'
import { SquareSizes, WidthSizes, ID } from '@audius/common/models'
import { pick } from 'lodash'

import { preload } from 'utils/image'

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
    select: (user) => pick(user, 'cover_photo', 'updatedCoverPhoto')
  })
  const { cover_photo, updatedCoverPhoto } = partialUser ?? {}
  const { imageUrl } = useImageSize({
    artwork: cover_photo,
    targetSize: size,
    defaultImage: defaultImage ?? imageCoverPhotoBlank,
    preloadImageFn: preload
  })

  const isDefaultCover = imageUrl === imageCoverPhotoBlank
  const isDefaultProfile = profilePicture === imageProfilePicEmpty
  const shouldBlur = isDefaultCover && !isDefaultProfile

  if (updatedCoverPhoto) {
    return { image: updatedCoverPhoto.url, shouldBlur: false }
  }

  return { image: shouldBlur ? profilePicture : imageUrl, shouldBlur }
}
