import { MouseEvent, useState, useRef, useEffect } from 'react'

import {
  IconAudiusLogoHorizontal,
  IconBlog,
  IconCaretDown,
  IconClose,
  IconCloudDownload,
  IconDiscord,
  IconHeadphones,
  IconInstagram,
  IconKebabHorizontal,
  IconTikTok,
  IconX
} from '@audius/harmony'
import { route } from '@audius/common/utils'
import { useNavigate } from 'react-router'

import { handleClickRoute } from 'public-site/components/handleClickRoute'

import styles from './Nav2026.module.css'

const { SIGN_UP_PAGE, DOWNLOAD_LINK } = route

const messages = {
  signUp: 'Sign Up',
  resources: 'Resources'
}

const MENU_ITEMS = [
  {
    title: 'Download App',
    description:
      'Download the apps for desktop and mobile devices.',
    href: DOWNLOAD_LINK,
    Icon: IconCloudDownload
  },
  {
    title: 'Help & Support',
    description:
      'Answers and Resources to help you make the most of Audius Music.',
    href: 'https://help.audius.co/',
    Icon: IconHeadphones
  },
  {
    title: 'Blog',
    description: 'Check out the latest updates to the Audius Blog.',
    href: 'https://blog.audius.co/',
    Icon: IconBlog
  }
]

const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com/audiusmusic', Icon: IconInstagram },
  { label: 'Discord', href: 'https://discord.com/invite/audius', Icon: IconDiscord },
  { label: 'TikTok', href: 'https://tiktok.com/@audius', Icon: IconTikTok },
  { label: 'X (Twitter)', href: 'https://twitter.com/audiusproject', Icon: IconX }
]

type Nav2026Props = {
  isMobile: boolean
  openNavScreen: () => void
  setRenderPublicSite: (shouldRender: boolean) => void
}

export const Nav2026 = (props: Nav2026Props) => {
  const { isMobile, setRenderPublicSite } = props
  const navigate = useNavigate()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileOverlayOpen, setIsMobileOverlayOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isMobileOverlayOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileOverlayOpen])

  const onSignUp = (e: MouseEvent) => {
    setIsMobileOverlayOpen(false)
    handleClickRoute(SIGN_UP_PAGE, setRenderPublicSite, navigate)(e)
  }

  const onLogoClick = (e: MouseEvent) => {
    e.preventDefault()
    setIsMobileOverlayOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.inner}>
          <a href='/' onClick={onLogoClick} aria-label='Audius home' className={styles.logoLink}>
            <IconAudiusLogoHorizontal
              height={32}
              width='auto'
              color='default'
              className={styles.logo}
            />
          </a>
          <div className={styles.right}>
            {isMobile ? (
              <button
                type='button'
                className={styles.mobileMenuButton}
                onClick={() => setIsMobileOverlayOpen(true)}
                aria-label='Open menu'
              >
                <IconKebabHorizontal
                  size='m'
                  color='default'
                  className={styles.kebabIcon}
                />
              </button>
            ) : (
              <>
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                  <button
                    type='button'
                    className={styles.resourcesButton}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    aria-expanded={isDropdownOpen}
                    aria-haspopup='true'
                    aria-label='Resources menu'
                  >
                    {messages.resources}
                    <IconCaretDown
                      size='s'
                      color='default'
                      className={`${styles.chevronIcon} ${isDropdownOpen ? styles.chevronIconOpen : ''}`}
                    />
                  </button>
                  {isDropdownOpen ? (
                    <ResourcesDropdown
                      setRenderPublicSite={setRenderPublicSite}
                      navigate={navigate}
                      onClose={() => setIsDropdownOpen(false)}
                    />
                  ) : null}
                </div>
                <button
                  type='button'
                  className={styles.ctaButton}
                  onClick={onSignUp}
                >
                  <span className={styles.ctaLabel}>{messages.signUp}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
      {isMobileOverlayOpen ? (
        <MobileNavOverlay
          onClose={() => setIsMobileOverlayOpen(false)}
          onSignUp={onSignUp}
          onLogoClick={onLogoClick}
        />
      ) : null}
    </>
  )
}

function MobileNavOverlay({
  onClose,
  onSignUp,
  onLogoClick
}: {
  onClose: () => void
  onSignUp: (e: MouseEvent) => void
  onLogoClick: (e: MouseEvent) => void
}) {
  const handleItemClick = (href: string) => () => {
    onClose()
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.overlayNav}>
        <a href='/' onClick={onLogoClick} aria-label='Audius home' className={styles.logoLink}>
          <IconAudiusLogoHorizontal
            height={32}
            width='auto'
            color='default'
            className={styles.logo}
          />
        </a>
        <button
          type='button'
          className={styles.mobileMenuButton}
          onClick={onClose}
          aria-label='Close menu'
        >
          <IconClose size='m' color='default' className={styles.closeIcon} />
        </button>
      </div>
      <div className={styles.overlayBody}>
        <div className={styles.overlayLinks}>
          {MENU_ITEMS.map((item) => {
            const Icon = item.Icon
            return (
              <button
                key={item.title}
                type='button'
                className={styles.overlayMenuItem}
                onClick={handleItemClick(item.href)}
              >
                <span className={styles.overlayMenuIcon}>
                  <Icon size='s' color='default' />
                </span>
                <span className={styles.overlayMenuTitle}>{item.title}</span>
              </button>
            )
          })}
        </div>
        <div className={styles.overlayBottom}>
          <div className={styles.overlaySocials}>
            {SOCIAL_LINKS.map((social) => {
              const Icon = social.Icon
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target='_blank'
                  rel='noopener noreferrer'
                  className={styles.overlaySocialLink}
                  aria-label={social.label}
                >
                  <Icon size='m' color='default' />
                </a>
              )
            })}
          </div>
          <button
            type='button'
            className={styles.overlayCtaButton}
            onClick={onSignUp}
          >
            <span className={styles.ctaLabel}>{messages.signUp}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function ResourcesDropdown({
  setRenderPublicSite,
  navigate,
  onClose
}: {
  setRenderPublicSite: (v: boolean) => void
  navigate: ReturnType<typeof useNavigate>
  onClose: () => void
}) {
  const handleItemClick = (href: string) => (e: MouseEvent) => {
    onClose()
    if (href.startsWith('http')) {
      e?.preventDefault()
      window.open(href, '_blank', 'noopener,noreferrer')
    } else {
      handleClickRoute(href, setRenderPublicSite, navigate)(e)
    }
  }

  return (
    <div className={styles.dropdown} role='menu'>
      {RESOURCES_ITEMS.map((item) => {
        const Icon = item.Icon
        return (
          <button
            key={item.title}
            type='button'
            className={styles.dropdownItem}
            onClick={handleItemClick(item.href)}
            role='menuitem'
          >
            <span className={styles.dropdownItemIcon} aria-hidden>
              <Icon size='s' color='default' />
            </span>
            <div className={styles.dropdownItemContent}>
              <p className={styles.dropdownItemTitle}>{item.title}</p>
              <p className={styles.dropdownItemDescription}>
                {item.description}
              </p>
            </div>
          </button>
        )
      })}
      <hr className={styles.dropdownDivider} />
      <div className={styles.dropdownSocials}>
        {SOCIAL_LINKS.map((social) => {
          const Icon = social.Icon
          return (
            <a
              key={social.label}
              href={social.href}
              target='_blank'
              rel='noopener noreferrer'
              className={styles.dropdownSocialLink}
              aria-label={social.label}
            >
              <span className={styles.dropdownSocialIcon}>
                <Icon size='s' color='default' />
              </span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
