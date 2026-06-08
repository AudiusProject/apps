import { useCallback } from 'react'

import { BlurView } from '@react-native-community/blur'
import { StyleSheet, View } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Flex,
  IconButton,
  IconCaretLeft,
  IconShare,
  Text
} from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'
import { isDarkTheme, useThemeVariant } from 'app/utils/theme'

import { useContestScrollY } from './ContestScrollContext'

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView)

// Height of the nav controls row. The outer ContestScreen uses this
// value to reserve space via `minHeaderHeight` so the overlay never
// overlaps the tab bar at full collapse.
export const CONTEST_NAV_CONTROLS_HEIGHT = 56

// Scroll distance (in px) over which the blur background fades in,
// the title slides into view, and the button icons transition from
// `staticWhite` (on the hero) to the neutral theme color (on the
// blurred white). Kept in sync with the profile nav overlay.
export const CONTEST_NAV_SCROLL_FADE_PX = 140

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
    // Leave space for the icon buttons on either side of the row so
    // long contest titles don't visually collide with them when they
    // fade in.
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

type ContestNavOverlayProps = {
  title: string
  /**
   * Tap handler for the top-right share icon. Replaces the previous
   * kebab/overflow drawer entry — Follow now lives next to "Enter
   * Contest" in the scrolling header so the only persistent overlay
   * action is Share.
   */
  onPressShare?: () => void
}

/**
 * Floating nav bar that sits on top of the contest hero. Starts
 * transparent with `staticWhite` back / share icons so they read on
 * top of the cover image; as the user scrolls the hero out of view
 * a blurred background fades in along with the contest title in the
 * center and neutral-colored icons replace the white ones. Mirrors
 * the profile screen's `ProfileNavOverlay` pattern so both screens
 * share the same header feel.
 *
 * Reads the active tab's scroll position from `ContestScrollContext`
 * (populated by `ContestScrollBridge` inside the collapsible header).
 */
export const ContestNavOverlay = ({
  title,
  onPressShare
}: ContestNavOverlayProps) => {
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const scrollY = useContestScrollY()
  const isDarkMode = isDarkTheme(useThemeVariant())

  const overlayHeight = insets.top + CONTEST_NAV_CONTROLS_HEIGHT

  const blurBackgroundStyle = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(scrollY.value, [0, CONTEST_NAV_SCROLL_FADE_PX], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })
      : 0
  }))

  const whiteIconsStyle = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(scrollY.value, [0, CONTEST_NAV_SCROLL_FADE_PX], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })
      : 1
  }))

  const neutralIconsStyle = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(scrollY.value, [0, CONTEST_NAV_SCROLL_FADE_PX], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })
      : 0
  }))

  const titleStyle = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(scrollY.value, [0, CONTEST_NAV_SCROLL_FADE_PX], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })
      : 0
  }))

  const handleBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  return (
    <View
      pointerEvents='box-none'
      style={[styles.root, { height: overlayHeight }]}
    >
      <AnimatedBlurView
        blurType={isDarkMode ? 'dark' : 'light'}
        blurAmount={20}
        style={[styles.blurBackground, blurBackgroundStyle]}
      />
      <Flex
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        pointerEvents='box-none'
        style={[styles.actionsRow, { top: insets.top }]}
      >
        <Animated.View pointerEvents='none' style={[styles.title, titleStyle]}>
          <Text variant='title' size='m' numberOfLines={1} ellipsizeMode='tail'>
            {title}
          </Text>
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
              icon={IconShare}
              color='staticWhite'
              shadow='emphasis'
              onPress={onPressShare ?? (() => {})}
              aria-label='Share contest'
            />
          </Animated.View>
          <Animated.View
            pointerEvents='none'
            style={[styles.iconLayer, neutralIconsStyle]}
          >
            <IconButton
              icon={IconShare}
              color='default'
              onPress={onPressShare ?? (() => {})}
              aria-label='Share contest'
            />
          </Animated.View>
        </View>
      </Flex>
    </View>
  )
}
