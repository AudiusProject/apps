import { MouseEvent, ReactNode, useCallback } from 'react'

import { IconComponent } from '@audius/harmony'

import { SeoLink } from 'components/link'

import styles from './AnimatedBottomButton.module.css'

type StaticBottomButtonProps = {
  icon: IconComponent
  onClick: () => void
  href?: string
  isActive: boolean
  badge?: ReactNode
  'aria-label'?: string
}

const StaticBottomButton = ({
  icon: Icon,
  onClick,
  href,
  isActive,
  badge,
  ...buttonProps
}: StaticBottomButtonProps) => {
  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault()
      onClick()
    },
    [onClick]
  )

  const rootProps = {
    onClick: handleClick,
    className: styles.animatedButton
  }

  const content = (
    <div
      className={styles.iconWrapper}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Icon width={28} height={28} color={isActive ? 'active' : 'default'} />
      {badge}
    </div>
  )

  return href ? (
    <SeoLink to={href} {...rootProps} {...buttonProps}>
      {content}
    </SeoLink>
  ) : (
    <button {...rootProps} {...buttonProps}>
      {content}
    </button>
  )
}

export default StaticBottomButton
