import { ReactNode } from 'react'

import {
  IconAudiusLogo,
  useTheme,
  IconHeart,
  IconPlaylists as IconPlaylist,
  IconRemix as IconRemixBase,
  IconRepost as IconRepostBase,
  IconStars,
  IconTastemaker as Tastemaker,
  IconTrending as IconTrendingBase,
  IconTrophy,
  IconUser,
  IconCart as IconCartBase
} from '@audius/harmony'

import styles from './icons.module.css'

export const IconFollow = () => {
  return <IconUser color='accent' className={styles.iconFollow} />
}

export const IconCart = () => {
  return <IconCartBase color='accent' className={styles.iconCart} />
}

export const IconRepost = () => {
  return <IconRepostBase color='accent' className={styles.iconRepost} />
}

export const IconFavorite = () => {
  return <IconHeart color='accent' className={styles.iconFavorite} />
}

export const IconMilestone = () => {
  return <IconTrophy color='accent' className={styles.iconMilestone} />
}

export const IconRelease = () => {
  return <IconStars color='accent' className={styles.iconRelease} />
}

export const IconRewards = ({ children }: { children: ReactNode }) => {
  return <span className={styles.iconRewards}>{children}</span>
}

export const IconTrending = () => {
  return <IconTrendingBase color='accent' className={styles.iconTrending} />
}

export const IconTastemaker = () => {
  return <Tastemaker color='accent' className={styles.iconTrending} />
}

export const IconTier = ({ children }: { children: ReactNode }) => {
  return <span className={styles.iconTier}>{children}</span>
}

export const IconRemix = () => {
  return <IconRemixBase color='accent' className={styles.iconRemix} />
}

export const IconAnnouncement = () => {
  const { spacing } = useTheme()
  return (
    <IconAudiusLogo size='l' color='accent' css={{ marginRight: spacing.s }} />
  )
}

export const IconAddTrackToPlaylist = () => {
  return (
    <IconPlaylist color='accent' className={styles.iconAddTrackToPlaylist} />
  )
}

export const IconStreakFire = () => {
  return (
    <span role='img' aria-label='fire' css={{ fontSize: 32 }}>
      🔥
    </span>
  )
}
