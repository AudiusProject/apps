import { memo } from 'react'

import AnimatedBottomButton from './AnimatedBottomButton'
import { ButtonProps } from './types'

const ExploreButton = ({
  darkMode,
  onClick,
  href,
  isActive,
  isMatrixMode,
  ...buttonProps
}: ButtonProps) => {
  return (
    <AnimatedBottomButton
      uniqueKey='explore-button'
      isActive={isActive}
      isMatrix={isMatrixMode}
      onClick={onClick}
      href={href}
      iconJSON={() =>
        import('../../../assets/animations/iconSearchExplore.json').then(
          (m) => m.default
        )
      }
      {...buttonProps}
    />
  )
}

export default memo(ExploreButton)
