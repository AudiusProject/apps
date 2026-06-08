import { useMemo } from 'react'

import { playbackSelectors } from '@audius/common/store'
import { useKeyboard } from '@react-native-community/hooks'
import { Platform } from 'react-native'
import { useSelector } from 'react-redux'

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

    return useMemo(() => {
      const style: KeyboardAvoidingPlaybarStyle = {
        paddingTop: 0,
        bottom: 0
      }

      if (Platform.OS === 'ios') {
        style.bottom = hasCurrentlyPlayingTrack ? PLAY_BAR_HEIGHT : 0
        style.paddingTop = hasCurrentlyPlayingTrack ? PLAY_BAR_HEIGHT : 0
      } else if (Platform.OS === 'android') {
        style.bottom =
          hasCurrentlyPlayingTrack && !keyboardShown ? PLAY_BAR_HEIGHT : 0
        style.paddingTop =
          hasCurrentlyPlayingTrack && !keyboardShown ? PLAY_BAR_HEIGHT : 0
      }

      return style
    }, [hasCurrentlyPlayingTrack, keyboardShown])
  }
