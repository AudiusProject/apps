import { useMemo } from 'react'

import { playbackSelectors } from '@audius/common/store'
import { useKeyboard } from '@react-native-community/hooks'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector } from 'react-redux'

import { BOTTOM_BAR_HEIGHT } from 'app/components/bottom-tab-bar'
import { PLAY_BAR_HEIGHT } from 'app/components/now-playing-drawer'

const { getHasTrack } = playbackSelectors

type KeyboardAvoidingPlaybarStyle = {
  paddingTop: number
  bottom: number
}

export const useKeyboardAvoidingPlaybarStyle =
  (): KeyboardAvoidingPlaybarStyle => {
    const { keyboardShown } = useKeyboard()
    const hasCurrentlyPlayingTrack = useSelector(getHasTrack)
    const insets = useSafeAreaInsets()

    return useMemo(() => {
      // The tab bar floats over the screen (see AppTabBar), so content has to
      // clear it here.
      const tabBarHeight = BOTTOM_BAR_HEIGHT + insets.bottom
      const style: KeyboardAvoidingPlaybarStyle = {
        paddingTop: tabBarHeight,
        bottom: tabBarHeight
      }

      if (Platform.OS === 'ios') {
        const playBar = hasCurrentlyPlayingTrack ? PLAY_BAR_HEIGHT : 0
        style.bottom += playBar
        style.paddingTop += playBar
      } else if (Platform.OS === 'android') {
        const playBar =
          hasCurrentlyPlayingTrack && !keyboardShown ? PLAY_BAR_HEIGHT : 0
        style.bottom += playBar
        style.paddingTop += playBar
      }

      return style
    }, [hasCurrentlyPlayingTrack, keyboardShown, insets.bottom])
  }
