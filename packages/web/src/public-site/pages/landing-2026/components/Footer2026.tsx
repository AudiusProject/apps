import { MouseEvent } from 'react'

import { route } from '@audius/common/utils'
import {
  IconAudiusLogoHorizontal,
  IconDiscord,
  IconInstagram,
  IconTikTok,
  IconX
} from '@audius/harmony'
import type { IconComponent } from '@audius/harmony'
import { useNavigate } from 'react-router'

import { handleClickRoute } from 'public-site/components/handleClickRoute'

import styles from './Footer2026.module.css'

const { PRIVACY_POLICY, TERMS_OF_SERVICE } = route

type Footer2026Props = {
  isMobile: boolean
  setRenderPublicSite: (shouldRender: boolean) => void
}

const siteLinks = [
  { label: 'Audius', href: 'https://audius.co/' },
  { label: 'Download', href: 'https://audius.co/download' },
  { label: 'The Blog', href: 'https://blog.audius.co/' },
  { label: 'Support', href: 'https://help.audius.co/' }
]

const socialLinks: { label: string; href: string; Icon: IconComponent }[] = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/audiusmusic',
    Icon: IconInstagram
  },
  {
    label: 'Discord',
    href: 'https://discord.com/invite/audius',
    Icon: IconDiscord
  },
  {
    label: 'TikTok',
    href: 'https://tiktok.com/@audius',
    Icon: IconTikTok
  },
  {
    label: 'X (Twitter)',
    href: 'https://twitter.com/audiusproject',
    Icon: IconX
  }
]

export const Footer2026 = (props: Footer2026Props) => {
  const navigate = useNavigate()

  const onLegalClick = (legalRoute: string) => (e: MouseEvent) => {
    handleClickRoute(legalRoute, props.setRenderPublicSite, navigate)(e)
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.content}>
          <div className={styles.topRow}>
            <div className={styles.logoWrap}>
              <IconAudiusLogoHorizontal
                height={32}
                width='auto'
                color='default'
                className={styles.logo}
              />
            </div>
            <div className={styles.columns}>
              <div className={styles.column}>
                <p className={styles.columnHeading}>Links</p>
                {siteLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className={styles.footerLink}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <span className={styles.footerLinkText}>{link.label}</span>
                  </a>
                ))}
              </div>
              <div className={styles.column}>
                <p className={styles.columnHeading}>Socials</p>
                {socialLinks.map((link) => {
                  const Icon = link.Icon
                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      className={styles.footerLink}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <span className={styles.socialIcon}>
                        <Icon size='s' color='default' />
                      </span>
                      <span className={styles.footerLinkText}>
                        {link.label}
                      </span>
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
          <hr className={styles.divider} />
          <div className={styles.bottomRow}>
            <p className={styles.copyright}>
              &copy; 2025 Audius Music. All rights reserved.
            </p>
            <div className={styles.legalLinks}>
              <button
                type='button'
                className={styles.legalLink}
                onClick={onLegalClick(TERMS_OF_SERVICE)}
              >
                Terms of Service
              </button>
              <button
                type='button'
                className={styles.legalLink}
                onClick={onLegalClick(PRIVACY_POLICY)}
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
