import { useUserByParams } from '@audius/common/api'
import { BlurView } from '@react-native-community/blur'
import { StyleSheet } from 'react-native'
import { useCurrentTabScrollY } from 'react-native-collapsible-tab-view'
import Animated, {
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Flex } from '@audius/harmony-native'
import BadgeArtist from 'app/assets/images/badgeArtist.svg'
import { CoverPhoto } from 'app/components/image/CoverPhoto'
import { useRoute } from 'app/hooks/useRoute'
import { makeStyles } from 'app/styles'

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView)

// Height below the status bar. The avatar is 80px tall and is positioned so
// it extends ~32px below the cover photo, matching the Figma spec.
export const COVER_PHOTO_CONTENT_HEIGHT = 96

const useStyles = makeStyles(({ spacing }) => ({
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)'
  },
  artistBadge: {
    position: 'absolute',
    right: spacing(4),
    bottom: spacing(2)
  }
}))

export const ProfileCoverPhoto = () => {
  const styles = useStyles()
  const insets = useSafeAreaInsets()

  // Read from the route-params cache directly so user data is available on
  // the first render, avoiding the Redux-state race in `useProfileUser`
  // that caused the cover photo to pop in late and shift layout.
  const { params } = useRoute<'Profile'>()
  const { data: paramsUser } = useUserByParams(params, {
    select: (user) => ({
      user_id: user.user_id,
      track_count: user.track_count
    })
  })
  const { user_id, track_count } = paramsUser ?? {}

  const scrollY = useCurrentTabScrollY()

  const isArtist = !!track_count && track_count > 0
  const coverPhotoHeight = insets.top + COVER_PHOTO_CONTENT_HEIGHT

  const blurViewStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    opacity: interpolate(scrollY.value, [-100, 0], [1, 0], {
      extrapolateLeft: 'extend',
      extrapolateRight: 'clamp'
    })
  }))

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(scrollY.value, [-200, 0], [-200, 0], {
          extrapolateLeft: 'extend',
          extrapolateRight: 'clamp'
        })
      }
    ]
  }))

  return (
    <Flex
      pointerEvents='box-none'
      h={coverPhotoHeight}
      backgroundColor='surface2'
    >
      {user_id ? (
        <>
          <CoverPhoto style={{ height: coverPhotoHeight }} userId={user_id}>
            <AnimatedBlurView
              blurType='dark'
              blurAmount={100}
              style={blurViewStyle}
            />
            {isArtist ? <Animated.View style={styles.darkOverlay} /> : null}
          </CoverPhoto>
          {isArtist ? (
            <Animated.View style={[styles.artistBadge, badgeStyle]}>
              <BadgeArtist />
            </Animated.View>
          ) : null}
        </>
      ) : null}
    </Flex>
  )
}
