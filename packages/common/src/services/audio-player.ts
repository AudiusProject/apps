import { PlaybackRate } from '~/store/player'

import { Nullable } from '../utils'

export type AudioInfo = {
  id: string
  title: string
  artist: string
  artwork: string
}

export enum AudioError {
  AUDIO = 'AUDIO'
}

export type AudioPlayer = {
  audio: HTMLAudioElement
  load: (duration: number, onEnd: () => void, mp3Url: Nullable<string>) => void
  play: () => void
  pause: () => void
  stop: () => void
  seek: (seconds: number) => void
  setPlaybackRate: (rate: PlaybackRate) => void
  setVolume: (volume: number) => void
  isBuffering: () => boolean
  getPosition: () => number | Promise<number>
  getDuration: () => number | Promise<number>
  getPlaybackRate: () => PlaybackRate
  getAudioPlaybackRate: () => number
  onBufferingChange: (isBuffering: boolean) => void
  onError: (error: string, data: string | Event) => void
  onEnd: (() => void) | null
  audioCtx: Nullable<AudioContext>
}
