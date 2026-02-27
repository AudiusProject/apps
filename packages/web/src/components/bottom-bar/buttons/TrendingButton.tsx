import { memo } from 'react'

import AnimatedBottomButton from './AnimatedBottomButton'
import { ButtonProps } from './types'

const TrendingButton = ({
  darkMode,
  onClick,
  href,
  isActive,
  isMatrixMode,
  ...buttonProps
}: ButtonProps) => {
  return (
    <AnimatedBottomButton
      uniqueKey='trending-button'
      isActive={isActive}
      isMatrix={isMatrixMode}
      onClick={onClick}
      href={href}
      iconJSON={() =>
        import('../../../assets/animations/iconTrendingLight.json').then(
          (m) => m.default
        )
      }
      {...buttonProps}
    />
  )
}

export default memo(TrendingButton)
