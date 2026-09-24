import { ReactElement } from 'react'

import { ExternalTextLink } from 'components/link'

import styles from './ProfileHeader.module.css'

type SocialLinkProps = {
  onClick?: () => void
  to: string
  icon: ReactElement
}

export const SocialLink = (props: SocialLinkProps) => {
  const { icon, ...other } = props
  return (
    <ExternalTextLink {...other} className={styles.socialIcon}>
      {icon}
    </ExternalTextLink>
  )
}
