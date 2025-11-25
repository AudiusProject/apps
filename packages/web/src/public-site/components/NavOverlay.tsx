import { useEffect, useState } from 'react'

import { route } from '@audius/common/utils'
import {
  IconAudiusLogoHorizontalNew,
  IconInstagram,
  IconClose,
  IconX,
  IconDiscord,
  IconTelegram,
  IconCloudDownload as IconDownloadQueued,
  IconSupport,
  IconBlog,
  IconFoundation,
  IconLink
} from '@audius/harmony'
import cn from 'classnames'
import ReactDOM from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'

import HeroBackground from 'assets/img/publicSite/HeroBG@2x.webp'

import styles from './NavOverlay.module.css'
import { handleClickRoute } from './handleClickRoute'

const {
  AUDIUS_BLOG_LINK,
  AUDIUS_DISCORD_LINK,
  AUDIUS_HELP_LINK,
  AUDIUS_INSTAGRAM_LINK,
  AUDIUS_PROTOCOL_DASHBOARD_LINK,
  AUDIUS_ORG,
  SIGN_UP_PAGE,
  AUDIUS_TELEGRAM_LINK,
  AUDIUS_X_LINK,
  DOWNLOAD_START_LINK
} = route

const messages = {
  signUp: 'Sign Up',
  downloadTheApp: 'Download the App',
  helpAndSupport: 'Help & Support',
  readTheBlog: 'Read the Blog',
  protocolDashboard: 'Protocol Dashboard',
  openAudioFoundation: 'Open Audio Foundation'
}

const socialLinks = [
  {
    Icon: IconInstagram,
    link: AUDIUS_INSTAGRAM_LINK
  },
  {
    Icon: IconX,
    link: AUDIUS_X_LINK
  },
  {
    Icon: IconDiscord,
    link: AUDIUS_DISCORD_LINK
  },
  {
    Icon: IconTelegram,
    link: AUDIUS_TELEGRAM_LINK
  }
]

const dappLinks = [
  {
    text: messages.downloadTheApp,
    icon: <IconDownloadQueued className={styles.dappLinkIcon} />,
    link: DOWNLOAD_START_LINK
  },
  {
    text: messages.helpAndSupport,
    icon: <IconSupport className={styles.dappLinkIcon} />,
    link: AUDIUS_HELP_LINK
  },
  {
    text: messages.readTheBlog,
    icon: (
      <IconBlog
        className={cn(styles.dappLinkIcon, styles.dappLinkIconStroke)}
      />
    ),
    link: AUDIUS_BLOG_LINK
  },
  {
    text: messages.protocolDashboard,
    icon: (
      <IconLink
        className={cn(styles.dappLinkIcon, styles.dappLinkIconStroke)}
      />
    ),
    link: AUDIUS_PROTOCOL_DASHBOARD_LINK
  },
  {
    text: messages.openAudioFoundation,
    icon: <IconFoundation className={styles.dappLinkIcon} />,
    link: AUDIUS_ORG
  }
]

type NavOverlayProps = {
  isOpen: boolean
  closeNavScreen: () => void
  setRenderPublicSite: (shouldRender: boolean) => void
}

const rootId = 'navOverlay'

const useModalRoot = () => {
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    let el = document.getElementById(rootId)
    if (el) {
      setModalRoot(el)
    } else {
      el = document.createElement('div')
      el.id = rootId
      document.body.appendChild(el)
      setModalRoot(el)
    }
  }, [])

  return modalRoot
}

const NavOverlay = (props: NavOverlayProps) => {
  const modalRoot = useModalRoot()
  const navigate = useNavigate()

  return (
    modalRoot &&
    ReactDOM.createPortal(
      <div
        className={cn(styles.container, {
          [styles.hide]: !props.isOpen
        })}
        aria-hidden={!props.isOpen}
      >
        <div
          className={cn(styles.backgroundContainer)}
          style={{
            backgroundImage: `url(${HeroBackground})`
          }}
        >
          <div className={cn(styles.background)}></div>
        </div>
        <div className={styles.content}>
          <div className={styles.iconContainer}>
            <IconAudiusLogoHorizontalNew
              width={160}
              className={styles.horizontalLogo}
            />
            <IconClose color='staticWhite' onClick={props.closeNavScreen} />
          </div>
          <div className={styles.dappLinksContainer}>
            <div className={styles.dappLinks}>
              {dappLinks.map(({ icon, text, link }, idx) => (
                <a
                  key={idx}
                  onClick={handleClickRoute(
                    link,
                    props.setRenderPublicSite,
                    navigate
                  )}
                  className={styles.dappLink}
                  href={link}
                  target='_blank'
                  rel='noreferrer'
                >
                  {icon}
                  <h4 className={styles.dappLinkText}>{text}</h4>
                </a>
              ))}
            </div>
          </div>
          <div className={styles.iconsContainer}>
            {socialLinks.map(({ Icon, link }, idx) => (
              <a
                key={idx}
                href={link}
                onClick={handleClickRoute(
                  link,
                  props.setRenderPublicSite,
                  navigate
                )}
              >
                <Icon className={styles.icon} />
              </a>
            ))}
          </div>
          <div className={styles.signUpButtonContainer}>
            <Link
              className={styles.signUpButton}
              to={SIGN_UP_PAGE}
              onClick={() => {
                props.setRenderPublicSite(false)
              }}
            >
              {messages.signUp}
            </Link>
          </div>
        </div>
      </div>,
      modalRoot
    )
  )
}

export default NavOverlay
