import { useProfileUser } from '@audius/common/api'
import { BlurView } from '@react-native-community/blur'
import { StyleSheet } from 'react-native'
import { useCurrentTabScrollY } from 'react-native-collapsible-tab-view'
import Animated, {
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated'

import { Flex } from '@audius/harmony-native'
import BadgeArtist from 'app/assets/images/badgeArtist.svg'
import { CoverPhoto } from 'app/components/image/CoverPhoto'
import { makeStyles } from 'app/styles'

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView)

const useStyles = makeStyles(({ spacing }) => ({
  coverPhoto: {
    height: 96
  },
  artistBadge: {
    position: 'absolute',
    top: spacing(3),
    right: spacing(3)
  }
}))

export const ProfileCoverPhoto = () => {
  const styles = useStyles()
  const { user_id, track_count } =
    useProfileUser({
      select: (user) => ({
        user_id: user.user_id,
        track_count: user.track_count
      })
    }).user ?? {}

  const scrollY = useCurrentTabScrollY()

  const isArtist = track_count && track_count > 0

  const blurViewStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    opacity: interpolate(scrollY.value, [-100, 0], [1, 0], {
      extrapolateLeft: 'extend',
      extrapolateRight: 'clamp'
    })
  }))

  const badgeStyle = useAnimatedStyle(() => ({
    ...styles.artistBadge,
    transform: [
      {
        translateY: interpolate(scrollY.value, [-200, 0], [-200, 0], {
          extrapolateLeft: 'extend',
          extrapolateRight: 'clamp'
        })
      }
    ]
  }))

  if (!user_id) return null

  return (
    <Flex pointerEvents='none' h={96} backgroundColor='surface2'>
      <CoverPhoto style={styles.coverPhoto} userId={user_id}>
        <AnimatedBlurView
          blurType='dark'
          blurAmount={100}
          style={blurViewStyle}
        />
      </CoverPhoto>
      {isArtist ? (
        <Animated.View style={badgeStyle}>
          <BadgeArtist />
        </Animated.View>
      ) : null}
    </Flex>
  )
}
