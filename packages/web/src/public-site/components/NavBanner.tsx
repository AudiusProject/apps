import { useState, useEffect, useCallback, HTMLAttributes } from 'react'

import {
  IconBlog,
  IconCaretDown2,
  IconDownloadQueued,
  IconFoundation,
  IconKebabHorizontal,
  IconMerch,
  IconSupport,
  PopupMenu,
  PopupMenuItem
} from '@audius/stems'
import cn from 'classnames'

import HorizontalLogo from 'assets/img/Horizontal-Logo-Full-Color.png'
import {
  AUDIUS_BLOG_LINK,
  AUDIUS_HELP_LINK,
  AUDIUS_LISTENING_LINK,
  AUDIUS_MERCH_LINK,
  AUDIUS_ORG,
  AUDIUS_SIGN_UP_LINK,
  DOWNLOAD_LINK
} from 'utils/route'
import { useMatchesBreakpoint } from 'utils/useMatchesBreakpoint'
import zIndex from 'utils/zIndex'

import styles from './NavBanner.module.css'
import { handleClickRoute } from './handleClickRoute'

const DESKTOP_NAV_BANNER_MIN_WIDTH = 1170
const MOBILE_WIDTH_MEDIA_QUERY = window.matchMedia(
  `(max-width: ${DESKTOP_NAV_BANNER_MIN_WIDTH}px)`
)
const messages = {
  resources: 'Resources',
  signUp: 'Sign Up',
  help: 'Help & Support',
  helpDescription:
    'Answers and Resources to help you make the most of Audius Music.',
  download: 'Download the App',
  downloadDescription: 'Download the apps for desktop and mobile devices.',
  blog: 'Read the Blog',
  blogDescription: 'Check out the latest updates to the Audius Blog.',
  oaf: 'Open Audio Foundation',
  oafDescription: 'Learn more about the $AUDIO and the Open Audio Foundation.',
  merch: 'Merch Store',
  merchDescription: 'Shop official limited edition merch.'
}

type NavBannerProps = {
  isMobile: boolean
  invertColors?: boolean
  className?: string
  openNavScreen: () => void
  setRenderPublicSite: (shouldRender: boolean) => void
}

/**
 * A button element with no styling, purely for using the correct html role
 */
const UnstyledButton = (props: HTMLAttributes<HTMLButtonElement>) => (
  <button
    css={{ border: 'none', background: 'transparent', padding: 0, margin: 0 }}
    {...props}
  />
)

const NavBanner = (props: NavBannerProps) => {
  const isNarrow = useMatchesBreakpoint({
    mediaQuery: MOBILE_WIDTH_MEDIA_QUERY,
    initialValue: props.isMobile
  })
  const [isScrolling, setIsScrolling] = useState(false)
  const setScrolling = useCallback(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const isScrolling = scrollTop > 20
    setIsScrolling(isScrolling)
  }, [])

  const onClickHome = handleClickRoute(
    AUDIUS_LISTENING_LINK,
    props.setRenderPublicSite
  )
  const onClickSignUp = handleClickRoute(
    AUDIUS_SIGN_UP_LINK,
    props.setRenderPublicSite
  )

  useEffect(() => {
    setScrolling()
    window.addEventListener('scroll', setScrolling)
    return () => window.removeEventListener('scroll', setScrolling)
  }, [setScrolling])

  const menuItems: PopupMenuItem[] = [
    {
      text: messages.help,
      subtext: messages.helpDescription,
      onClick: () =>
        window.open(AUDIUS_HELP_LINK, '_blank', 'noreferrer,noopener'),
      icon: <IconSupport />,
      iconClassName: styles.menuItemIcon
    },
    {
      text: messages.download,
      subtext: messages.downloadDescription,
      onClick: () =>
        window.open(DOWNLOAD_LINK, '_blank', 'noreferrer,noopener'),
      icon: <IconDownloadQueued />,
      iconClassName: styles.menuItemIcon
    },
    {
      text: messages.blog,
      subtext: messages.blogDescription,
      onClick: () =>
        window.open(AUDIUS_BLOG_LINK, '_blank', 'noreferrer,noopener'),
      icon: <IconBlog />,
      iconClassName: styles.menuItemIconStroke
    },
    {
      text: messages.oaf,
      subtext: messages.oafDescription,
      onClick: () => window.open(AUDIUS_ORG, '_blank', 'noreferrer,noopener'),
      icon: <IconFoundation />,
      iconClassName: styles.menuItemIcon
    },
    {
      text: messages.merch,
      subtext: messages.merchDescription,
      onClick: () =>
        window.open(AUDIUS_MERCH_LINK, '_blank', 'noreferrer,noopener'),
      icon: <IconMerch />,
      iconClassName: styles.menuItemIconStroke
    }
  ]

  if (props.isMobile || isNarrow) {
    return (
      <div
        className={cn(styles.mobileContainer, {
          [props.className!]: !!props.className,
          [styles.invertColors]: isScrolling || props.invertColors
        })}
      >
        <div className={styles.leftLogo}>
          <img
            src={HorizontalLogo}
            className={styles.horizontalLogo}
            alt='Audius Logo'
          />
        </div>
        <UnstyledButton
          onClick={props.openNavScreen}
          data-testid='mobileKebabMenuButton'
          aria-label='Open Nav Menu'
        >
          <IconKebabHorizontal className={styles.kebabMenu} />
        </UnstyledButton>
      </div>
    )
  }

  return (
    <div
      className={cn(styles.container, {
        [props.className!]: !!props.className,
        [styles.invertColors]: isScrolling || props.invertColors
      })}
    >
      <div className={styles.contentContainer}>
        <div className={styles.leftLogo}>
          <img
            alt='Audius Logo'
            src={HorizontalLogo}
            className={styles.horizontalLogo}
            onClick={onClickHome}
          />
        </div>
        <div className={styles.linkContainer}>
          <PopupMenu
            renderMenu={(menuItems: PopupMenuItem[]) => {
              return (
                <div className={styles.resourcesMenu}>
                  {menuItems.map((item, i) => (
                    <div
                      key={`resources-menu-item-${i}`}
                      className={styles.menuItemContainer}
                      onClick={item.onClick}
                    >
                      <div className={item.iconClassName}>{item.icon}</div>
                      <div className={styles.menuItemContent}>
                        <p className={styles.menuItemTitle}>{item.text}</p>
                        <p className={styles.menuItemSubtitle}>
                          {item.subtext}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }}
            items={menuItems}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            renderTrigger={(anchorRef, triggerPopup) => {
              return (
                <div
                  className={styles.resources}
                  ref={anchorRef}
                  onClick={() => triggerPopup()}
                  onMouseEnter={() => triggerPopup(true)}
                >
                  {messages.resources}
                  <IconCaretDown2 className={styles.resourcesIcon} />
                </div>
              )
            }}
            zIndex={zIndex.NAV_BANNER_POPUP}
            wrapperClassName={styles.popupWrapper}
            className={styles.popup}
            dismissOnMouseLeave
          />
          <div
            onClick={onClickSignUp}
            className={styles.signUp}
            role='button'
            data-testid='signUpButtonDesktop'
          >
            {messages.signUp}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NavBanner
