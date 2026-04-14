import { useCallback } from 'react'

import { useCurrentUserId, useProfileUser } from '@audius/common/api'
import { ShareSource } from '@audius/common/models'
import { modalsActions, shareModalUIActions } from '@audius/common/store'
import { BlurView } from '@react-native-community/blur'
import { StyleSheet } from 'react-native'
import {
  useCurrentTabScrollY,
  useHeaderMeasurements
} from 'react-native-collapsible-tab-view'
import Animated, {
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch } from 'react-redux'

import {
  Flex,
  IconButton,
  IconCaretLeft,
  IconKebabHorizontal,
  IconShare
} from '@audius/harmony-native'
import BadgeArtist from 'app/assets/images/badgeArtist.svg'
import { CoverPhoto } from 'app/components/image/CoverPhoto'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'

const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { setVisibility } = modalsActions

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView)

// Height below the status bar. The avatar is 80px tall and is positioned so
// it extends ~32px below the cover photo, matching the Figma spec.
const COVER_PHOTO_CONTENT_HEIGHT = 96

// Height reserved for the back / action buttons row. Keeps the nav controls
// visible while scrolling and lets the collapsible tab bar rest directly
// beneath them.
export const PROFILE_NAV_CONTROLS_HEIGHT = 56

const useStyles = makeStyles(({ spacing }) => ({
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)'
  },
  navArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3
  },
  navBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)'
  },
  actionsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2)
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
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const { data: accountId } = useCurrentUserId()

  const { user_id, track_count } =
    useProfileUser({
      select: (user) => ({
        user_id: user.user_id,
        track_count: user.track_count
      })
    }).user ?? {}

  const scrollY = useCurrentTabScrollY()
  const headerMeasurements = useHeaderMeasurements()

  const isArtist = !!track_count && track_count > 0
  const isOwner = !!user_id && user_id === accountId
  const coverPhotoHeight = insets.top + COVER_PHOTO_CONTENT_HEIGHT
  const navAreaHeight = insets.top + PROFILE_NAV_CONTROLS_HEIGHT

  const blurViewStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    opacity: interpolate(scrollY.value, [-100, 0], [1, 0], {
      extrapolateLeft: 'extend',
      extrapolateRight: 'clamp'
    })
  }))

  // Counter-translate the nav area by the header's current offset so the
  // back/action buttons stay visually pinned as the collapsible header
  // scrolls up. `headerMeasurements.top` is 0 when fully expanded and
  // becomes negative as the user scrolls.
  const navAreaStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -headerMeasurements.top.value }]
  }))

  // Fade in a dim background behind the nav controls as the header collapses
  // so the buttons stay legible once the cover photo is no longer behind them.
  const navBackgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(-headerMeasurements.top.value, [0, 40], [0, 1], {
      extrapolateLeft: 'clamp',
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

  const handleBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handlePressActions = useCallback(() => {
    if (!user_id) return
    if (!isOwner) {
      dispatch(
        setVisibility({
          modal: 'ProfileActions',
          visible: true
        })
      )
    } else {
      dispatch(
        requestOpenShareModal({
          type: 'profile',
          profileId: user_id,
          source: ShareSource.PAGE
        })
      )
    }
  }, [dispatch, isOwner, user_id])

  if (!user_id) return null

  return (
    <Flex
      pointerEvents='box-none'
      h={coverPhotoHeight}
      backgroundColor='surface2'
    >
      <CoverPhoto style={{ height: coverPhotoHeight }} userId={user_id}>
        <AnimatedBlurView
          blurType='dark'
          blurAmount={100}
          style={blurViewStyle}
        />
        {isArtist ? <Animated.View style={styles.darkOverlay} /> : null}
      </CoverPhoto>
      <Animated.View
        pointerEvents='box-none'
        style={[styles.navArea, { height: navAreaHeight }, navAreaStyle]}
      >
        <Animated.View style={[styles.navBackground, navBackgroundStyle]} />
        <Flex
          direction='row'
          justifyContent='space-between'
          alignItems='center'
          pointerEvents='box-none'
          style={[styles.actionsRow, { top: insets.top }]}
        >
          <IconButton
            icon={IconCaretLeft}
            color='staticWhite'
            shadow='emphasis'
            onPress={handleBack}
            aria-label='Back'
          />
          <IconButton
            icon={isOwner ? IconShare : IconKebabHorizontal}
            color='staticWhite'
            shadow='emphasis'
            onPress={handlePressActions}
            aria-label={isOwner ? 'Share profile' : 'Profile actions'}
          />
        </Flex>
      </Animated.View>
      {isArtist ? (
        <Animated.View style={[styles.artistBadge, badgeStyle]}>
          <BadgeArtist />
        </Animated.View>
      ) : null}
    </Flex>
  )
}
