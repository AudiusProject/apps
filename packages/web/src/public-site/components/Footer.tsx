import { route } from '@audius/common/utils'
import {
  IconAudiusLogoHorizontalColorNew,
  IconTelegram,
  IconInstagram,
  IconDiscord,
  IconX
} from '@audius/harmony'
import cn from 'classnames'
import { useNavigate } from 'react-router-dom'

import styles from './Footer.module.css'
import { handleClickRoute } from './handleClickRoute'

const {
  HOME_PAGE,
  AUDIUS_X_LINK,
  AUDIUS_INSTAGRAM_LINK,
  AUDIUS_DISCORD_LINK,
  AUDIUS_PRESS_LINK,
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
  API_TERMS,
  OPEN_MUSIC_LICENSE_LINK,
  TRENDING_PAGE,
  AUDIUS_BLOG_LINK,
  DOWNLOAD_LINK,
  AUDIUS_HELP_LINK,
  AUDIUS_ORG,
  AUDIUS_PROTOCOL_DASHBOARD_LINK,
  AUDIUS_TELEGRAM_LINK
} = route

const bottomLinks = [
  {
    text: 'Terms of Service',
    link: TERMS_OF_SERVICE
  },
  {
    text: 'Privacy Policy',
    link: PRIVACY_POLICY
  },
  {
    text: 'API Terms of Service',
    link: API_TERMS
  },
  {
    text: 'Open Music License',
    link: OPEN_MUSIC_LICENSE_LINK
  }
]

const resourcesLinks = [
  {
    text: 'The Blog',
    link: AUDIUS_BLOG_LINK
  },
  {
    text: 'Brand / Press',
    link: AUDIUS_PRESS_LINK
  },
  {
    text: 'Open Audio Foundation',
    link: AUDIUS_ORG
  },
  {
    text: 'Protocol Dashboard',
    link: AUDIUS_PROTOCOL_DASHBOARD_LINK
  }
]

const socialLinks = [
  {
    text: 'Instagram',
    Icon: IconInstagram,
    link: AUDIUS_INSTAGRAM_LINK
  },
  {
    text: 'X',
    Icon: IconX,
    link: AUDIUS_X_LINK
  },
  {
    text: 'Discord',
    Icon: IconDiscord,
    link: AUDIUS_DISCORD_LINK
  },
  {
    text: 'Telegram',
    Icon: IconTelegram,
    link: AUDIUS_TELEGRAM_LINK
  }
]

const messages = {
  copyright: (year: number | string) =>
    `© ${year} Audius Music. All rights reserved.`,
  product: 'Product',
  resources: 'Resources',
  socials: 'Socials'
}

type FooterProps = {
  isMobile: boolean
  setRenderPublicSite: (shouldRender: boolean) => void
}

const Footer = (props: FooterProps) => {
  const navigate = useNavigate()
  return (
    <div
      className={cn(styles.container, {
        [styles.isMobile]: props.isMobile
      })}
    >
      <div className={styles.content}>
        <div className={styles.logoLinkContainer}>
          <IconAudiusLogoHorizontalColorNew
            className={styles.logo}
            onClick={handleClickRoute(
              HOME_PAGE,
              props.setRenderPublicSite,
              navigate
            )}
          />
          <div className={styles.siteLinksContainer}>
            <div className={styles.siteLinksColumnContainer}>
              <p className={styles.siteLinksColumnTitle}>{messages.product}</p>
              <a
                onClick={handleClickRoute(
                  TRENDING_PAGE,
                  props.setRenderPublicSite,
                  navigate
                )}
                className={cn(styles.siteLink, styles.link)}
              >
                Audius Music
              </a>
              <a
                href={DOWNLOAD_LINK}
                target='_blank'
                className={cn(styles.siteLink, styles.link)}
                rel='noreferrer'
              >
                Download
              </a>
              <a
                href={AUDIUS_HELP_LINK}
                target='_blank'
                className={cn(styles.siteLink, styles.link)}
                rel='noreferrer'
              >
                Support
              </a>
            </div>
            <div className={styles.siteLinksColumnContainer}>
              <p className={styles.siteLinksColumnTitle}>
                {messages.resources}
              </p>
              {resourcesLinks.map((link) => (
                <a
                  key={link.text}
                  href={link.link}
                  target='_blank'
                  className={cn(styles.siteLink, styles.link)}
                  rel='noreferrer'
                >
                  {link.text}
                </a>
              ))}
            </div>
            <div className={styles.siteLinksColumnContainer}>
              <p className={styles.siteLinksColumnTitle}>{messages.socials}</p>
              {socialLinks.map(({ Icon, link, text }, idx) => (
                <a
                  key={idx}
                  href={link}
                  target='_blank'
                  className={styles.socialIconLinkContainer}
                  rel='noreferrer'
                >
                  <Icon className={styles.socialIconLink} />
                  {text}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.divider}></div>
        <div className={styles.linksContainer}>
          <div className={styles.rightsContainer}>
            {!props.isMobile ? (
              <div>{messages.copyright(new Date().getFullYear())}</div>
            ) : null}
            <div className={styles.bottomLinks}>
              {bottomLinks.map(({ text, link }) => (
                <a
                  key={text}
                  href={link}
                  className={cn(styles.bottomLink, styles.link)}
                  onClick={handleClickRoute(
                    link,
                    props.setRenderPublicSite,
                    navigate
                  )}
                >
                  {text}
                </a>
              ))}
            </div>
            {props.isMobile ? (
              <div>{messages.copyright(new Date().getFullYear())}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Footer
