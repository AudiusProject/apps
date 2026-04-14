import { useCallback } from 'react'

import { useCurrentUserId, useProfileUser } from '@audius/common/api'
import { ShareSource } from '@audius/common/models'
import { modalsActions, shareModalUIActions } from '@audius/common/store'
import { BlurView } from '@react-native-community/blur'
import { StyleSheet, View } from 'react-native'
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
import { UserLink } from 'app/components/user-link'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'

import { useProfileScrollY } from './ProfileScrollContext'

const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { setVisibility } = modalsActions

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView)

// Height of the nav controls row. Exported so ProfileTabNavigator can reserve
// the matching amount of space via minHeaderHeight.
export const PROFILE_NAV_CONTROLS_HEIGHT = 56

// Scroll distance (in px) over which the blur background fades in and the
// button icons transition from white to the neutral theme color.
const FADE_DISTANCE = 60

const useStyles = makeStyles(({ spacing }) => ({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject
  },
  actionsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2)
  },
  title: {
    ...StyleSheet.absoluteFillObject,
    // Leave space for the icon buttons on either side of the row so the
    // title doesn't visually collide with them when it fades in.
    paddingHorizontal: spacing(14),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing(1)
  },
  iconStack: {
    // Wrapper so the two stacked IconButton layers occupy the same space.
    position: 'relative'
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject
  }
}))

export const ProfileNavOverlay = () => {
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const scrollY = useProfileScrollY()

  const { data: accountId } = useCurrentUserId()
  const { user_id } =
    useProfileUser({
      select: (user) => ({ user_id: user.user_id })
    }).user ?? {}

  const isOwner = !!user_id && user_id === accountId
  const overlayHeight = insets.top + PROFILE_NAV_CONTROLS_HEIGHT

  const blurBackgroundStyle = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(scrollY.value, [0, FADE_DISTANCE], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })
      : 0
  }))

  // White icons fade out as the user scrolls past the cover photo.
  const whiteIconsStyle = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(scrollY.value, [0, FADE_DISTANCE], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })
      : 1
  }))

  // Neutral icons fade in as the user scrolls past the cover photo.
  const neutralIconsStyle = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(scrollY.value, [0, FADE_DISTANCE], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })
      : 0
  }))

  // Title fades in alongside the blur background so it only appears once
  // the cover photo has scrolled away.
  const titleStyle = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(scrollY.value, [0, FADE_DISTANCE], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })
      : 0
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

  const actionsIcon = isOwner ? IconShare : IconKebabHorizontal
  const actionsLabel = isOwner ? 'Share profile' : 'Profile actions'

  return (
    <View
      pointerEvents='box-none'
      style={[styles.root, { height: overlayHeight }]}
    >
      <AnimatedBlurView
        blurType='light'
        blurAmount={20}
        reducedTransparencyFallbackColor='white'
        style={[styles.blurBackground, blurBackgroundStyle]}
      />
      <Flex
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        pointerEvents='box-none'
        style={[styles.actionsRow, { top: insets.top }]}
      >
        <Animated.View
          pointerEvents='none'
          style={[styles.title, titleStyle]}
        >
          <UserLink
            userId={user_id}
            textVariant='title'
            size='s'
            badgeSize='2xs'
            disabled
          />
        </Animated.View>
        <View style={styles.iconStack}>
          <Animated.View style={whiteIconsStyle}>
            <IconButton
              icon={IconCaretLeft}
              color='staticWhite'
              shadow='emphasis'
              onPress={handleBack}
              aria-label='Back'
            />
          </Animated.View>
          <Animated.View
            pointerEvents='none'
            style={[styles.iconLayer, neutralIconsStyle]}
          >
            <IconButton
              icon={IconCaretLeft}
              color='default'
              onPress={handleBack}
              aria-label='Back'
            />
          </Animated.View>
        </View>
        <View style={styles.iconStack}>
          <Animated.View style={whiteIconsStyle}>
            <IconButton
              icon={actionsIcon}
              color='staticWhite'
              shadow='emphasis'
              onPress={handlePressActions}
              aria-label={actionsLabel}
            />
          </Animated.View>
          <Animated.View
            pointerEvents='none'
            style={[styles.iconLayer, neutralIconsStyle]}
          >
            <IconButton
              icon={actionsIcon}
              color='default'
              onPress={handlePressActions}
              aria-label={actionsLabel}
            />
          </Animated.View>
        </View>
      </Flex>
    </View>
  )
}
