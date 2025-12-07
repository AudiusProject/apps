import type { PlaybackRate } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import TrackPlayer from 'react-native-track-player'

// Shim definition for audio-player needed for player sagas to not break.
// Ideally we remove audio-player instance from sagas, and have web handle
// it all in a component like we do on mobile
export class NativeMobileAudio {
  audio: HTMLAudioElement
  audioCtx: Nullable<AudioContext>

  load = () => {}
  play = () => {}
  pause = () => {}
  stop = () => {}
  seek = (position: number) => {
    TrackPlayer.seekTo(position)
  }

  setVolume = () => null
  setPlaybackRate = () => {}
  isBuffering = () => false
  getPosition = async () => {
    const { position } = await TrackPlayer.getProgress()
    return position
  }

  getDuration = async () => {
    const { duration } = await TrackPlayer.getProgress()
    return duration
  }

  getPlaybackRate = () => '1x' as PlaybackRate
  getAudioPlaybackRate = () => 1.0
  onBufferingChange = () => {}
  onError = () => {}
}
