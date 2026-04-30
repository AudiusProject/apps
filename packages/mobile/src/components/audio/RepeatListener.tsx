import { playbackActions } from '@audius/common/store'
import TrackPlayer, { RepeatMode, useProgress } from 'react-native-track-player'
import { useDispatch } from 'react-redux'
import { useAsync, usePrevious } from 'react-use'

export const RepeatListener = () => {
  const dispatch = useDispatch()
  const { position } = useProgress()
  const previousPosition = usePrevious(position)
  useAsync(async () => {
    if (
      previousPosition !== undefined &&
      previousPosition > position &&
      position < 1
    ) {
      // Manually increment player count if we are repeating
      if ((await TrackPlayer.getRepeatMode()) === RepeatMode.Track) {
        dispatch(playbackActions.incrementCounter())
      }
    }
  }, [position, previousPosition, dispatch])
  return null
}
