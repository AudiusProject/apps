import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'

import { useUser } from '@audius/common/api'
import { useCurrentTrack } from '@audius/common/hooks'
import {
  queueActions,
  playerActions,
  playerSelectors
} from '@audius/common/store'
import { Genre } from '@audius/common/utils'
import { useNavigationState } from '@react-navigation/native'
import type {
  Animated,
  GestureResponderEvent,
  PanResponderGestureState
} from 'react-native'
import { Keyboard, Platform, View, StatusBar, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TrackPlayer from 'react-native-track-player'
import { useDispatch, useSelector } from 'react-redux'

import { BOTTOM_BAR_HEIGHT } from 'app/components/bottom-tab-bar'
import Drawer, {
  DrawerAnimationStyle,
  FULL_DRAWER_HEIGHT
} from 'app/components/drawer'
import { Scrubber } from 'app/components/scrubber'
import { useDrawer } from 'app/hooks/useDrawer'
import { useNavigation } from 'app/hooks/useNavigation'
import { AppDrawerContext } from 'app/screens/app-drawer-screen'
import { AppTabNavigationContext } from 'app/screens/app-screen'
import { makeStyles } from 'app/styles'
import { zIndex } from 'app/utils/zIndex'

import { ActionsBar } from './ActionsBar'
import { Artwork } from './Artwork'
import { AudioControls } from './AudioControls'
import { Logo } from './Logo'
import { PlayBar } from './PlayBar'
import { TitleBar } from './TitleBar'
import { TrackInfo } from './TrackInfo'
import { PLAY_BAR_HEIGHT } from './constants'
import { useCurrentTrackDuration } from './useCurrentTrackDuration'
const { seek, reset } = playerActions

const { getPlaying, getUid, getCounter, getBuffering } = playerSelectors
const { next, previous } = queueActions

const STATUS_BAR_FADE_CUTOFF = 0.6
const SKIP_DURATION_SEC = 15
const RESTART_THRESHOLD_SEC = 3

// If the top screen inset is greater than this,
// the status bar will be hidden when the drawer is open
const INSET_STATUS_BAR_HIDE_THRESHOLD = 20

const useStyles = makeStyles(({ spacing }) => ({
  container: {
    paddingTop: 0,
    height: FULL_DRAWER_HEIGHT,
    justifyContent: 'space-evenly'
  },
  playBarContainer: {
    position: 'absolute',
    width: '100%',
    top: 0
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
  }
}))

type NowPlayingDrawerProps = {
  translationAnim: Animated.Value
}

/**
 * Memoized to prevent rerender during bottom-bar navigation.
 * It's rerendering because bottomTab render function rerenders a lot.
 */
export const NowPlayingDrawer = memo(function NowPlayingDrawer(
  props: NowPlayingDrawerProps
) {
  const { translationAnim } = props
  const { navigation: contextNavigation } = useContext(AppTabNavigationContext)
  const navigation = useNavigation({
    customNavigation: contextNavigation
  })
  const dispatch = useDispatch()
  const insets = useSafeAreaInsets()
  const staticTopInset = useRef(insets.top)
  const styles = useStyles()

  const { isOpen, onOpen, onClose } = useDrawer('NowPlaying')
  const playCounter = useSelector(getCounter)
  const currentUid = useSelector(getUid)
  const isPlaying = useSelector(getPlaying)
  const isBuffering = useSelector(getBuffering)
  const [isPlayBarShowing, setIsPlayBarShowing] = useState(false)

  const { drawerNavigation } = useContext(AppDrawerContext)

  // Don't show shadow when we're in chat screen, so that the drawer appears
  // at same level as the chat screen textinput
  const isInChatScreen = useNavigationState((state) => {
    const routes = state.routes[0].state?.routes?.[0].state?.routes
    return routes?.some((route) => route.name === 'Chat')
  })

  // When audio starts playing, open the playbar to the initial offset
  useEffect(() => {
    if (isPlaying && !isPlayBarShowing) {
      setIsPlayBarShowing(true)
    }
  }, [isPlaying, isPlayBarShowing])

  useEffect(() => {
    if (!currentUid) {
      setIsPlayBarShowing(false)
    }
  }, [currentUid])

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
    // The top inset can be 0 initially
    // Need to get the actual value but preserve it when the
    // status bar is hidden
    if (staticTopInset.current === 0 && insets.top > 0) {
      staticTopInset.current = insets.top
    }
  }, [staticTopInset, insets.top])

  // Use static insets when drawer is open to prevent layout shift from notification panel
  // When drawer is fully open (or mostly open), use static insets to maintain fullscreen layout
  const isDrawerFullyOpen = drawerPercentOpen.current > 0.8
  const effectiveTopInset =
    isOpen && isDrawerFullyOpen ? staticTopInset.current : insets.top
  const effectiveBottomInset = isOpen && isDrawerFullyOpen ? 0 : insets.bottom

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

  // Attach to the pan responder of the drawer so that we can animate away
  // the status bar
  const onPanResponderMove = useCallback(
    (e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      // Do not hide the status bar for smaller insets
      // This is to prevent layout shift which breaks the animation
      if (
        Platform.OS === 'ios' &&
        staticTopInset.current > INSET_STATUS_BAR_HIDE_THRESHOLD
      ) {
        if (gestureState.vy > 0) {
          // Dragging downwards
          if (drawerPercentOpen.current < STATUS_BAR_FADE_CUTOFF) {
            StatusBar.setHidden(false, 'fade')
          }
        } else if (gestureState.vy < 0) {
          // Dragging upwards

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
      // Immediately after the pan responder is released, disable the notifications drawer.
      // Allow the effect attached to the open state changing to re-define whether it can be
      // interacted with.
      drawerNavigation?.setOptions({ swipeEnabled: false })
    },
    [drawerNavigation]
  )

  const [isGestureEnabled, setIsGestureEnabled] = useState(true)

  const track = useCurrentTrack()
  const trackDuration = useCurrentTrackDuration()
  const trackId = track?.track_id

  const { data: user } = useUser(track?.owner_id)
  const [mediaKey, setMediaKey] = useState(0)

  useEffect(() => {
    setMediaKey((mediaKey) => mediaKey + 1)
  }, [playCounter, currentUid])

  const onNext = useCallback(async () => {
    const isLongFormContent =
      track?.genre === Genre.PODCASTS || track?.genre === Genre.AUDIOBOOKS
    if (isLongFormContent) {
      const { position: currentPosition } = await TrackPlayer.getProgress()
      const newPosition = currentPosition + SKIP_DURATION_SEC
      dispatch(seek({ seconds: Math.min(track.duration, newPosition) }))
    } else {
      dispatch(next({ skip: true }))
      setMediaKey((mediaKey) => mediaKey + 1)
    }
  }, [dispatch, setMediaKey, track])

  const onPrevious = useCallback(async () => {
    const { position: currentPosition } = await TrackPlayer.getProgress()
    const isLongFormContent =
      track?.genre === Genre.PODCASTS || track?.genre === Genre.AUDIOBOOKS
    if (isLongFormContent) {
      const newPosition = currentPosition - SKIP_DURATION_SEC
      dispatch(seek({ seconds: Math.max(0, newPosition) }))
    } else {
      const shouldGoToPrevious = currentPosition < RESTART_THRESHOLD_SEC
      if (shouldGoToPrevious) {
        dispatch(previous())
        setMediaKey((mediaKey) => mediaKey + 1)
      } else {
        dispatch(reset({ shouldAutoplay: true }))
      }
    }
  }, [dispatch, setMediaKey, track])

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

  return (
    <Drawer
      // Appears below bottom bar whereas normally drawers appear above
      zIndex={zIndex.NOW_PLAYING_DRAWER}
      isOpen={isOpen}
      onClose={onClose}
      onOpen={onDrawerOpen}
      initialOffsetPosition={BOTTOM_BAR_HEIGHT + PLAY_BAR_HEIGHT}
      shouldCloseToInitialOffset={isPlayBarShowing}
      animationStyle={DrawerAnimationStyle.SPRINGY}
      shouldBackgroundDim={false}
      shouldShowShadow={!isInChatScreen}
      shouldAnimateShadow={false}
      drawerStyle={{ overflow: 'visible' }}
      onPercentOpen={onDrawerPercentOpen}
      onPanResponderMove={onPanResponderMove}
      onPanResponderRelease={onPanResponderRelease}
      isGestureSupported={isGestureEnabled}
      translationAnim={translationAnim}
      // Disable safe area view edges because they are handled manually
      disableSafeAreaView
    >
      <View
        style={[
          styles.container,
          { paddingTop: effectiveTopInset, paddingBottom: effectiveBottomInset }
        ]}
      >
        <View style={styles.playBarContainer}>
          <PlayBar
            mediaKey={`${mediaKey}`}
            duration={trackDuration}
            track={track}
            user={user}
            onPress={onDrawerOpen}
            translationAnim={translationAnim}
          />
        </View>
        <Logo translationAnim={translationAnim} />
        <View style={styles.titleBarContainer}>
          <TitleBar onClose={onClose} />
        </View>
        <Pressable onPress={handlePressTitle} style={styles.artworkContainer}>
          <Artwork track={track} />
        </Pressable>
        <View style={styles.trackInfoContainer}>
          <TrackInfo
            onPressTitle={handlePressTitle}
            track={track}
            user={user}
          />
        </View>
        <View style={styles.scrubberContainer}>
          <Scrubber
            mediaKey={`${mediaKey}`}
            isPlaying={isPlaying && !isBuffering}
            onPressIn={onPressScrubberIn}
            onPressOut={onPressScrubberOut}
            duration={trackDuration}
          />
        </View>
        <View style={styles.controlsContainer}>
          <AudioControls
            onNext={onNext}
            onPrevious={onPrevious}
            isLongFormContent={
              track?.genre === Genre.PODCASTS ||
              track?.genre === Genre.AUDIOBOOKS
            }
          />
          <ActionsBar track={track} />
        </View>
      </View>
    </Drawer>
  )
})
