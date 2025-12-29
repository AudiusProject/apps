import { useUser } from '@audius/common/api'
import { useImageSize } from '@audius/common/hooks'
import type { SquareSizes, ID } from '@audius/common/models'
import { pick } from 'lodash'

import { Image, preload } from '@audius/harmony-native'
import type { ImageProps } from '@audius/harmony-native'
import profilePicEmpty from 'app/assets/images/imageProfilePicEmpty2X.png'

import { primitiveToImageSource } from './primitiveToImageSource'

type UseUserImageOptions = {
  userId: ID | null | undefined
  size: SquareSizes
}

export const useProfilePicture = ({
  userId,
  size
}: {
  userId?: ID | null
  size: SquareSizes
  defaultImage?: string
}) => {
  const { data: partialUser } = useUser(userId, {
    select: (user) => pick(user, 'profile_picture', 'updatedProfilePicture')
  })

  const { profile_picture, updatedProfilePicture } = partialUser ?? {}
  const { imageUrl } = useImageSize({
    artwork: profile_picture,
    targetSize: size,
    defaultImage: '',
    preloadImageFn: async (url: string) => {
      await preload([{ uri: url }])
    }
  })

  if (imageUrl === '') {
    return {
      source: profilePicEmpty,
      isFallbackImage: true
    }
  }

  if (updatedProfilePicture) {
    return {
      source: primitiveToImageSource(updatedProfilePicture.url),
      isFallbackImage: false
    }
  }

  return {
    source: primitiveToImageSource(imageUrl),
    isFallbackImage: false
  }
}

export type UserImageProps = UseUserImageOptions & Partial<ImageProps>

export const UserImage = (props: UserImageProps) => {
  const { userId, size, ...imageProps } = props
  const { source } = useProfilePicture({ userId, size })

  return <Image {...imageProps} source={source} />
}
