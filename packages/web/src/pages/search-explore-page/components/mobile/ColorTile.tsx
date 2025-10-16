import { ReactNode } from 'react'

import cn from 'classnames'

import IconAudioRewardsPill from 'assets/img/iconAudioRewardsPill.svg'

import styles from './ColorTile.module.css'

type ColorTileProps = {
  title: string
  link: string
  description?: string
  gradient?: string
  shadow?: string
  icon?: ReactNode | JSX.Element | null
  emoji?: string
  className?: string
  goToRoute: (route: string) => void
  isIncentivized?: boolean
}

const ColorTile = ({
  title,
  link,
  description,
  gradient,
  shadow,
  icon,
  emoji,
  className,
  goToRoute,
  isIncentivized
}: ColorTileProps) => {
  const onClick = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    goToRoute(link)
  }
  return (
    <a
      className={cn(styles.colorTile, className, {
        [styles.hasEmoji]: !!emoji
      })}
      href={link}
      onClick={onClick}
      style={{
        boxShadow: `0 2px 8px -2px ${shadow}`,
        background: gradient
      }}
    >
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {emoji && <i className={`emoji xl ${emoji}`} />}
      {icon && <div className={styles.icon}>{icon}</div>}
      {isIncentivized ? (
        <div className={styles.rewardsPill}>
          <IconAudioRewardsPill />
        </div>
      ) : null}
    </a>
  )
}

export default ColorTile
