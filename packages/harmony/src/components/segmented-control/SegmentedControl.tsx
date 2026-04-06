import {
  createRef,
  Fragment,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback
} from 'react'

import { ResizeObserver } from '@juggle/resize-observer'
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

  const rawSelectedOption = selected ?? localSelected
  // If the selected value doesn't match any option, fall back to the first option
  const selectedOption = options.some(
    (option) => option.key === rawSelectedOption
  )
    ? rawSelectedOption
    : (options[0]?.key ?? rawSelectedOption)

  const onSetSelected = (option: T) => {
    // Call props function if controlled
    if (onSelectOption) onSelectOption(option)
    setLocalSelected(option)
  }

  // Background pill position - use state for direct control
  const [pillStyle, setPillStyle] = useState<{
    left: number
    width: number
    ready: boolean
    shouldAnimate: boolean
  }>({ left: 0, width: 0, ready: false, shouldAnimate: false })

  // Update refs when options change
  useEffect(() => {
    optionRefs.current = options.map(
      (_, i) => optionRefs.current[i] ?? createRef<HTMLLabelElement>()
    )
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
    if (!forceRefreshAfterMs) return
    const id = setTimeout(() => {
      setForceRefresh((prev) => !prev)
    }, forceRefreshAfterMs)
    return () => {
      clearTimeout(id)
    }
  }, [forceRefreshAfterMs])

  // Track the last selected option to determine when to animate
  const lastSelectedOption = useRef<string | null>(null)

  // Update pill position
  const updatePillPosition = useCallback(() => {
    let selectedRefIdx = options.findIndex(
      (option) => option.key === selectedOption
    )
    if (selectedRefIdx === -1) selectedRefIdx = 0

    const selectedEl = optionRefs.current[selectedRefIdx]?.current
    if (!selectedEl) return

    const width = selectedEl.clientWidth
    const left = selectedEl.offsetLeft

    // Don't position if we don't have valid measurements
    if (width === 0) return

    // Determine if we should animate (only when user changes selection)
    const isUserSelection =
      lastSelectedOption.current !== null &&
      lastSelectedOption.current !== selectedOption

    setPillStyle((prev) => {
      // Skip if position hasn't changed
      if (prev.left === left && prev.width === width && prev.ready) {
        return prev
      }
      return { left, width, ready: true, shouldAnimate: isUserSelection }
    })

    lastSelectedOption.current = selectedOption
  }, [selectedOption, options])

  // Run on mount and when dependencies change
  useLayoutEffect(() => {
    updatePillPosition()
  }, [updatePillPosition, equalWidth, bounds, forceRefresh])

  // Also update after a short delay to handle any layout settling
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      updatePillPosition()
    })
    return () => cancelAnimationFrame(id)
  }, [updatePillPosition])

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
      <div
        className={styles.tabBackground}
        style={{
          left: `${pillStyle.left}px`,
          width: `${pillStyle.width}px`,
          opacity: pillStyle.ready ? 1 : 0,
          transition: pillStyle.shouldAnimate
            ? 'left 0.3s cubic-bezier(0.34, 1.1, 0.64, 1), width 0.3s cubic-bezier(0.34, 1.1, 0.64, 1)'
            : 'none'
        }}
      />
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
