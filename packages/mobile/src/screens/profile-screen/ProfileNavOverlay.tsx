import { useCallback } from 'react'

import { useCurrentUserId, useProfileUser } from '@audius/common/api'
import { ShareSource } from '@audius/common/models'
import { modalsActions, shareModalUIActions } from '@audius/common/store'
import { BlurView } from '@react-native-community/blur'
import { Platform, StyleSheet, View } from 'react-native'
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
import { isDarkTheme, useThemeColors, useThemeVariant } from 'app/utils/theme'

import { useProfileScrollY } from './ProfileScrollContext'

const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { setVisibility } = modalsActions

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView)

export const PROFILE_NAV_CONTROLS_HEIGHT = 56

export const PROFILE_NAV_SCROLL_FADE_PX = 60

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
    paddingHorizontal: spacing(14),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing(1)
  },
  iconStack: {
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
  const isDarkMode = isDarkTheme(useThemeVariant())
  const { backgroundSurface } = useThemeColors()

  const { data: accountId } = useCurrentUserId()
  const { user_id } =
    useProfileUser({
      select: (user) => ({ user_id: user.user_id })
    }).user ?? {}

  const isOwner = !!user_id && user_id === accountId
  const overlayHeight = insets.top + PROFILE_NAV_CONTROLS_HEIGHT

  const blurBackgroundStyle = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(scrollY.value, [0, PROFILE_NAV_SCROLL_FADE_PX], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })
      : 0
  }))

  const whiteIconsStyle = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(scrollY.value, [0, PROFILE_NAV_SCROLL_FADE_PX], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })
      : 1
  }))

  const neutralIconsStyle = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(scrollY.value, [0, PROFILE_NAV_SCROLL_FADE_PX], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })
      : 0
  }))

  const titleStyle = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(scrollY.value, [0, PROFILE_NAV_SCROLL_FADE_PX], [0, 1], {
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
      {Platform.OS === 'android' ? (
        <Animated.View
          style={[
            styles.blurBackground,
            { backgroundColor: backgroundSurface },
            blurBackgroundStyle
          ]}
        />
      ) : (
        <AnimatedBlurView
          blurType={isDarkMode ? 'dark' : 'light'}
          blurAmount={20}
          style={[styles.blurBackground, blurBackgroundStyle]}
        />
      )}
      <Flex
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        pointerEvents='box-none'
        style={[styles.actionsRow, { top: insets.top }]}
      >
        <Animated.View pointerEvents='none' style={[styles.title, titleStyle]}>
          <UserLink userId={user_id} textVariant='title' size='m' disabled />
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
