import { memo } from 'react'

import { IconLibrary } from '@audius/harmony'

import StaticBottomButton from './StaticBottomButton'
import { ButtonProps } from './types'

const LibraryButton = ({
  darkMode: _darkMode,
  isMatrixMode: _isMatrixMode,
  onClick,
  href,
  isActive,
  ...buttonProps
}: ButtonProps) => {
  return (
    <StaticBottomButton
      icon={IconLibrary}
      isActive={isActive}
      onClick={onClick}
      href={href}
      {...buttonProps}
    />
  )
}

export default memo(LibraryButton)
