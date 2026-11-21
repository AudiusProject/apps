import { forwardRef, useState, MouseEvent } from 'react'

import cn from 'classnames'

import repostActiveMatrix from 'assets/img/iconRepostActiveMatrix@2x.png'
import repostDark from 'assets/img/iconRepostDark@2x.png'
import repostDarkActive from 'assets/img/iconRepostDarkActive@2x.png'
import repostDarkAlt from 'assets/img/iconRepostDarkAlt@2x.png'
import repostInactiveMatrix from 'assets/img/iconRepostInactiveMatrix@2x.png'
import repostLight from 'assets/img/iconRepostLight@2x.png'
import repostLightActive from 'assets/img/iconRepostLightActive@2x.png'
import repostLightAlt from 'assets/img/iconRepostLightAlt@2x.png'

import styles from './RepostButton.module.css'

type RepostButtonProps = {
  isDarkMode: boolean
  isMatrixMode: boolean
  onClick?: (e: MouseEvent) => void
  className?: string
  wrapperClassName?: string
  isActive?: boolean
  isDisabled?: boolean
  isUnlisted?: boolean
  stopPropagation?: boolean
  iconMode?: boolean
  altVariant?: boolean
  'aria-label'?: string
}

const iconMap = {
  dark: {
    active: {
      regular: repostDarkActive,
      variant: repostDarkActive
    },
    inactive: {
      regular: repostDark,
      variant: repostDarkAlt
    }
  },
  light: {
    active: {
      regular: repostLightActive,
      variant: repostLightActive
    },
    inactive: {
      regular: repostLight,
      variant: repostLightAlt
    }
  },
  matrix: {
    active: {
      regular: repostActiveMatrix,
      variant: repostActiveMatrix
    },
    inactive: {
      regular: repostInactiveMatrix,
      variant: repostInactiveMatrix
    }
  }
}

const RepostButton = forwardRef<HTMLButtonElement, RepostButtonProps>(
  (
    {
      isDarkMode,
      isMatrixMode,
      className,
      wrapperClassName,
      onClick = () => {},
      isActive = false,
      isDisabled = false,
      isUnlisted = false,
      stopPropagation = true,
      iconMode = false,
      altVariant = false,
      'aria-label': ariaLabel
    },
    ref
  ) => {
    const icon =
      iconMap[isMatrixMode ? 'matrix' : isDarkMode ? 'dark' : 'light'][
        isActive ? 'active' : 'inactive'
      ][altVariant ? 'variant' : 'regular']
    const [isSpinning, setIsSpinning] = useState(false)
    const [isDepressed, setIsDepressed] = useState(false)

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        className={cn(
          styles.button,
          {
            [styles.depress]: isDepressed,
            [styles.isHidden]: isUnlisted,
            [styles.isDisabled]: isDisabled
          },
          wrapperClassName
        )}
        onAnimationEnd={() => {
          setIsDepressed(false)
        }}
        onClick={(e) => {
          if (iconMode) return
          stopPropagation && e.stopPropagation()
          if (isDisabled) return
          setIsSpinning(true)
          setIsDepressed(true)
          onClick(e)
        }}
      >
        <div
          className={cn(styles.icon, { [styles.spin]: isSpinning }, className)}
          style={{
            backgroundImage: `url(${icon})`,
            opacity: isDisabled ? 0.5 : 1
          }}
          onAnimationEnd={() => {
            setIsSpinning(false)
          }}
        />
      </button>
    )
  }
)

export default RepostButton
