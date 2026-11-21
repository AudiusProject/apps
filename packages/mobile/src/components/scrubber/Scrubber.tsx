import { useCallback, useState } from 'react'

import { playbackActions } from '@audius/common/store'
import { formatSeconds } from '@audius/common/utils'
import { View } from 'react-native'
import { useDispatch } from 'react-redux'

import Text from 'app/components/text'
import { makeStyles } from 'app/styles'

import { PositionTimestamp } from './PositionTimestamp'
import { Slider } from './Slider'
import { usePosition } from './usePosition'

const { seekTo: seek } = playbackActions

const useStyles = makeStyles(({ palette }) => ({
  root: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  timestamp: {
    width: 50,
    color: palette.neutral,
    fontSize: 12,
    flexShrink: 1
  }
}))

type ScrubberProps = {
  mediaKey: string
  isPlaying: boolean
  duration: number
  onPressIn: () => void
  onPressOut: () => void
  markers?: number[]
}

export const Scrubber = ({
  mediaKey,
  isPlaying,
  duration,
  onPressIn,
  onPressOut,
  markers
}: ScrubberProps) => {
  const styles = useStyles()
  const dispatch = useDispatch()
  const [isInteracting, setIsInteracting] = useState(false)
  const { ref, setPosition } = usePosition(
    mediaKey,
    duration,
    isPlaying,
    isInteracting
  )

  const handlePressIn = useCallback(() => {
    onPressIn()
    setIsInteracting(true)
  }, [onPressIn])

  const handlePressOut = useCallback(() => {
    onPressOut()
    setIsInteracting(false)
  }, [onPressOut])

  const handleNewPosition = useCallback(
    (percentComplete: number) => {
      const newPosition = percentComplete * duration
      if (duration) {
        dispatch(seek({ seconds: newPosition }))
      }
      setPosition(newPosition)
      setIsInteracting(false)
      onPressOut()
    },
    [onPressOut, dispatch, duration, setPosition]
  )

  const handleDrag = useCallback(
    (percentComplete: number) => {
      setIsInteracting(true)
      setPosition(percentComplete * duration)
    },
    [duration, setPosition]
  )

  const handleDragRelease = useCallback(() => {
    setIsInteracting(false)
  }, [])

  return (
    <View style={styles.root}>
      <PositionTimestamp ref={ref} />
      <Slider
        mediaKey={mediaKey}
        isPlaying={isPlaying}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onNewPosition={handleNewPosition}
        onDrag={handleDrag}
        onDragRelease={handleDragRelease}
        duration={duration}
        markers={markers}
      />
      <Text style={styles.timestamp} weight='regular' numberOfLines={1}>
        {formatSeconds(duration)}
      </Text>
    </View>
  )
}
