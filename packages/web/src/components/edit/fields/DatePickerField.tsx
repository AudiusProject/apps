import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

import { dayjs } from '@audius/common/utils'
import { Flex, IconCalendarMonth, Popup, Text } from '@audius/harmony'
import cn from 'classnames'
import { useField, useFormikContext } from 'formik'

import lazyWithPreload from 'utils/lazyWithPreload'

import styles from './DatePickerField.module.css'

// Lazy load react-datepicker since it's only used when the popup is open
// Preload when the date field is focused to minimize delay (200ms auto-preload)
// CSS is imported dynamically as part of the lazy load to avoid linter errors
const ReactDatePicker = lazyWithPreload(
  () =>
    import('react-datepicker').then((module) => {
      // Dynamically import CSS to avoid linter errors about package exports
      import('react-datepicker/dist/react-datepicker.css')
      return module
    }),
  200
)

type DatePickerFieldProps = {
  name: string
  label: string
  style?: string
  shouldFocus?: boolean
  isInitiallyUnlisted?: boolean
  futureDatesOnly?: boolean
  maxDate?: Date
  minDate?: Date
}

/**
 * Wrapper component for the DatePicker component that integrates with Formik.
 */
export const DatePickerField = (props: DatePickerFieldProps) => {
  const { submitCount } = useFormikContext()
  const [{ value }, { touched, error }, helpers] = useField<string | undefined>(
    props.name
  )

  const onChange = useCallback(
    (value: string) => {
      helpers.setValue(value)
      helpers.setTouched(true, false)
    },
    [helpers]
  )

  return (
    <DatePicker
      {...props}
      value={value}
      touched={touched}
      error={error}
      submitCount={submitCount}
      onChange={onChange}
    />
  )
}

type DatePickerProps = DatePickerFieldProps & {
  value?: string
  touched?: boolean
  error?: string
  submitCount?: number
  onChange: (value: string) => void
}

export const DatePicker = (props: DatePickerProps) => {
  const {
    name,
    label,
    style,
    shouldFocus,
    isInitiallyUnlisted,
    futureDatesOnly,
    maxDate,
    minDate,
    value,
    touched = false,
    error,
    submitCount = 0,
    onChange
  } = props

  const [isFocused, setIsFocused] = useState(false)
  const anchorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => setIsFocused(shouldFocus ?? false), [shouldFocus])

  // Preload the date picker when user focuses on the field
  useEffect(() => {
    if (isFocused) {
      ReactDatePicker.preload()
    }
  }, [isFocused])

  return (
    <Flex direction='column' gap='s'>
      <Flex
        backgroundColor='surface1'
        border='default'
        borderRadius='s'
        ph='l'
        pv='m'
        w='100%'
        css={(theme) => ({
          '&:hover': {
            borderColor: theme.color.border.strong
          }
        })}
      >
        <div
          ref={anchorRef}
          aria-haspopup
          role='button'
          tabIndex={0}
          className={styles.datePickerField}
          onClick={() => setIsFocused(true)}
        >
          <IconCalendarMonth color='subdued' className={styles.iconCalendar} />
          <div>
            <div className={cn(styles.label, { [styles.noValue]: !value })}>
              {label}
            </div>
            <input
              className={styles.input}
              name={name}
              value={value ? dayjs(value).format('L') : ''}
              aria-readonly
              readOnly
            />
            <div className={styles.displayValue}>
              {value
                ? dayjs(value)
                    .calendar(undefined, {
                      sameDay: '[Today]',
                      nextDay: '[Tomorrow]',
                      nextWeek: 'dddd',
                      lastDay: '[Yesterday]',
                      lastWeek: '[Last] dddd',
                      sameElse: 'M/D/YYYY'
                    })
                    .split(' at')[0]
                : null}
            </div>
          </div>
        </div>
        <Popup
          anchorRef={anchorRef}
          isVisible={isFocused}
          onClose={() => setIsFocused(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <div className={cn(styles.datePicker, style)}>
            <Suspense
              fallback={<div className={styles.loading}>Loading...</div>}
            >
              <ReactDatePicker
                selected={value ? dayjs(value).toDate() : null}
                onChange={(date: Date | null) => {
                  if (date) {
                    onChange(dayjs(date).startOf('day').toString())
                  }
                  setIsFocused(false)
                }}
                minDate={minDate}
                maxDate={maxDate}
                filterDate={(date: Date) => {
                  const dateDayjs = dayjs(date)
                  if (maxDate && minDate) {
                    return (
                      dateDayjs.isAfter(dayjs(minDate).subtract(1, 'day')) &&
                      dateDayjs.isBefore(dayjs(maxDate).add(1, 'day'))
                    )
                  }
                  if (maxDate) {
                    return (
                      dateDayjs.isAfter(dayjs().subtract(1, 'day')) &&
                      dateDayjs.isBefore(dayjs(maxDate).add(1, 'day'))
                    )
                  }
                  if (minDate) {
                    return dateDayjs.isAfter(dayjs(minDate).subtract(1, 'day'))
                  }
                  if (futureDatesOnly) {
                    return dateDayjs.isAfter(dayjs().subtract(1, 'day'))
                  } else if (isInitiallyUnlisted) {
                    return dateDayjs.isBefore(
                      dayjs().add(1, 'year').add(1, 'day')
                    )
                  } else {
                    return dateDayjs.isBefore(dayjs().add(1, 'day'))
                  }
                }}
                open={isFocused}
                onCalendarOpen={() => setIsFocused(true)}
                onCalendarClose={() => setIsFocused(false)}
                inline
                calendarClassName={styles.reactDatepicker}
                dateFormat='MM/dd/yyyy'
                showMonthDropdown={false}
                showYearDropdown={false}
              />
            </Suspense>
          </div>
        </Popup>
      </Flex>
      {error && (touched || submitCount > 0) ? (
        <Text color='danger'>{error}</Text>
      ) : null}
    </Flex>
  )
}
