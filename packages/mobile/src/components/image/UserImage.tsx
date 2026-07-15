import { useUser } from '@audius/common/api'
import { useImageSize } from '@audius/common/hooks'
import type { SquareSizes, ID } from '@audius/common/models'
import { pick } from 'lodash'

import { Image, preload } from '@audius/harmony-native'
import type { ImageProps } from '@audius/harmony-native'
import profilePicEmpty from 'app/assets/images/imageProfilePicEmpty2X.png'

import { primitiveToImageSource } from './primitiveToImageSource'

// Per-URL render timeout (ms) so a stalled Open Audio Validator Node
// advances to the next mirror without waiting on the OS TCP timeout
// (60–90s). Matches the web MirrorImage pattern.
const USER_IMAGE_TIMEOUT_MS = 3000

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
    select: (user) =>
      pick(user, 'profile_picture', 'updatedProfilePicture', 'is_deactivated')
  })

  const { profile_picture, updatedProfilePicture, is_deactivated } =
    partialUser ?? {}
  const {
    imageUrl,
    priorityLowResUrl,
    onError: onImageError
  } = useImageSize({
    // Deactivated/deleted accounts must not expose their profile picture
    // (privacy/GDPR) — force the default placeholder instead.
    artwork: is_deactivated ? undefined : profile_picture,
    targetSize: size,
    defaultImage: '',
    preloadImageFn: async (url: string) => {
      await preload([{ uri: url }])
    }
  })

  if (is_deactivated || imageUrl === '') {
    return {
      source: profilePicEmpty,
      isFallbackImage: true,
      onError: onImageError
    }
  }

  if (updatedProfilePicture) {
    return {
      source: primitiveToImageSource(updatedProfilePicture.url),
      isFallbackImage: false,
      onError: onImageError
    }
  }

  return {
    source: primitiveToImageSource(imageUrl),
    priorityLowResSource: primitiveToImageSource(priorityLowResUrl),
    isFallbackImage: false,
    onError: onImageError
  }
}

export type UserImageProps = UseUserImageOptions & Partial<ImageProps>

export const UserImage = (props: UserImageProps) => {
  const { userId, size, onError, ...imageProps } = props
  const {
    source,
    priorityLowResSource,
    onError: onImageError
  } = useProfilePicture({ userId, size })

  const handleError = (error: { nativeEvent: { error: string } }) => {
    if (source && typeof source === 'object' && 'uri' in source) {
      onImageError?.(source.uri as string)
    }
    onError?.(error)
  }

  return (
    <Image
      {...imageProps}
      source={source}
      priorityLowResSource={priorityLowResSource}
      onError={handleError}
      timeoutMs={USER_IMAGE_TIMEOUT_MS}
    />
  )
}
