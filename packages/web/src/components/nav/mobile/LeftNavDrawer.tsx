import { MouseEvent, ReactNode, useCallback, useContext } from 'react'

import { useCurrentAccountUser, useCurrentUserId } from '@audius/common/api'
import { formatCount, route } from '@audius/common/utils'
import {
  Divider,
  Flex,
  IconAudiusLogoHorizontal,
  IconComponent,
  IconFanClub,
  IconGift,
  IconSettings,
  IconUser,
  IconWallet,
  Text
} from '@audius/harmony'
import cn from 'classnames'
import { useDispatch } from 'react-redux'

import { RouterContext } from 'components/animated-switch/RouterContextProvider'
import { Avatar } from 'components/avatar/Avatar'
import UserBadges from 'components/user-badges/UserBadges'
import { usePortal } from 'hooks/usePortal'
import { push } from 'utils/navigation'

import styles from './LeftNavDrawer.module.css'

const {
  CLUBS_EXPLORE_PAGE,
  FOLLOWERS_USERS_ROUTE,
  FOLLOWING_USERS_ROUTE,
  REWARDS_PAGE,
  SETTINGS_PAGE,
  WALLET_PAGE,
  profilePage
} = route

const messages = {
  profile: 'My Profile',
  audio: '$AUDIO',
  artistCoins: 'Artist Coins',
  rewards: 'Rewards',
  settings: 'Settings',
  followers: 'Followers',
  following: 'Following'
}

type NavItemProps = {
  icon: IconComponent
  label: string
  href: string
  onNavigate: (href: string) => void
  right?: ReactNode
}

const NavItem = ({
  icon: Icon,
  label,
  href,
  onNavigate,
  right
}: NavItemProps) => {
  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault()
      onNavigate(href)
    },
    [href, onNavigate]
  )

  return (
    <a href={href} onClick={handleClick} className={styles.navItem}>
      <Flex alignItems='center' gap='l' flex={1}>
        <Icon size='l' color='default' />
        <Text variant='title' size='l' strength='weak'>
          {label}
        </Text>
      </Flex>
      {right}
    </a>
  )
}

type LeftNavDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

export const LeftNavDrawer = ({ isOpen, onClose }: LeftNavDrawerProps) => {
  const Portal = usePortal({})
  const dispatch = useDispatch()
  const { setStackReset } = useContext(RouterContext)

  const { data: currentUserId } = useCurrentUserId()
  const { data: accountUser } = useCurrentAccountUser({
    select: (user) => ({
      handle: user?.handle,
      name: user?.name,
      followerCount: user?.follower_count ?? 0,
      followeeCount: user?.followee_count ?? 0
    })
  })

  const {
    handle,
    name,
    followerCount = 0,
    followeeCount = 0
  } = accountUser ?? {}

  const handleNavigate = useCallback(
    (href: string) => {
      setStackReset(true)
      setImmediate(() => dispatch(push(href)))
      onClose()
    },
    [dispatch, setStackReset, onClose]
  )

  const goToProfile = useCallback(() => {
    if (!handle) return
    handleNavigate(profilePage(handle))
  }, [handle, handleNavigate])

  const goToFollowers = useCallback(
    () => handleNavigate(FOLLOWERS_USERS_ROUTE),
    [handleNavigate]
  )

  const goToFollowing = useCallback(
    () => handleNavigate(FOLLOWING_USERS_ROUTE),
    [handleNavigate]
  )

  return (
    <Portal>
      <div
        className={cn(styles.background, { [styles.backgroundOpen]: isOpen })}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <div
        role='dialog'
        aria-label='Main menu'
        aria-hidden={!isOpen}
        className={cn(styles.drawer, { [styles.drawerOpen]: isOpen })}
      >
        <div className={styles.content}>
          {currentUserId ? (
            <Flex
              direction='column'
              gap='m'
              ph='xl'
              pt='xl'
              pb='l'
              alignItems='flex-start'
            >
              <Flex
                direction='column'
                gap='s'
                alignItems='flex-start'
                onClick={goToProfile}
                css={{ cursor: 'pointer' }}
              >
                <Avatar userId={currentUserId} h={96} w={96} disableLink />
                <Flex direction='column' gap='2xs' alignItems='flex-start'>
                  <Flex alignItems='center' gap='xs'>
                    {name ? (
                      <Text variant='title' size='l' strength='strong' ellipses>
                        {name}
                      </Text>
                    ) : null}
                    <UserBadges userId={currentUserId} size='s' inline />
                  </Flex>
                  {handle ? (
                    <Text variant='body' size='l' color='default' ellipses>
                      @{handle}
                    </Text>
                  ) : null}
                </Flex>
              </Flex>
              <Flex alignItems='center' gap='l'>
                <Flex
                  alignItems='center'
                  gap='xs'
                  onClick={goToFollowers}
                  css={{ cursor: 'pointer' }}
                >
                  <Text variant='label' size='l' color='default'>
                    {formatCount(followerCount)}
                  </Text>
                  <Text variant='body' size='m' color='subdued'>
                    {messages.followers}
                  </Text>
                </Flex>
                <Flex
                  alignItems='center'
                  gap='xs'
                  onClick={goToFollowing}
                  css={{ cursor: 'pointer' }}
                >
                  <Text variant='label' size='l' color='default'>
                    {formatCount(followeeCount)}
                  </Text>
                  <Text variant='body' size='m' color='subdued'>
                    {messages.following}
                  </Text>
                </Flex>
              </Flex>
            </Flex>
          ) : null}
          <Divider />
          <Flex direction='column' pv='s'>
            {currentUserId && handle ? (
              <NavItem
                icon={IconUser}
                label={messages.profile}
                href={profilePage(handle)}
                onNavigate={handleNavigate}
              />
            ) : null}
            <NavItem
              icon={IconWallet}
              label={messages.audio}
              href={WALLET_PAGE}
              onNavigate={handleNavigate}
            />
            <NavItem
              icon={IconFanClub}
              label={messages.artistCoins}
              href={CLUBS_EXPLORE_PAGE}
              onNavigate={handleNavigate}
            />
            <NavItem
              icon={IconGift}
              label={messages.rewards}
              href={REWARDS_PAGE}
              onNavigate={handleNavigate}
            />
            <NavItem
              icon={IconSettings}
              label={messages.settings}
              href={SETTINGS_PAGE}
              onNavigate={handleNavigate}
            />
          </Flex>
        </div>
        <Flex
          direction='column'
          alignItems='flex-start'
          justifyContent='center'
          ph='xl'
          pv='xl'
        >
          <IconAudiusLogoHorizontal color='subdued' sizeH='l' width='auto' />
        </Flex>
      </div>
    </Portal>
  )
}
