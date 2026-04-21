import { useRef, useState, useEffect, useCallback } from 'react'

import {
  IconVolumeLevel0 as IconVolume0,
  IconVolumeLevel1 as IconVolume1,
  IconVolumeLevel2 as IconVolume2,
  IconVolumeLevel3 as IconVolume3,
  setupHotkeys,
  ModifierKeys
} from '@audius/harmony'
import PropTypes from 'prop-types'

import styles from './VolumeBar.module.css'
import { Slider } from './slider/Slider'

const getVolumeIcon = (volumeLevel) => {
  if (volumeLevel === 0) return IconVolume0
  if (volumeLevel <= 33) return IconVolume1
  if (volumeLevel <= 66) return IconVolume2
  return IconVolume3
}

const getLibraryVolume = (defaultVolume) => {
  if (typeof window === 'undefined') return defaultVolume
  const localStorageVolume = window.localStorage.getItem('volume')
  if (localStorageVolume === null) {
    window.localStorage.setItem('volume', defaultVolume)
    return defaultVolume
  } else {
    return parseFloat(localStorageVolume)
  }
}
const VolumeBar = ({
  defaultValue = 100,
  onChange = (value) => {},
  granularity,
  compact = false
}) => {
  const [volumeLevel, setVolumeLevel] = useState(getLibraryVolume(defaultValue))
  const volumeBarRef = useRef()
  const preMuteVolumeRef = useRef(getLibraryVolume(defaultValue))

  const volumeChange = useCallback(
    (value, persist = true) => {
      if (persist) {
        window.localStorage.setItem('volume', value)
      }
      setVolumeLevel(value)
      onChange(value)
    },
    [onChange]
  )

  useEffect(() => {
    const volumeUp = () => {
      volumeChange(Math.min(volumeLevel + 10, 100))
    }
    const volumeDown = () => {
      volumeChange(Math.max(volumeLevel - 10, 0))
    }
    setupHotkeys({
      38 /* up */: { cb: volumeUp, or: [ModifierKeys.CTRL, ModifierKeys.CMD] },
      40 /* down */: {
        cb: volumeDown,
        or: [ModifierKeys.CTRL, ModifierKeys.CMD]
      }
    })
    // Ensure rounded edges at the default volume (100%).
    volumeChange(volumeLevel)
  }, [volumeChange, volumeLevel])

  const mute = () => {
    preMuteVolumeRef.current = volumeLevel
    volumeChange(0, false)
  }

  const unmute = () => {
    volumeChange(Math.max(10, preMuteVolumeRef.current))
  }

  const onClick = () => {
    volumeLevel > 0 ? mute() : unmute()
  }

  const VolumeIcon = getVolumeIcon(volumeLevel)

  return (
    <div className={styles.volumeBarWrapper}>
      <VolumeIcon onClick={onClick} className={styles.volumeIcon} />
      {!compact && (
        <div ref={volumeBarRef} className={styles.volumeBar}>
          <Slider
            defaultValue={defaultValue}
            value={volumeLevel}
            max={granularity}
            showHandle={false}
            onChange={volumeChange}
          />
        </div>
      )}
    </div>
  )
}

VolumeBar.propTypes = {
  defaultValue: PropTypes.number,
  onChange: PropTypes.func,
  compact: PropTypes.bool
}

export default VolumeBar
