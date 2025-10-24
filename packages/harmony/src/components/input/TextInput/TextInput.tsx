import { ReactNode, forwardRef, useId } from 'react'

import cn from 'classnames'

import { Text, TextSize } from '~harmony/components/text'
import type { TextColors } from '~harmony/foundations/color/semantic'
import { IconCloseAlt } from '~harmony/icons'

import { Flex } from '../../layout'
import { useFocusState } from '../useFocusState'

import styles from './TextInput.module.css'
import { TextInputSize, type TextInputProps } from './types'

/**
 * An input is a field where users can enter and edit text and  enables the user to provide input in the form of plain text.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (props, ref) => {
    const {
      'aria-label': ariaLabel,
      required,
      className,
      inputRootClassName,
      maxLength,
      showMaxLengthThreshold = 0.7,
      maxLengthWarningThreshold = 0.9,
      size = TextInputSize.DEFAULT,
      hideLabel,
      hidePlaceholder,
      label: labelProp,
      value,
      id: idProp,
      warning: warningProp,
      error,
      className: inputClassName,
      disabled,
      onFocus: onFocusProp,
      onBlur: onBlurProp,
      placeholder,
      helperText,
      startAdornmentText,
      endAdornmentText,
      startIcon: StartIcon,
      endIcon: EndIcon,
      IconProps,
      endAdornment: endAdornmentProp,
      elevateLabel,
      onClear,
      _incorrectError,
      _isHovered,
      _isFocused,
      _disablePointerEvents,
      ...other
    } = props

    let endAdornment: null | ReactNode
    if (EndIcon != null) {
      endAdornment = <EndIcon size='l' color='subdued' {...IconProps} />
    } else if (endAdornmentProp != null) {
      endAdornment = endAdornmentProp
    } else {
      endAdornment = null
    }

    /**
     * Since Firefox doesn't support the :has() pseudo selector,
     * manually track the focused state and use classes for focus, required, and disabled
     */
    const [isFocusedState, handleFocus, handleBlur] = useFocusState(
      onFocusProp,
      onBlurProp
    )

    const isFocused = _isFocused ?? isFocusedState

    // For focus behavior and accessiblity, <label> needs to have a htmlFor={} provided to an id matching the input
    const backupId = useId()
    const id = idProp ?? backupId

    const characterCount = value !== undefined ? `${value}`.length : 0
    const hasValue = characterCount > 0

    // Hide the label when requested or when the size is set to small or extra small
    const shouldShowLabel =
      !hideLabel &&
      size !== TextInputSize.SMALL &&
      size !== TextInputSize.EXTRA_SMALL
    const labelText = required ? `${labelProp} *` : labelProp
    const placeholderText =
      required && hideLabel
        ? `${placeholder} *`
        : size === TextInputSize.SMALL || size === TextInputSize.EXTRA_SMALL
          ? labelText
          : placeholder
    const helperTextSize: TextSize =
      size === TextInputSize.SMALL || size === TextInputSize.EXTRA_SMALL
        ? 'xs'
        : 's'

    // Whenever a label isn't visible the placeholder should be visible in it's place (if provided)
    const shouldShowPlaceholder =
      (isFocused || !shouldShowLabel) && !hidePlaceholder
    const shouldShowAdornments = isFocused || hasValue || !shouldShowLabel
    // Show the maxlength text whenever we hit a certain threshold (default 70%) + the input is focused
    const shouldShowMaxLengthText =
      isFocused &&
      maxLength &&
      characterCount >= showMaxLengthThreshold * maxLength
    // Turn the maxlength text to the warning color whenever we hit a certain threshold (default 90%)
    let maxLengthTextColor: TextColors = 'default'
    if (maxLength && characterCount > maxLength) {
      maxLengthTextColor = 'danger'
    } else if (
      maxLength &&
      characterCount >= maxLengthWarningThreshold * maxLength
    ) {
      maxLengthTextColor = 'warning'
    }

    // Styles for the root of the input
    const inputRootStyle = {
      [styles.default]: size === TextInputSize.DEFAULT,
      [styles.small]: size === TextInputSize.SMALL,
      [styles.extraSmall]: size === TextInputSize.EXTRA_SMALL,
      [styles.warning]: warningProp,
      [styles.error]: error,
      [styles.focused]: isFocused || _isFocused,
      [styles.disabled]: disabled,
      [styles.required]: required,
      [styles.hover]: _isHovered,
      [styles.incorrectError]: _incorrectError,
      [styles.disablePointerEvents]: _disablePointerEvents
    }

    // Styles for the input element itself
    const inputElStyle = {
      [styles.default]: size === TextInputSize.DEFAULT,
      [styles.small]: size === TextInputSize.SMALL,
      [styles.extraSmall]: size === TextInputSize.EXTRA_SMALL,
      [styles.disabled]: disabled,
      [styles.focused]: isFocused
    }

    const inputElement = (
      <Flex alignItems='center' justifyContent='space-between'>
        {startAdornmentText && shouldShowAdornments ? (
          <Text variant='label' size='l' color='subdued'>
            {startAdornmentText}
          </Text>
        ) : null}
        <input
          onFocus={handleFocus}
          onBlur={handleBlur}
          ref={ref}
          className={cn(styles.input, inputClassName, inputElStyle)}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={shouldShowPlaceholder ? placeholderText : undefined}
          aria-label={(ariaLabel ?? shouldShowLabel) ? labelText : undefined}
          aria-required={required}
          id={id}
          autoComplete='off'
          {...other}
        />
        {endAdornmentText && shouldShowAdornments ? (
          <Text variant='label' size='l' color='subdued'>
            {endAdornmentText}
          </Text>
        ) : null}
      </Flex>
    )

    const isLabelElevated = hasValue || isFocused || elevateLabel

    return (
      <Flex
        className={cn(styles.root, className)}
        direction='column'
        gap='xs'
        alignItems='flex-start'
        w='100%'
      >
        <label
          htmlFor={id}
          className={cn(
            styles.contentContainer,
            inputRootClassName,
            inputRootStyle
          )}
        >
          {StartIcon ? (
            <StartIcon
              size={
                size === TextInputSize.EXTRA_SMALL
                  ? 's'
                  : size === TextInputSize.SMALL
                    ? 'l'
                    : undefined
              }
              color='subdued'
              {...IconProps}
            />
          ) : null}
          <Flex direction='column' gap='xs' justifyContent='center' w='100%'>
            {shouldShowLabel ? (
              <Flex
                className={styles.labelRow}
                direction='row'
                alignItems='center'
                justifyContent='space-between'
                gap='s'
              >
                <Text
                  variant='body'
                  tag='span'
                  size={isLabelElevated ? 's' : 'l'}
                  color='subdued'
                  css={(theme) => ({
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    zIndex: 2,
                    transition: `all ${theme.motion.expressive}`,
                    transform: isLabelElevated
                      ? 'translate(0, 0)'
                      : 'translate(0px, 13px)'
                  })}
                >
                  {labelText}
                </Text>
                {shouldShowMaxLengthText ? (
                  <Text
                    variant='body'
                    size='xs'
                    tag='span'
                    color={maxLengthTextColor}
                  >
                    {characterCount}/{maxLength}
                  </Text>
                ) : null}
              </Flex>
            ) : null}
            {inputElement}
          </Flex>
          {onClear && value ? (
            <IconCloseAlt onClick={onClear} color='subdued' />
          ) : null}
          {endAdornment}
        </label>
        {helperText ? (
          <Text
            variant='body'
            size={helperTextSize}
            color={error ? 'danger' : _incorrectError ? 'warning' : 'default'}
          >
            {helperText}
          </Text>
        ) : null}
      </Flex>
    )
  }
)
