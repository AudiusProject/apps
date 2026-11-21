import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { playbackSelectors } from '@audius/common/store'
import { useNavigationState } from '@react-navigation/native'
import type {
  GestureResponderEvent,
  PanResponderGestureState
} from 'react-native'
import {
  Animated,
  Keyboard,
  Platform,
  View,
  StatusBar,
  Pressable,
  StyleSheet
} from 'react-native'
import Reanimated, {
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector } from 'react-redux'

import {
  BOTTOM_BAR_HEIGHT,
  COLLAPSE_DROP_START,
  FLOATING_BAR_HEIGHT,
  FLOATING_BAR_TOP_GAP,
  useFloatingTabBar
} from 'app/components/bottom-tab-bar'
import { useCommentDrawer } from 'app/components/comments/CommentDrawerContext'
import { SetPlayBarVisibilityContext } from 'app/components/core/BottomBarInsetContext'
import Drawer, {
  DrawerAnimationStyle,
  useFullDrawerHeight
} from 'app/components/drawer'
import { Scrubber } from 'app/components/scrubber'
import { useDrawer } from 'app/hooks/useDrawer'
import { useNavigation } from 'app/hooks/useNavigation'
import { AppDrawerContext } from 'app/screens/app-drawer-screen'
import { AppTabNavigationContext } from 'app/screens/app-screen'
import { useTabBarHiddenProgress } from 'app/screens/app-screen/TabBarAutoHideContext'
import { makeStyles } from 'app/styles'
import { zIndex } from 'app/utils/zIndex'

import { ActionsBar } from './ActionsBar'
import { Artwork } from './Artwork'
import { AudioControls } from './AudioControls'
import { CommentBubble } from './CommentBubble'
import { Logo } from './Logo'
import { PlayBar } from './PlayBar'
import { TitleBar } from './TitleBar'
import { TrackInfo } from './TrackInfo'
import { WaveformScrubber } from './WaveformScrubber'
import { PLAY_BAR_HEIGHT } from './constants'
import { useNowPlayingControls } from './useNowPlayingControls'

const { getPlaying, getTrackId, getBuffering } = playbackSelectors

const STATUS_BAR_FADE_CUTOFF = 0.6

const INSET_STATUS_BAR_HIDE_THRESHOLD = 20

const useStyles = makeStyles(({ palette, spacing }) => ({
  container: {
    paddingTop: 0,
    justifyContent: 'space-evenly'
  },
  playBarContainer: {
    position: 'absolute',
    width: '100%',
    top: 0
  },
  floatingDrawer: {
    overflow: 'visible',
    backgroundColor: 'transparent'
  },
  floatingBackground: {
    backgroundColor: palette.white,
    borderTopLeftRadius: spacing(10),
    borderTopRightRadius: spacing(10)
  },
  controlsContainer: {
    marginHorizontal: spacing(6),
    marginBottom: spacing(6)
  },
  titleBarContainer: {
    marginBottom: spacing(4)
  },
  artworkContainer: {
    flexShrink: 1,
    marginBottom: spacing(5)
  },
  trackInfoContainer: {
    marginHorizontal: spacing(6),
    marginBottom: spacing(3)
  },
  scrubberContainer: {
    marginHorizontal: spacing(6)
  },
  commentBubbleSpace: {
    height: spacing(8)
  }
}))

type NowPlayingDrawerProps = {
  translationAnim: Animated.Value
}

