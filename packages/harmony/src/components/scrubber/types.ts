export type ScrubberProps = {
  /**
   * A unique identifier for the media being scrubbed.
   * Usually a "track id" suffices here. This property
   * is similar to a `key` in React and is used to
   * reset the scrubber animation for a new media item.
   */
  mediaKey: string

  /**
   * Whether or not the media being scrubbed is playing (or paused).
   */
  isPlaying: boolean

  /**
   * Whether or not the scrubber should be disabled. For example,
   * this is useful when no content is playing.
   */
  isDisabled?: boolean

  /**
   * Whether or not to display a mobile-friendly variant.
   */
  isMobile?: boolean

  /**
   * Whether or not timestamps are shown on the sides of the scrubber.
   */
  includeTimestamps?: boolean

  /**
   * The current progress of the media being scrubbed.
   * The scrubber reacts to changes in the elapsed seconds
   * to re-calibrate. This value should be updated relatively frequently
   * (0.1s < x < 1s).
   */
  elapsedSeconds: number

  /**
   * Total duration of the media being scrubbed.
   */
  totalSeconds: number

  /**
   * The speed that the media is being played at
   */
  playbackRate?: number

  /**
   * Fired incrementally as the user drags the scrubber.
   */
  onScrub?: (seconds: number) => void

  /**
   * Fired effectively on "mouse up" when the user is done scrubbing.
   */
  onScrubRelease?: (seconds: number) => void

  /** Callback to fetch the current playback position in seconds. Typically wired
   * up to the audio player's `getPosition` method.
   */
  getAudioPosition: () => number

  /** Callback to get the duration of the current media. Typically wired up to the
   * audio player's `getDuration` method.
   */
  getTotalTime: () => number

  /**
   * Individually exposed styling options.
   */
  style?: {
    railListenedColor?: string
    railUnlistenedColor?: string
    showHandle?: boolean
    handleColor?: string
    handleBorderColor?: string
    handleBorderWidth?: string
    handleShadow?: string
    sliderMargin?: string
  }

  /**
   * Include larger click targets to that it's hard to misclick
   * Defaults to true
   */
  includeExpandedTargets?: boolean

  /**
   * Escape hatch for styles.
   */
  className?: string
}

/**
 * Encapsulates time-data for detecting and animating the position
 * of a scrubber.
 */
export type TimeData = {
  elapsedSeconds: number
  totalSeconds: number
}
