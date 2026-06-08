import { memo } from 'react'

import AnimatedBottomButton from './AnimatedBottomButton'
import { ButtonProps } from './types'

const ProfileButton = ({
  darkMode,
  onClick,
  href,
  isActive,
  isMatrixMode,
  ...buttonProps
}: ButtonProps) => {
  return (
    <AnimatedBottomButton
      uniqueKey='profile-button'
      isActive={isActive}
      isMatrix={isMatrixMode}
      onClick={onClick}
      href={href}
      aria-label='Profile Page'
      iconJSON={() =>
        import('../../../assets/animations/iconProfileLight.json').then(
          (m) => m.default
        )
      }
      {...buttonProps}
    />
  )
}

export default memo(ProfileButton)