export const NowPlayingDrawer = memo(function NowPlayingDrawer(
  props: NowPlayingDrawerProps
) {
  const { translationAnim } = props
  const { navigation: contextNavigation } = useContext(AppTabNavigationContext)
  const navigation = useNavigation({
    customNavigation: contextNavigation
  })
  const insets = useSafeAreaInsets()
  const staticTopInset = useRef(insets.top)
  const styles = useStyles()
  const FULL_DRAWER_HEIGHT = useFullDrawerHeight()

  const { isOpen, onOpen, onClose } = useDrawer('NowPlaying')
  const tabBarHidden = useTabBarHiddenProgress()
  const { isOpen: isCommentDrawerOpen } = useCommentDrawer()
  const currentTrackId = useSelector(getTrackId)
  const isPlaying = useSelector(getPlaying)
  const isBuffering = useSelector(getBuffering)
  const [isPlayBarShowing, setIsPlayBarShowing] = useState(false)
  const setPlayBarVisible = useContext(SetPlayBarVisibilityContext)
  useLayoutEffect(() => {
    setPlayBarVisible(isPlayBarShowing)
  }, [isPlayBarShowing, setPlayBarVisible])

  const { drawerNavigation } = useContext(AppDrawerContext)

  const isInChatScreen = useNavigationState((state) => {
    const routes = state.routes[0].state?.routes?.[0].state?.routes
    return routes?.some((route) => route.name === 'Chat')
  })

  useEffect(() => {
    if (isPlaying && !isPlayBarShowing) {
      setIsPlayBarShowing(true)
    }
  }, [isPlaying, isPlayBarShowing])

  useEffect(() => {
    if (!currentTrackId) {
      setIsPlayBarShowing(false)
    }
  }, [currentTrackId])

  const onDrawerOpen = useCallback(() => {
    Keyboard.dismiss()
    onOpen()
  }, [onOpen])

  const drawerPercentOpen = useRef(0)
  const onDrawerPercentOpen = useCallback(
    (percentOpen: number) => {
      drawerPercentOpen.current = percentOpen
    },
    [drawerPercentOpen]
  )

  useEffect(() => {
    if (staticTopInset.current === 0 && insets.top > 0) {
      staticTopInset.current = insets.top
    }
  }, [staticTopInset, insets.top])

  const isDrawerFullyOpen = drawerPercentOpen.current > 0.8
  const effectiveTopInset =
    isOpen && isDrawerFullyOpen ? staticTopInset.current : insets.top
  const effectiveBottomInset = isOpen && isDrawerFullyOpen ? 0 : insets.bottom

  const floating = useFloatingTabBar()

  const playBarDrop = floating
    ? FLOATING_BAR_HEIGHT +
      FLOATING_BAR_TOP_GAP -
      (FLOATING_BAR_HEIGHT - PLAY_BAR_HEIGHT) / 2
    : BOTTOM_BAR_HEIGHT
  const chromeHideStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateY: isOpen
            ? 0
            : playBarDrop *
              (floating
                ? interpolate(
                    tabBarHidden.value,
                    [COLLAPSE_DROP_START, 1],
                    [0, 1],
                    'clamp'
                  )
                : tabBarHidden.value)
        }
      ]
    }),
    [isOpen, playBarDrop, floating]
  )

  const collapsedPosition =
    FULL_DRAWER_HEIGHT - insets.bottom - BOTTOM_BAR_HEIGHT - PLAY_BAR_HEIGHT
  const fullPlayerOpacity = useMemo(
    () =>
      translationAnim.interpolate({
        inputRange: [collapsedPosition - 160, collapsedPosition],
        outputRange: [1, 0],
        extrapolate: 'clamp'
      }),
    [translationAnim, collapsedPosition]
  )

  useEffect(() => {
    if (
      Platform.OS === 'ios' &&
      staticTopInset.current > INSET_STATUS_BAR_HIDE_THRESHOLD
    ) {
      if (isOpen) {
        StatusBar.setHidden(true, 'fade')
      } else {
        StatusBar.setHidden(false, 'fade')
      }
    }
  }, [isOpen])

  const onPanResponderMove = useCallback(
    (e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      if (
        Platform.OS === 'ios' &&
        staticTopInset.current > INSET_STATUS_BAR_HIDE_THRESHOLD
      ) {
        if (gestureState.vy > 0) {
          if (drawerPercentOpen.current < STATUS_BAR_FADE_CUTOFF) {
            StatusBar.setHidden(false, 'fade')
          }
        } else if (gestureState.vy < 0) {
          if (drawerPercentOpen.current > STATUS_BAR_FADE_CUTOFF) {
            StatusBar.setHidden(true, 'fade')
          }
        }
      }
    },
    [drawerPercentOpen]
  )

  const onPanResponderRelease = useCallback(
    (e: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
      drawerNavigation?.setOptions({ swipeEnabled: false })
    },
    [drawerNavigation]
  )

  const [isGestureEnabled, setIsGestureEnabled] = useState(true)

  const {
    track,
    trackId,
    user,
    trackDuration,
    mediaKey,
    isLongFormContent,
    isNowPlayingCommentsEnabled,
    isWaveformEnabled,
    timestampedComments,
    onNext,
    onPrevious
  } = useNowPlayingControls(isOpen)
  const commentMarkers = useMemo(
    () =>
      trackDuration > 0 && timestampedComments.length > 0
        ? timestampedComments.map((comment) =>
            Math.min(1, comment.trackTimestampS / trackDuration)
          )
        : undefined,
    [timestampedComments, trackDuration]
  )

  const onPressScrubberIn = useCallback(() => {
    setIsGestureEnabled(false)
  }, [setIsGestureEnabled])

  const onPressScrubberOut = useCallback(() => {
    setIsGestureEnabled(true)
  }, [setIsGestureEnabled])

  const handlePressTitle = useCallback(() => {
    if (!trackId) {
      return
    }
    navigation?.push('Track', { trackId })
    onClose()
  }, [onClose, navigation, trackId])

  const playBar = (
    <View style={styles.playBarContainer}>
      <PlayBar
        mediaKey={mediaKey}
        duration={trackDuration}
        track={track}
        user={user}
        onPress={onDrawerOpen}
        translationAnim={translationAnim}
        floating={!!floating}
      />
    </View>
  )

  return (
    <Reanimated.View
      pointerEvents='box-none'
      style={[
        StyleSheet.absoluteFill,
        { zIndex: zIndex.NOW_PLAYING_DRAWER },
        chromeHideStyle
      ]}
    >
      <Drawer
        zIndex={zIndex.NOW_PLAYING_DRAWER}
        isOpen={isOpen}
        onClose={onClose}
        onOpen={onDrawerOpen}
        initialOffsetPosition={BOTTOM_BAR_HEIGHT + PLAY_BAR_HEIGHT}
        shouldCloseToInitialOffset={isPlayBarShowing}
        animationStyle={DrawerAnimationStyle.SPRINGY}
        shouldBackgroundDim={false}
        shouldShowShadow={!isInChatScreen && !floating}
        shouldAnimateShadow={false}
        drawerStyle={floating ? styles.floatingDrawer : { overflow: 'visible' }}
        onPercentOpen={onDrawerPercentOpen}
        onPanResponderMove={onPanResponderMove}
        onPanResponderRelease={onPanResponderRelease}
        isGestureSupported={isGestureEnabled}
        gesturesDisabled={isCommentDrawerOpen}
        translationAnim={translationAnim}
        disableSafeAreaView
      >
        {floating ? (
          <Animated.View
            pointerEvents='none'
            style={[
              StyleSheet.absoluteFill,
              styles.floatingBackground,
              { opacity: fullPlayerOpacity }
            ]}
          />
        ) : null}
        {floating ? playBar : null}
        <Animated.View
          pointerEvents='box-none'
          style={[
            styles.container,
            {
              height: FULL_DRAWER_HEIGHT,
              paddingTop: effectiveTopInset,
              paddingBottom: effectiveBottomInset
            },
            floating ? { opacity: fullPlayerOpacity } : null
          ]}
        >
          {floating ? null : playBar}
          <Logo translationAnim={translationAnim} />
          <View style={styles.titleBarContainer}>
            <TitleBar onClose={onClose} />
          </View>
          <Pressable onPress={handlePressTitle} style={styles.artworkContainer}>
            <Artwork track={track} isOpen={isOpen} />
          </Pressable>
          <View style={styles.trackInfoContainer}>
            <TrackInfo
              onPressTitle={handlePressTitle}
              track={track}
              user={user}
            />
          </View>
          <View style={styles.scrubberContainer}>
            {isWaveformEnabled && trackId ? (
              <WaveformScrubber
                trackId={trackId}
                duration={trackDuration}
                mediaKey={mediaKey}
                isOpen={isOpen}
                isPlaying={isPlaying && !isBuffering}
                comments={timestampedComments}
                onPressIn={onPressScrubberIn}
                onPressOut={onPressScrubberOut}
              />
            ) : (
              <Scrubber
                mediaKey={mediaKey}
                isPlaying={isPlaying && !isBuffering}
                onPressIn={onPressScrubberIn}
                onPressOut={onPressScrubberOut}
                duration={trackDuration}
                markers={commentMarkers}
              />
            )}
          </View>
          {isNowPlayingCommentsEnabled && trackId ? (
            <CommentBubble
              trackId={trackId}
              comments={timestampedComments}
              isActive={isOpen && isPlaying && !isBuffering}
              mediaKey={mediaKey}
            />
          ) : null}
          {isWaveformEnabled ? (
            <View style={styles.commentBubbleSpace} />
          ) : null}
          <View style={styles.controlsContainer}>
            <AudioControls
              onNext={onNext}
              onPrevious={onPrevious}
              isLongFormContent={isLongFormContent}
            />
            <ActionsBar track={track} />
          </View>
        </Animated.View>
      </Drawer>
    </Reanimated.View>
  )
})
