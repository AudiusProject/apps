import { playbackSelectors } from '@audius/common/store'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector } from 'react-redux'

import { BOTTOM_BAR_HEIGHT } from '../bottom-tab-bar/constants'
import { PLAY_BAR_HEIGHT } from '../now-playing-drawer'

const { getHasTrack } = playbackSelectors

/**
 * Height a screen's scrollable content needs at its end to clear the floating
 * bottom chrome.
 *
 * The tab bar is positioned absolutely (see `AppTabBar`) so content can run
 * full-height and slide behind the glass as it scrolls. That also means the
 * navigator no longer reserves any space for it, so without this inset the
 * last row of every list would sit permanently under the bar — worst on short
 * lists, which never scroll far enough for the auto-hide to uncover them.
 *
 * This is about the *end of the content being reachable*, not about avoiding
 * overlap mid-scroll: content still passes under the bar while scrolling,
 * which is the whole point of the frosted treatment.
 *
 * The play-bar portion stays conditional — it is 0 when nothing is playing,
 * and unlike the tab bar the now-playing bar does not auto-hide, so its space
 * has to be held whenever it is on screen.
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
