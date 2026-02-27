import { memo } from 'react'

import AnimatedBottomButton from './AnimatedBottomButton'
import { ButtonProps } from './types'

const LibraryButton = ({
  darkMode,
  onClick,
  href,
  isActive,
  isMatrixMode,
  ...buttonProps
}: ButtonProps) => {
  return (
    <AnimatedBottomButton
      uniqueKey='library-button'
      isActive={isActive}
      isMatrix={isMatrixMode}
      onClick={onClick}
      href={href}
      iconJSON={() =>
        import('../../../assets/animations/iconFavoriteLight.json').then(
          (m) => m.default
        )
      }
      {...buttonProps}
    />
  )
}

export default memo(LibraryButton)
