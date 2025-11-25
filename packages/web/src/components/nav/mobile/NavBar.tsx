import { useState, useContext, useCallback } from 'react'

import { useNotificationUnreadCount } from '@audius/common/api'
import { formatCount, route } from '@audius/common/utils'
import {
  IconAudiusLogoHorizontal,
  IconCaretLeft,
  IconClose,
  IconNotificationOn,
  IconButton,
  Flex,
  IconKebabHorizontal
} from '@audius/harmony'
import cn from 'classnames'
import { Link } from 'react-router-dom'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web

import {
  RouterContext,
  SlideDirection
} from 'components/animated-switch/RouterContextProvider'
import NavContext, {
  LeftPreset,
  CenterPreset,
  RightPreset
} from 'components/nav/mobile/NavContext'
import { getIsIOS } from 'utils/browser'

import styles from './NavBar.module.css'
import { NavBarActionDrawer } from './NavBarActionDrawer'

const { SIGN_UP_PAGE, TRENDING_PAGE } = route

interface NavBarProps {
  isLoading: boolean
  isSignedIn: boolean
  rewardsCount: number
  signUp: () => void
  goToNotificationPage: () => void
  search: (term: string) => void
  goBack: () => void
}

const messages = {
  signUp: 'Sign Up',
  searchPlaceholderV2: 'What do you want to listen to?'
}

const NavBar = ({
  isLoading,
  isSignedIn,
  rewardsCount,
  search,
  signUp,
  goToNotificationPage,
  goBack
}: NavBarProps) => {
  const { leftElement, centerElement, rightElement } = useContext(NavContext)!
  const { data: notificationCount = 0 } = useNotificationUnreadCount()

  const { setStackReset } = useContext(RouterContext)

  const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false)

  const { setSlideDirection } = useContext(RouterContext)

  const goBackAndResetSlide = useCallback(() => {
    goBack()
    setSlideDirection(SlideDirection.FROM_LEFT)
  }, [goBack, setSlideDirection])

  const goBackAndDoNotAnimate = useCallback(() => {
    setStackReset(true)
    setImmediate(goBack)
  }, [setStackReset, goBack])

  let left = null
  if (leftElement === LeftPreset.BACK) {
    left = (
      <IconButton
        aria-label='go back'
        icon={IconCaretLeft}
        color='subdued'
        onClick={goBack}
      />
    )
  } else if (leftElement === LeftPreset.CLOSE) {
    left = (
      <IconButton
        aria-label='close'
        color='subdued'
        icon={IconClose}
        size='m'
        onClick={getIsIOS() ? goBackAndResetSlide : goBackAndDoNotAnimate}
      />
    )
  } else if (leftElement === LeftPreset.CLOSE_NO_ANIMATION) {
    left = (
      <IconButton
        aria-label='close'
        color='subdued'
        icon={IconClose}
        size='m'
        onClick={goBackAndDoNotAnimate}
      />
    )
  } else if (leftElement === LeftPreset.NOTIFICATION && !isSignedIn) {
    left = (
      <Link className={styles.signUpButton} onClick={signUp} to={SIGN_UP_PAGE}>
        {messages.signUp}
      </Link>
    )
  } else if (leftElement === LeftPreset.NOTIFICATION && isSignedIn) {
    left = (
      <Flex gap='s'>
        <Flex>
          <IconButton
            aria-label='notifications'
            color={notificationCount > 0 ? 'warning' : 'subdued'}
            icon={IconNotificationOn}
            onClick={goToNotificationPage}
          />
          {notificationCount > 0 && (
            <Flex
              css={{
                position: 'absolute',
                top: 0,
                right: 6,
                backgroundColor: 'var(--harmony-red)',
                color: 'var(--harmony-white)',
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '0.07px',
                lineHeight: '14px',
                textTransform: 'uppercase',
                padding: '0px 6px',
                transform: 'translateX(50%)',
                borderRadius: '8px'
              }}
            >
              {formatCount(notificationCount)}
            </Flex>
          )}
        </Flex>
      </Flex>
    )
  } else {
    left = leftElement
  }

  return (
    <Flex className={cn(styles.container)}>
      <Flex
        className={cn(styles.leftElement, {
          [styles.isLoading]: isLoading
        })}
      >
        {left}
      </Flex>
      {centerElement === CenterPreset.LOGO ? (
        <Link to={TRENDING_PAGE} className={styles.logo}>
          <IconAudiusLogoHorizontal sizeH='l' color='subdued' width='auto' />
        </Link>
      ) : null}
      {typeof centerElement === 'string' &&
        !Object.values(CenterPreset).includes(centerElement as any) && (
          <Flex className={styles.centerText}> {centerElement} </Flex>
        )}
      <Flex
        className={cn(styles.rightElement, {
          [styles.isLoading]: isLoading
        })}
      >
        {rightElement === RightPreset.KEBAB ? (
          <Flex mr='s'>
            <IconButton
              aria-label='menu'
              icon={IconKebabHorizontal}
              color-='subdued'
              onClick={() => setIsActionDrawerOpen(true)}
            />
          </Flex>
        ) : (
          rightElement
        )}
      </Flex>
      <NavBarActionDrawer
        isOpen={isActionDrawerOpen}
        onClose={() => setIsActionDrawerOpen(false)}
      />
    </Flex>
  )
}

export default NavBar
