import { playbackSelectors } from '@audius/common/store'
import { View } from 'react-native'
import { useSelector } from 'react-redux'

import { PLAY_BAR_HEIGHT } from '../now-playing-drawer'

const { getHasTrack } = playbackSelectors

export const PlayBarChin = () => {
  const hasTrack = useSelector(getHasTrack)
  return <View style={{ height: hasTrack ? PLAY_BAR_HEIGHT : 0 }} />
}
