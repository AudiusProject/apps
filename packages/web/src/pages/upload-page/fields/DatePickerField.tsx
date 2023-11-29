import 'react-dates/initialize'
import 'react-dates/lib/css/_datepicker.css'

import { SetStateAction, useEffect, useRef, useState } from 'react'

import { FeatureFlags } from '@audius/common'
import { Popup } from '@audius/stems'
import cn from 'classnames'
import { useField } from 'formik'
import moment from 'moment'
import {
  isInclusivelyBeforeDay,
  DayPickerSingleDateController
} from 'react-dates'

import IconCalendar from 'assets/img/iconCalendar.svg'
import { useFlag } from 'hooks/useRemoteConfig'

import styles from './DatePickerField.module.css'
import { should } from 'vitest'

type DatePickerFieldProps = {
  name: string
  label: string
  style?: string
  shouldFocus?: boolean
}

export const DatePickerField = (props: DatePickerFieldProps) => {
  const { name, label, style, shouldFocus } = props
  const [field, , helpers] = useField<string | undefined>(name)
  const [isFocused, setIsFocused] = useState(false)
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const { isEnabled: isScheduledReleasesEnabled } = useFlag(
    FeatureFlags.SCHEDULED_RELEASES
  )

  useEffect(() => setIsFocused(shouldFocus ?? false), [shouldFocus])

  return (
    <>
      <div
        ref={anchorRef}
        aria-haspopup
        role='button'
        tabIndex={0}
        className={styles.datePickerField}
        onClick={() => setIsFocused(true)}
      >
        <IconCalendar className={styles.iconCalendar} />
        <div>
          <div className={styles.label}>{label}</div>
          <input
            className={styles.input}
            name={name}
            value={moment(field.value).format('L')}
            aria-readonly
            readOnly
          />
          <div className={styles.displayValue}>
            {moment(field.value).calendar().split(' at')[0]}
          </div>
        </div>
      </div>
      <Popup
        anchorRef={anchorRef}
        isVisible={isFocused}
        onClose={() => setIsFocused(false)}
      >
        <div className={cn(styles.datePicker, style)}>
          <DayPickerSingleDateController
            // @ts-ignore todo: upgrade moment
            date={moment(field.value)}
            onDateChange={(value) => {
              console.log('asdf onDateChange')
              helpers.setValue(value?.toString())
            }}
            isOutsideRange={(day) =>
              isScheduledReleasesEnabled
                ? false
                : // @ts-ignore mismatched moment versions; shouldn't be relevant here
                  !isInclusivelyBeforeDay(day, moment())
            }
            focused={isFocused}
            isFocused={isFocused}
            onFocusChange={({ focused }) => setIsFocused(focused)}
            // @ts-ignore mismatched moment versions; shouldn't be relevant here
            initialVisibleMonth={() => moment()} // PropTypes.func or null,
            hideKeyboardShortcutsPanel
            noBorder
          />
        </div>
      </Popup>
    </>
  )
}
