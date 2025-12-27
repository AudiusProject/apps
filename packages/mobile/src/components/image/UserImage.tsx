import { useCallback } from 'react'

import { useUser } from '@audius/common/api'
import { useImageSize } from '@audius/common/hooks'
import type { SquareSizes, ID } from '@audius/common/models'
import { pick } from 'lodash'

import { FastImage, preload } from '@audius/harmony-native'
import type { FastImageProps } from '@audius/harmony-native'
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
  const { imageUrl, onError } = useImageSize({
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
      isFallbackImage: true,
      onError
    }
  }

  if (updatedProfilePicture) {
    return {
      source: primitiveToImageSource(updatedProfilePicture.url),
      isFallbackImage: false,
      onError
    }
  }

  return {
    source: primitiveToImageSource(imageUrl),
    isFallbackImage: false,
    onError
  }
}

export type UserImageProps = UseUserImageOptions & Partial<FastImageProps>

export const UserImage = (props: UserImageProps) => {
  const { userId, size, ...imageProps } = props
  const { source, onError } = useProfilePicture({ userId, size })

  const handleError = useCallback(() => {
    if (source && typeof source === 'object' && 'uri' in source && source.uri) {
      onError(source.uri)
    }
  }, [source, onError])

  return <FastImage {...imageProps} source={source} onError={handleError} />
}
