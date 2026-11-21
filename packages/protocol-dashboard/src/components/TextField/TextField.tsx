import React, { useState, useCallback } from 'react'

import clsx from 'clsx'

import styles from './TextField.module.css'

const formatValue = (value: string | undefined) => {
  if (!value) return value

  const capture = value.match(/^(?<whole>\d*)(?<dot>.)?(?<decimal>\d*)$/)
  if (!capture || !capture.groups) return value
  const { whole, decimal, dot } = capture.groups

  const numericWhole = whole ? parseInt(whole, 10) : 0
  const formattedWhole = numericWhole.toLocaleString('en-US')

  if (dot) {
    return `${formattedWhole}.${decimal}`
  }
  return formattedWhole
}

export enum Format {
  INPUT,
  TEXTAREA
}

type OwnProps = {
  className?: string
  labelClassName?: string
  inputClassName?: string
  label?: string
  type?: string
  format?: Format
  placeholder?: string
  rightLabel?: string
  value?: string
  isNumeric?: boolean
  onChange?: (text: string) => void
}

type TextFieldProps = OwnProps
const inputPaddingRight = 16
const TextField: React.FC<TextFieldProps> = ({
  className,
  labelClassName,
  inputClassName,
  label,
  value,
  type,
  format = Format.INPUT,
  placeholder,
  onChange,
  isNumeric,
  rightLabel
}: TextFieldProps) => {
  const [inputValue, setInputValue] = useState(value)
  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      let value = e.target.value
      if (isNumeric) {
        // @ts-ignore
        value = value.replaceAll(',', '')
      }
      setInputValue(value)
      if (onChange) onChange(value)
    },
    [setInputValue, onChange, isNumeric]
  )

  let displayValue
  if (isNumeric) {
    displayValue =
      value !== undefined ? formatValue(value) : formatValue(inputValue)
  } else {
    displayValue = value !== undefined ? value : inputValue
  }

  const [inputPadding, setInputPadding] = useState(inputPaddingRight)
  const setLabelRef = useCallback(
    (node) => {
      if (node) {
        const width = 78
        setInputPadding(width + inputPaddingRight)
      }
    },
    [setInputPadding]
  )

  return (
    <div className={clsx(styles.container, { [className!]: !!className })}>
      {label && (
        <div
          className={clsx(styles.label, {
            [labelClassName!]: !!labelClassName
          })}
        >
          {label}
        </div>
      )}
      {format === Format.INPUT ? (
        <input
          className={clsx(styles.input, {
            [inputClassName!]: !!inputClassName
          })}
          style={{ paddingRight: inputPadding }}
          value={displayValue}
          type={type}
          onChange={onInputChange}
          placeholder={placeholder}
        />
      ) : (
        <textarea
          className={clsx(styles.input, {
            [inputClassName!]: !!inputClassName
          })}
          style={{ paddingRight: inputPadding }}
          value={displayValue}
          onChange={onInputChange}
          placeholder={placeholder}
        />
      )}
      {rightLabel && (
        <div className={styles.rightLabel} ref={setLabelRef}>
          {rightLabel}
        </div>
      )}
    </div>
  )
}

export default TextField
