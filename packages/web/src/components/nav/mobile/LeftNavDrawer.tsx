import { MouseEvent, ReactNode, useCallback, useContext } from 'react'

import {
  useCurrentAccountUser,
  useCurrentUserId,
  useNotificationUnreadCount
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { chatSelectors } from '@audius/common/store'
import { formatCount, route } from '@audius/common/utils'
import {
  Divider,
  Flex,
  IconAudiusLogoHorizontal,
  IconCloudUpload,
  IconComponent,
  IconFanClub,
  IconGift,
  IconMessages,
  IconNotificationOn,
  IconRemix,
  IconSettings,
  IconUser,
  IconWallet,
  Text
} from '@audius/harmony'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'

import { Avatar } from 'components/avatar/Avatar'
import { RouterContext } from 'components/animated-switch/RouterContextProvider'
import { usePortal } from 'hooks/usePortal'
import { push } from 'utils/navigation'

import styles from './LeftNavDrawer.module.css'

const {
  CHATS_PAGE,
  CLUBS_EXPLORE_PAGE,
  CONTESTS_PAGE,
  NOTIFICATION_PAGE,
  REWARDS_PAGE,
  SETTINGS_PAGE,
  UPLOAD_PAGE,
  WALLET_PAGE,
  profilePage
} = route

const { getHasUnreadMessages } = chatSelectors

const messages = {
  profile: 'My Profile',
  notifications: 'Notifications',
  messages: 'Messages',
  wallet: 'Wallet',
  fanClubs: 'Fan Clubs',
  rewards: 'Rewards',
  upload: 'Upload',
  settings: 'Settings',
  contests: 'Contests'
}

type NavItemProps = {
  icon: IconComponent
  label: string
  href: string
  onNavigate: (href: string) => void
  hasNotification?: boolean
  right?: ReactNode
}

const NavItem = ({
  icon: Icon,
  label,
  href,
  onNavigate,
  hasNotification,
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
      <Flex alignItems='center' gap='m' flex={1}>
        <Flex css={{ position: 'relative' }}>
          <Icon size='l' color='default' />
          {hasNotification ? (
            <Flex
              css={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'var(--harmony-red)'
              }}
            />
          ) : null}
        </Flex>
        <Text variant='title' size='m' strength='weak'>
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
      name: user?.name
    })
  })
  const { data: notificationCount = 0 } = useNotificationUnreadCount()
  const hasUnreadMessages = useSelector(getHasUnreadMessages)

  const { isEnabled: isContestsPageEnabled } = useFeatureFlag(
    FeatureFlags.CONTESTS
  )

  const { handle, name } = accountUser ?? {}

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
        <Flex direction='column' gap='l' p='l'>
          {currentUserId ? (
            <Flex
              alignItems='center'
              gap='m'
              onClick={goToProfile}
              css={{ cursor: 'pointer' }}
            >
              <Avatar userId={currentUserId} size='medium' disableLink />
              <Flex direction='column' gap='xs' css={{ minWidth: 0 }}>
                {name ? (
                  <Text variant='title' size='l' strength='strong' ellipses>
                    {name}
                  </Text>
                ) : null}
                {handle ? (
                  <Text variant='body' size='s' color='subdued' ellipses>
                    @{handle}
                  </Text>
                ) : null}
              </Flex>
            </Flex>
          ) : null}
        </Flex>
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
          {currentUserId ? (
            <NavItem
              icon={IconNotificationOn}
              label={messages.notifications}
              href={NOTIFICATION_PAGE}
              onNavigate={handleNavigate}
              hasNotification={notificationCount > 0}
              right={
                notificationCount > 0 ? (
                  <Text variant='label' size='s' color='subdued'>
                    {formatCount(notificationCount)}
                  </Text>
                ) : undefined
              }
            />
          ) : null}
          {currentUserId ? (
            <NavItem
              icon={IconMessages}
              label={messages.messages}
              href={CHATS_PAGE}
              onNavigate={handleNavigate}
              hasNotification={hasUnreadMessages}
            />
          ) : null}
          <NavItem
            icon={IconWallet}
            label={messages.wallet}
            href={WALLET_PAGE}
            onNavigate={handleNavigate}
          />
          <NavItem
            icon={IconFanClub}
            label={messages.fanClubs}
            href={CLUBS_EXPLORE_PAGE}
            onNavigate={handleNavigate}
          />
          <NavItem
            icon={IconGift}
            label={messages.rewards}
            href={REWARDS_PAGE}
            onNavigate={handleNavigate}
          />
          {isContestsPageEnabled ? (
            <NavItem
              icon={IconRemix}
              label={messages.contests}
              href={CONTESTS_PAGE}
              onNavigate={handleNavigate}
            />
          ) : null}
          <NavItem
            icon={IconCloudUpload}
            label={messages.upload}
            href={UPLOAD_PAGE}
            onNavigate={handleNavigate}
          />
          <NavItem
            icon={IconSettings}
            label={messages.settings}
            href={SETTINGS_PAGE}
            onNavigate={handleNavigate}
          />
        </Flex>
        <Flex
          direction='column'
          alignItems='center'
          justifyContent='center'
          pv='xl'
          mt='auto'
        >
          <IconAudiusLogoHorizontal color='subdued' sizeH='l' width='auto' />
        </Flex>
      </div>
    </Portal>
  )
}
