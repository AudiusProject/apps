import { useState, useEffect, useMemo } from 'react'

import cn from 'classnames'

import styles from './ProgressBar.module.css'
import { ProgressBarProps, ProgressValue } from './types'

const getBigInt = (num: ProgressValue): bigint => {
  if (typeof num === 'bigint') return num
  return BigInt(Math.round(num))
}

function clampBigInt(value: bigint, min: bigint, max: bigint): bigint {
  return value < min ? min : value > max ? max : value
}

export const ProgressBar = (props: ProgressBarProps) => {
  const {
    className,
    sliderClassName,
    sliderBarClassName,
    min = 0,
    max = 100,
    value,
    showLabels = false,
    minWrapper: MinWrapper,
    maxWrapper: MaxWrapper,
    ...other
  } = props
  const [sliderWidth, setSliderWidth] = useState(0)

  const percentage = useMemo(() => {
    const minBigInt = getBigInt(min)
    const maxBigInt = getBigInt(max)
    const valBigInt = getBigInt(value)

    const clampedValue = clampBigInt(
      valBigInt - minBigInt,
      BigInt(0),
      maxBigInt
    )
    return Number((clampedValue * BigInt(100)) / (maxBigInt - minBigInt))
  }, [max, min, value])

  useEffect(() => {
    setSliderWidth(percentage)
  }, [percentage])

  return (
    <div
      className={cn(styles.container, { [className!]: !!className })}
      role='progressbar'
      aria-valuenow={percentage}
      {...other}
    >
      <div
        className={cn(styles.slider, {
          [sliderClassName!]: !!sliderClassName
        })}
      >
        <div
          className={cn(styles.sliderBar, {
            [sliderBarClassName!]: !!sliderBarClassName
          })}
          style={{ width: `${sliderWidth}%` }}
        ></div>
      </div>
      {showLabels && (
        <div className={styles.labels}>
          <div className={styles.minLabel}>
            {MinWrapper ? <MinWrapper value={min} /> : String(min)}
          </div>
          <div className={styles.maxLabel}>
            {MaxWrapper ? <MaxWrapper value={max} /> : String(max)}
          </div>
        </div>
      )}
    </div>
  )
}
