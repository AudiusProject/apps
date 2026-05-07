import { useCallback, useEffect, useRef, useState } from 'react'

import {
  Box,
  HoverCard,
  IconButton,
  IconVolumeLevel0,
  IconVolumeLevel1,
  IconVolumeLevel2,
  IconVolumeLevel3,
  ModifierKeys,
  removeHotkeys,
  setupHotkeys,
  type IconComponent
} from '@audius/harmony'

import { Slider } from 'components/play-bar/slider/Slider'

const messages = {
  mute: 'Mute',
  unmute: 'Unmute'
}

const VOLUME_STEP = 10

const getVolumeIcon = (volumeLevel: number): IconComponent => {
  if (volumeLevel === 0) return IconVolumeLevel0
  if (volumeLevel <= 33) return IconVolumeLevel1
  if (volumeLevel <= 66) return IconVolumeLevel2
  return IconVolumeLevel3
}

const getLibraryVolume = (defaultVolume: number) => {
  if (typeof window === 'undefined') return defaultVolume
  const localStorageVolume = window.localStorage.getItem('volume')
  if (localStorageVolume === null) {
    window.localStorage.setItem('volume', String(defaultVolume))
    return defaultVolume
  } else {
    return parseFloat(localStorageVolume)
  }
}

type VolumeHoverButtonProps = {
  defaultValue?: number
  granularity: number
  onChange: (value: number) => void
}

export const VolumeHoverButton = ({
  defaultValue = 100,
  granularity,
  onChange
}: VolumeHoverButtonProps) => {
  const [volumeLevel, setVolumeLevel] = useState(() =>
    getLibraryVolume(defaultValue)
  )
  const volumeLevelRef = useRef(volumeLevel)
  const preMuteVolumeRef = useRef(volumeLevel)

  const volumeChange = useCallback(
    (value: number, persist = true) => {
      volumeLevelRef.current = value
      if (persist) {
        window.localStorage.setItem('volume', String(value))
      }
      setVolumeLevel(value)
      onChange(value)
    },
    [onChange]
  )

  useEffect(() => {
    const volumeUp = () => {
      volumeChange(Math.min(volumeLevelRef.current + VOLUME_STEP, granularity))
    }
    const volumeDown = () => {
      volumeChange(Math.max(volumeLevelRef.current - VOLUME_STEP, 0))
    }
    const hotkeysHook = setupHotkeys({
      38 /* up */: { cb: volumeUp, or: [ModifierKeys.CTRL, ModifierKeys.CMD] },
      40 /* down */: {
        cb: volumeDown,
        or: [ModifierKeys.CTRL, ModifierKeys.CMD]
      }
    })
    // Ensure rounded edges at the default volume.
    volumeChange(volumeLevelRef.current)
    return () => {
      removeHotkeys(hotkeysHook)
    }
  }, [granularity, volumeChange])

  const handleToggleMute = useCallback(() => {
    if (volumeLevel > 0) {
      preMuteVolumeRef.current = volumeLevel
      volumeChange(0, false)
    } else {
      volumeChange(Math.max(10, preMuteVolumeRef.current))
    }
  }, [volumeLevel, volumeChange])

  const VolumeIcon = getVolumeIcon(volumeLevel)
  const muteLabel = volumeLevel > 0 ? messages.mute : messages.unmute

  return (
    <HoverCard
      mouseEnterDelay={0.1}
      anchorOrigin={{ horizontal: 'center', vertical: 'top' }}
      transformOrigin={{ horizontal: 'center', vertical: 'bottom' }}
      content={
        <Box css={{ width: 140, padding: '12px 16px' }}>
          <Slider
            defaultValue={defaultValue}
            value={volumeLevel}
            max={granularity}
            showHandle={false}
            onChange={volumeChange}
          />
        </Box>
      }
    >
      <IconButton
        icon={VolumeIcon}
        size='m'
        color='subdued'
        aria-label={muteLabel}
        onClick={handleToggleMute}
      />
    </HoverCard>
  )
}
