import { forwardRef } from 'react'

import { CSSObject, useTheme } from '@emotion/react'
import { Slot, Slottable } from '@radix-ui/react-slot'

import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'

import { useMediaQueryListener } from '../../../hooks/useMediaQueryListener'
import type { BaseButtonProps } from '../types'

/**
 * Base component for Harmony buttons. Not intended to be used directly. Use
 * `Button` or `PlainButton`.
 */
export const BaseButton = forwardRef<HTMLButtonElement, BaseButtonProps>(
  function BaseButton(props, ref) {
    const {
      iconLeft: LeftIconComponent,
      iconRight: RightIconComponent,
      disabled,
      isLoading,
      widthToHideText,
      minWidth,
      fullWidth,
      styles,
      style,
      children,
      'aria-label': ariaLabelProp,
      asChild,
      _isHovered,
      _isPressed,
      ...other
    } = props
    const { motion, typography } = useTheme()
    const { isMatch: isTextHidden } = useMediaQueryListener(
      `(max-width: ${widthToHideText}px)`
    )

    const getAriaLabel = () => {
      // always default to manual aria-label prop if provided
      if (ariaLabelProp) return ariaLabelProp
      // We use the children prop as the aria-label if the text becomes hidden
      // and no aria-label was provided to keep the button accessible.
      if (isTextHidden && typeof children === 'string') return children
      return undefined
    }

    const ButtonComponent = asChild ? Slot : 'button'

    const buttonComponentCss: CSSObject = {
      fontFamily: typography.font,
      alignItems: 'center',
      boxSizing: 'border-box',
      cursor: 'pointer',
      display: 'inline-flex',
      flexShrink: 0,
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
      textAlign: 'center',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      transition: `
        transform ${motion.hover},
        border-color ${motion.hover}
      `,

      ...(fullWidth && {
        width: '100%',
        flexShrink: 1
      }),

      ':focus': {
        outline: 'none !important'
      },
      ':hover': {
        transform: 'scale(1.04)'
      },
      ':active': {
        transform: 'scale(0.98)'
      },

      ...((disabled || isLoading || _isHovered || _isPressed) && {
        pointerEvents: 'none'
      }),
      ...(_isHovered && {
        transform: 'scale(1.04)'
      }),
      ...(_isPressed && {
        transform: 'scale(0.98)'
      })
    }

    const iconCss = {
      '& path': {
        fill: 'currentcolor'
      }
    }

    return (
      <ButtonComponent
        css={[buttonComponentCss, styles.button]}
        disabled={disabled || isLoading}
        ref={ref}
        type={asChild ? undefined : 'button'}
        style={{
          minWidth: minWidth && !isTextHidden ? `${minWidth}px` : 'unset',
          ...style
        }}
        aria-label={getAriaLabel()}
        {...other}
      >
        {isLoading ? (
          <LoadingSpinner css={styles.icon} />
        ) : LeftIconComponent ? (
          <LeftIconComponent css={[iconCss, styles.icon]} />
        ) : null}
        {!isTextHidden ? <Slottable>{children}</Slottable> : null}
        {RightIconComponent ? (
          <RightIconComponent css={[iconCss, styles.icon]} />
        ) : null}
      </ButtonComponent>
    )
  }
)
