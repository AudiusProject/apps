import React, { useState, useRef, useEffect } from 'react'

import clsx from 'clsx'

import DisplayAudio from 'components/DisplayAudio'
import { Position } from 'components/Tooltip'
import AudiusClient from 'services/Audius'
import { BigNumber } from 'types'

import styles from './ValueSlider.module.css'

const messages = {
  min: 'MIN',
  max: 'MAX',
  current: 'CURRENT'
}

const MIN_SLIDER_WIDTH = 4

type Label = { value: BigNumber; text?: string }
type OwnProps = {
  className?: string
  min?: BigNumber
  max?: BigNumber
  value: BigNumber
  initialValue?: BigNumber
  valueLabel?: string
  inView?: boolean
  labels?: Array<Label>
  isIncrease?: boolean
}

type ValueSliderProps = OwnProps

const ValueSlider: React.FC<ValueSliderProps> = ({
  className,
  min,
  max,
  value,
  initialValue,
  inView,
  valueLabel,
  labels,
  isIncrease
}: ValueSliderProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const maxValueRef = useRef<HTMLDivElement | null>(null)
  const minValueRef = useRef<HTMLDivElement | null>(null)

  const [initialSliderWidth, setInitialSliderWidth] = useState(0)
  const [sliderWidth, setSliderWidth] = useState(0)

  useEffect(() => {
    if (containerRef.current && min && max) {
      const percentage = AudiusClient.getBNPercentage(
        value.sub(min),
        max.sub(min)
      )
      const totalWidth = containerRef.current.offsetWidth
      const newSliderWidth = Math.max(totalWidth * percentage, MIN_SLIDER_WIDTH)
      setSliderWidth(newSliderWidth)
    }
  }, [value, containerRef, max, min, setSliderWidth])

  useEffect(() => {
    if (
      initialValue &&
      !initialSliderWidth &&
      containerRef.current &&
      min &&
      max
    ) {
      const percentage = AudiusClient.getBNPercentage(
        initialValue.sub(min),
        max.sub(min)
      )
      const totalWidth = containerRef.current.offsetWidth
      const newSliderWidth = Math.max(totalWidth * percentage, MIN_SLIDER_WIDTH)
      setInitialSliderWidth(newSliderWidth)
    }
  }, [
    initialValue,
    containerRef,
    max,
    min,
    initialSliderWidth,
    setInitialSliderWidth
  ])

  return (
    <div
      className={clsx(styles.container, { [className!]: !!className })}
      ref={containerRef}
    >
      <div className={styles.slider}>
        <div
          className={clsx(styles.newValueSlider, {
            [styles.invalid]:
              max && min ? value.gt(max) || value.lt(min) : false,
            [styles.lighter]: isIncrease
          })}
          style={{ width: sliderWidth }}
        />
        <div
          className={clsx(styles.initialValueSlider, {
            [styles.lighter]: !isIncrease
          })}
          style={{ width: initialSliderWidth }}
        />
      </div>
      <div className={styles.minMax}>
        {min && (
          <div ref={maxValueRef} className={styles.minValue}>
            <span className={styles.minLabel}>
              {isIncrease !== undefined
                ? isIncrease
                  ? messages.current
                  : messages.min
                : messages.min}
            </span>
            <DisplayAudio position={Position.BOTTOM} amount={min} />
          </div>
        )}
        {max && (
          <div ref={minValueRef} className={styles.maxValues}>
            <DisplayAudio position={Position.BOTTOM} amount={max} />
            <span className={styles.maxLabel}>
              {isIncrease !== undefined
                ? isIncrease
                  ? messages.max
                  : messages.current
                : messages.max}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ValueSlider
