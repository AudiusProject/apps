import { useState, MouseEvent } from 'react'

import cn from 'classnames'

import heartActiveMatrix from 'assets/img/iconHeartActiveMatrix@2x.png'
import heartDark from 'assets/img/iconHeartDark@2x.png'
import heartDarkActive from 'assets/img/iconHeartDarkActive@2x.png'
import heartDarkAlt from 'assets/img/iconHeartDarkAlt@2x.png'
import heartInactiveMatrix from 'assets/img/iconHeartInactiveMatrix@2x.png'
import heartLight from 'assets/img/iconHeartLight@2x.png'
import heartLightActive from 'assets/img/iconHeartLightActive@2x.png'
import heartLightAlt from 'assets/img/iconHeartLightAlt@2x.png'

import styles from './FavoriteButton.module.css'

const messages = {
  favorite: 'Favorite',
  unfavorite: 'Unfavorite'
}
type FavoriteButtonProps = {
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
}

const iconMap = {
  dark: {
    active: {
      regular: heartDarkActive,
      variant: heartDarkActive
    },
    inactive: {
      regular: heartDark,
      variant: heartDarkAlt
    }
  },
  light: {
    active: {
      regular: heartLightActive,
      variant: heartLightActive
    },
    inactive: {
      regular: heartLight,
      variant: heartLightAlt
    }
  },
  matrix: {
    active: {
      regular: heartActiveMatrix,
      variant: heartActiveMatrix
    },
    inactive: {
      regular: heartInactiveMatrix,
      variant: heartInactiveMatrix
    }
  }
}

const FavoriteButton = ({
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
  altVariant = false
}: FavoriteButtonProps) => {
  const [xAnim, setXAnim] = useState(false)
  const [yAnim, setYAnim] = useState(false)

  const icon =
    iconMap[isMatrixMode ? 'matrix' : isDarkMode ? 'dark' : 'light'][
      isActive ? 'active' : 'inactive'
    ][altVariant ? 'variant' : 'regular']

  return (
    <div
      className={cn(
        {
          [styles.scaleYHolder]: yAnim,
          [styles.isHidden]: isUnlisted,
          [styles.isDisabled]: isDisabled
        },
        styles.heartWrapper,
        wrapperClassName
      )}
      onAnimationEnd={() => {
        setYAnim(false)
      }}
      onClick={(e) => {
        if (iconMode) return
        stopPropagation && e.stopPropagation()
        if (isDisabled) return
        setXAnim(true)
        setYAnim(true)
        onClick(e)
      }}
      aria-label={isActive ? messages.unfavorite : messages.favorite}
    >
      <div
        className={cn(
          styles.heart,
          { [styles.scaleXHolder]: xAnim },
          className
        )}
        style={{
          backgroundImage: `url(${icon})`,
          opacity: isDisabled ? 0.5 : 1
        }}
        onAnimationEnd={() => {
          setXAnim(false)
        }}
      />
    </div>
  )
}

export default FavoriteButton
