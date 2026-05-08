import { memo, useCallback, MouseEvent } from 'react'

import { IconHome } from '@audius/harmony'

import { SeoLink } from 'components/link'

import styles from './AnimatedBottomButton.module.css'
import { ButtonProps } from './types'

const HomeButton = ({
  onClick,
  href,
  isActive,
  ...buttonProps
}: ButtonProps) => {
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
      <IconHome
        width={28}
        height={28}
        color={isActive ? 'active' : 'default'}
      />
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

export default memo(HomeButton)
