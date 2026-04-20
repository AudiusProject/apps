import { useState, useContext, useCallback } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { route } from '@audius/common/utils'
import {
  IconAudiusLogoHorizontal,
  IconCaretLeft,
  IconClose,
  IconButton,
  Flex,
  IconKebabHorizontal
} from '@audius/harmony'
import cn from 'classnames'
import { Link } from 'react-router'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web

import {
  RouterContext,
  SlideDirection
} from 'components/animated-switch/RouterContextProvider'
import { Avatar } from 'components/avatar/Avatar'
import NavContext, {
  LeftPreset,
  CenterPreset,
  RightPreset
} from 'components/nav/mobile/NavContext'
import { getIsIOS } from 'utils/browser'

import { LeftNavDrawer } from './LeftNavDrawer'
import styles from './NavBar.module.css'

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
  const { data: currentUserId } = useCurrentUserId()

  const { setStackReset } = useContext(RouterContext)

  const [isLeftNavOpen, setIsLeftNavOpen] = useState(false)

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
    left = currentUserId ? (
      <Avatar
        userId={currentUserId}
        onClick={() => setIsLeftNavOpen(true)}
        size='small'
        disableLink
        aria-label='menu'
      />
    ) : (
      <IconButton
        aria-label='menu'
        icon={IconKebabHorizontal}
        color='subdued'
        onClick={() => setIsLeftNavOpen(true)}
      />
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
        {rightElement === RightPreset.KEBAB ? null : rightElement}
      </Flex>
      <LeftNavDrawer
        isOpen={isLeftNavOpen}
        onClose={() => setIsLeftNavOpen(false)}
      />
    </Flex>
  )
}

export default NavBar
