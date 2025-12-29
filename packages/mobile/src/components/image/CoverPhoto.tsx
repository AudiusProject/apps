import { useUser } from '@audius/common/api'
import { useImageSize } from '@audius/common/hooks'
import type { ID } from '@audius/common/models'
import { SquareSizes, WidthSizes } from '@audius/common/models'
import { BlurView } from '@react-native-community/blur'
import { pick } from 'lodash'
import { StyleSheet } from 'react-native'
import { useCurrentTabScrollY } from 'react-native-collapsible-tab-view'
import Animated, {
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated'

import type { ImageProps } from '@audius/harmony-native'
import { Image, preload } from '@audius/harmony-native'

import { useProfilePicture } from './UserImage'
import { primitiveToImageSource } from './primitiveToImageSource'

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView)

export const useCoverPhoto = ({
  userId,
  size
}: {
  userId?: ID
  size: WidthSizes
}) => {
  const { source: profilePicture, isFallbackImage: isDefaultProfile } =
    useProfilePicture({
      userId,
      size:
        size === WidthSizes.SIZE_640
          ? SquareSizes.SIZE_480_BY_480
          : SquareSizes.SIZE_1000_BY_1000,
      defaultImage: ''
    })
  const { data: partialUser } = useUser(userId, {
    select: (user) => pick(user, 'cover_photo', 'updatedCoverPhoto')
  })
  const { cover_photo, updatedCoverPhoto } = partialUser ?? {}
  const coverPhoto = cover_photo
  const { imageUrl } = useImageSize({
    artwork: coverPhoto,
    targetSize: size,
    defaultImage: '',
    preloadImageFn: async (url: string) => {
      await preload([{ uri: url }])
    }
  })

  const isDefaultCover = imageUrl === ''
  const shouldBlur = isDefaultCover && !isDefaultProfile

  if (updatedCoverPhoto && !shouldBlur) {
    return {
      source: primitiveToImageSource(updatedCoverPhoto.url),
      shouldBlur
    }
  }

  if (shouldBlur) {
    return { source: profilePicture, shouldBlur }
  }
  return { source: primitiveToImageSource(imageUrl), shouldBlur }
}

type CoverPhotoProps = {
  userId: ID
} & Partial<ImageProps>

export const CoverPhoto = (props: CoverPhotoProps) => {
  const { userId, ...imageProps } = props
  const scrollY = useCurrentTabScrollY()

  const { source, shouldBlur } = useCoverPhoto({
    userId,
    size: WidthSizes.SIZE_640
  })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(scrollY.value, [-200, 0], [4, 1], {
          extrapolateLeft: 'extend',
          extrapolateRight: 'clamp'
        })
      },
      {
        translateY: interpolate(scrollY.value, [-200, 0], [-40, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })
      }
    ]
  }))

  const blurViewStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    opacity: interpolate(scrollY.value, [-100, 0], [1, 0], {
      extrapolateLeft: 'extend',
      extrapolateRight: 'clamp'
    })
  }))

  if (!source) return null

  return (
    <Animated.View style={animatedStyle}>
      <Image source={source} {...imageProps}>
        {shouldBlur || scrollY ? (
          <AnimatedBlurView
            blurType='light'
            blurAmount={20}
            style={blurViewStyle}
          />
        ) : null}
      </Image>
    </Animated.View>
  )
}
