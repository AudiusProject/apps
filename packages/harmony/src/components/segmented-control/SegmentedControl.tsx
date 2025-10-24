import { createRef, Fragment, useState, useRef, useEffect } from 'react'

import { ResizeObserver } from '@juggle/resize-observer'
import { useSpring, animated } from '@react-spring/web'
import cn from 'classnames'
import { mergeRefs } from 'react-merge-refs'
import useMeasure from 'react-use-measure'

import { Text } from '~harmony/components/text'

import styles from './SegmentedControl.module.css'
import { SegmentedControlProps } from './types'

/**
 * A hybrid somewhere between a button group, radio buttons, and tabs;
 * segmented controls are used to switch between different options or views.
 */
export const SegmentedControl = <T extends string>(
  props: SegmentedControlProps<T>
) => {
  const {
    options,
    selected,
    onSelectOption,
    className,
    fullWidth,
    isMobile,
    disabled,
    label,
    'aria-labelledby': ariaLabelledBy,
    equalWidth,
    forceRefreshAfterMs
  } = props
  const optionRefs = useRef(options.map((_) => createRef<HTMLLabelElement>()))
  const [localSelected, setLocalSelected] = useState(options[0]?.key ?? '')
  const [maxOptionWidth, setMaxOptionWidth] = useState(0)

  const selectedOption = selected || localSelected

  const onSetSelected = (option: T) => {
    // Call props function if controlled
    if (onSelectOption) onSelectOption(option)
    setLocalSelected(option)
  }

  const [tabProps, tabApi] = useSpring(() => ({
    to: { left: '0px', width: '0px' }
  }))

  // Update refs when options change
  useEffect(() => {
    optionRefs.current = options.map((_) => createRef<HTMLLabelElement>())
  }, [options])

  // Update localSelected if current selection is no longer valid
  useEffect(() => {
    if (
      options.length > 0 &&
      !options.some((option) => option.key === localSelected)
    ) {
      setLocalSelected(options[0].key)
    }
  }, [options, localSelected])

  useEffect(() => {
    setMaxOptionWidth(
      optionRefs.current.reduce((currentMax, ref) => {
        const rect = ref.current?.getBoundingClientRect()
        return Math.max(rect?.width ?? 0, currentMax)
      }, 0)
    )
  }, [options])

  // Watch for resizes and repositions so that we move and resize the slider appropriately
  const [selectedRef, bounds] = useMeasure({
    offsetSize: true,
    polyfill: ResizeObserver
  })

  const [forceRefresh, setForceRefresh] = useState(false)
  useEffect(() => {
    setTimeout(() => {
      setForceRefresh(!forceRefresh)
    }, forceRefreshAfterMs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let selectedRefIdx = options.findIndex(
      (option) => option.key === selectedOption
    )
    if (selectedRefIdx === -1) selectedRefIdx = 0

    const { clientWidth: width, offsetLeft: left } = optionRefs.current[
      selectedRefIdx
    ]?.current ?? { clientWidth: 0, offsetLeft: 0 }

    tabApi.start({
      to: { left: `${left}px`, width: `${width}px` }
    })
  }, [
    options,
    equalWidth,
    selectedOption,
    selected,
    tabApi,
    localSelected,
    optionRefs,
    bounds,
    forceRefresh
  ])

  return (
    <div
      className={cn(styles.tabs, className, {
        [styles.containerFullWidth]: !!fullWidth,
        [styles.isMobile]: isMobile,
        [styles.disabled]: disabled
      })}
      role='radiogroup'
      aria-label={label}
      aria-labelledby={ariaLabelledBy}
    >
      <animated.div className={styles.tabBackground} style={tabProps} />
      {options.map((option, idx) => {
        const isOptionDisabled = disabled || option.disabled
        const isSelected = option.key === selectedOption

        return (
          <Fragment key={option.key}>
            <label
              ref={
                isSelected
                  ? mergeRefs([optionRefs.current[idx], selectedRef])
                  : optionRefs.current[idx]
              }
              className={cn(styles.tab, {
                [styles.tabFullWidth]: !!fullWidth,
                [styles.disabled]: !disabled && option.disabled,
                [styles.isMobile]: isMobile
              })}
              style={
                equalWidth && maxOptionWidth
                  ? { width: `${maxOptionWidth}px` }
                  : undefined
              }
            >
              {option.leftIcon && (
                <option.leftIcon
                  size='s'
                  color={isSelected ? 'default' : 'subdued'}
                />
              )}
              {option.icon}
              <input
                type='radio'
                checked={isSelected}
                onChange={() => {
                  onSetSelected(option.key)
                }}
                disabled={isOptionDisabled}
              />
              <Text
                variant='body'
                strength='strong'
                color={isSelected ? 'default' : 'subdued'}
                lineHeight='single'
              >
                {option.text}
              </Text>
            </label>
            {idx !== options.length - 1 ? (
              <div
                className={cn(styles.separator, {
                  [styles.invisible]:
                    // Hide separator right of the selected option
                    selectedOption === option.key ||
                    // Hide separator right of the last option
                    idx === options.length - 1 ||
                    // Hide separator right of an option if the next one is selected
                    selectedOption === options[idx + 1].key
                })}
              />
            ) : null}
          </Fragment>
        )
      })}
    </div>
  )
}
