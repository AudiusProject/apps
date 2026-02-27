import { memo } from 'react'

import AnimatedBottomButton from './AnimatedBottomButton'
import { ButtonProps } from './types'

const FeedButton = ({
  darkMode,
  onClick,
  href,
  isActive,
  isMatrixMode,
  ...buttonProps
}: ButtonProps) => {
  return (
    <AnimatedBottomButton
      uniqueKey='feed-button'
      isMatrix={isMatrixMode}
      isActive={isActive}
      onClick={onClick}
      href={href}
      iconJSON={() =>
        import('../../../assets/animations/iconFeedLight.json').then(
          (m) => m.default
        )
      }
      {...buttonProps}
    />
  )
}

export default memo(FeedButton)
