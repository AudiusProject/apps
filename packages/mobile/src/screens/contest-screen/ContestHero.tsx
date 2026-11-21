import { useRemixContest } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { Image, View } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated'

import { useCurrentTabScrollY } from 'app/components/collapsible-tabs'
import { useTrackImage } from 'app/components/image/TrackImage'

const AnimatedImage = Animated.createAnimatedComponent(Image)

export const CONTEST_HERO_HEIGHT = 220

type ContestHeroProps = {
  trackId: ID
}

export const ContestHero = ({ trackId }: ContestHeroProps) => {
  const { source } = useTrackImage({
    trackId,
    size: SquareSizes.SIZE_1000_BY_1000
  })
  const trackImageUri =
    source && typeof source === 'object' && 'uri' in source
      ? (source as { uri?: string }).uri
      : undefined
  const { data: remixContest } = useRemixContest(trackId)
  const contestCoverPhotoUrl = (remixContest?.eventData as any)
    ?.coverPhotoUrl as string | undefined
  const src = contestCoverPhotoUrl || trackImageUri

  const scrollY = useCurrentTabScrollY()

  const animatedImageStyle = useAnimatedStyle(() => ({
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

  return (
    <View
      pointerEvents='none'
      style={{
        width: '100%',
        height: CONTEST_HERO_HEIGHT
      }}
    >
      {src ? (
        <AnimatedImage
          source={{ uri: src }}
          style={[{ width: '100%', height: '100%' }, animatedImageStyle]}
          resizeMode='cover'
        />
      ) : null}
    </View>
  )
}
