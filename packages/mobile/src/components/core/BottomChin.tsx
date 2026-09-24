import { playbackSelectors } from '@audius/common/store'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector } from 'react-redux'

import { BOTTOM_BAR_HEIGHT } from '../bottom-tab-bar/constants'
import { PLAY_BAR_HEIGHT } from '../now-playing-drawer'

const { getHasTrack } = playbackSelectors

/**
 * Bottom padding a list needs so its last row clears the floating tab bar
 * (positioned absolutely, see `AppTabBar`) and, when a track is loaded, the
 * play bar.
 */
export const useBottomChinHeight = () => {
  const hasTrack = useSelector(getHasTrack)
  const insets = useSafeAreaInsets()
  return BOTTOM_BAR_HEIGHT + insets.bottom + (hasTrack ? PLAY_BAR_HEIGHT : 0)
}

export const BottomChin = () => {
  const height = useBottomChinHeight()
  return <View style={{ height }} />
}
