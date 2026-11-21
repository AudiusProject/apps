import React, { useEffect } from 'react'

import { Scrubber } from '@audius/harmony'

import { PlayingState } from '../playbutton/PlayButton'

import styles from './BedtimeScrubber.module.css'

const RAIL_LISTENED_COLOR = 'rgba(255, 255, 255, 0.8)'
const RAIL_UNLISTENED_COLOR = 'rgba(255, 255, 255, 0.1)'
const RAIL_HOVER_COLOR = 'rgba(255, 255, 255, 1)'
const HANDLE_COLOR = 'rgba(255, 255, 255, 1)'
const HANDLE_SHADOW =
  '0 0 2px 0 rgba(133,129,153,0.5), 0 2px 5px -1px rgba(133,129,153,0.5)'

const EmbedScrubber = ({
  mediaKey,
  playingState,
  seekTo,
  duration,
  elapsedSeconds,
  includeExpandedTargets = true,
  railListenedColor = RAIL_LISTENED_COLOR,
  railUnlistenedColor = RAIL_UNLISTENED_COLOR,
  railHoverColor = RAIL_HOVER_COLOR,
  handleColor = HANDLE_COLOR,
  handleShadow = HANDLE_SHADOW,
  audioPlayer
}) => {
  useEffect(() => {
    const root = document.getElementById('app')
    if (!root) {
      return
    }
    root.style.setProperty('--scrubber-hover', railHoverColor)
    // TODO: Fix these deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!audioPlayer.current) {
    return null
  }

  return (
    <div className={styles.container}>
      <Scrubber
        mediaKey={mediaKey}
        isPlaying={playingState === PlayingState.Playing}
        isDisabled={playingState === PlayingState.Stopped}
        isMobile={true}
        includeTimestamps={false}
        onScrubRelease={seekTo}
        totalSeconds={duration}
        elapsedSeconds={elapsedSeconds}
        getAudioPosition={audioPlayer.current.getPosition}
        getTotalTime={audioPlayer.current.getDuration}
        includeExpandedTargets={includeExpandedTargets}
        style={{
          railListenedColor,
          railUnlistenedColor,
          showHandle: false,
          handleColor,
          handleShadow,
          sliderMargin: `0px`
        }}
      />
    </div>
  )
}

export default EmbedScrubber
