import { useState, MouseEvent } from 'react'

import { uuid } from '@audius/common/utils'

import AnimatedButtonProvider from './AnimatedButtonProvider'

export enum AnimatedIconType {
  FAVORITE = 'FAVORITE',
  FAVORITE_LIGHT = 'FAVORITE_LIGHT',
  REPOST = 'REPOST',
  REPOST_LIGHT = 'REPOST_LIGHT'
}

/** Base asset path per icon - theme applied at runtime via useLottieThemeColors */
const animationMap: Record<AnimatedIconType, string> = {
  [AnimatedIconType.FAVORITE]: 'iconFavoriteLight',
  [AnimatedIconType.REPOST]: 'iconRepostLight',
  [AnimatedIconType.FAVORITE_LIGHT]: 'iconFavoriteLighterLight',
  [AnimatedIconType.REPOST_LIGHT]: 'iconRepostLighterLight'
}

type AnimatedIconButtonProps = {
  onClick?: (e: MouseEvent) => void
  href?: string
  isDisabled?: boolean
  isActive?: boolean
  className?: string
  wrapperClassName?: string
  stopPropagation?: boolean
  activeClassName?: string
  disabledClassName?: string
  icon: AnimatedIconType
  /** @deprecated Theme applied at runtime - no longer used */
  darkMode?: boolean
  isMatrix?: boolean
  'aria-label'?: string
}

const AnimatedIconButton = ({
  onClick,
  href,
  className,
  wrapperClassName,
  activeClassName,
  disabledClassName,
  icon,
  isMatrix = false,
  isDisabled = false,
  isActive = false,
  stopPropagation = false,
  'aria-label': ariaLabel,
  ...rest
}: AnimatedIconButtonProps) => {
  const assetPath = animationMap[icon]
  const [uniqueKey] = useState(`${uuid()}-${icon}`)
  return (
    <AnimatedButtonProvider
      uniqueKey={uniqueKey}
      isActive={isActive}
      isDisabled={isDisabled}
      isMatrix={isMatrix}
      onClick={onClick ?? (() => {})}
      href={href}
      iconJSON={() =>
        import(`../../assets/animations/${assetPath}.json`).then(
          (m) => m.default
        )
      }
      activeClassName={activeClassName}
      disabledClassName={disabledClassName}
      className={className}
      wrapperClassName={wrapperClassName}
      stopPropagation={stopPropagation}
      aria-label={ariaLabel}
      {...rest}
    />
  )
}

export default AnimatedIconButton
