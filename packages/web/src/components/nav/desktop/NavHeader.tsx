import { MouseEvent, ReactNode } from 'react'

import {
  selectIsAccountComplete,
  useCurrentAccountUser,
  useHasAccount
} from '@audius/common/api'
import { route } from '@audius/common/utils'
import {
  Flex,
  IconAudiusLogo,
  IconAudiusLogoHorizontalNew,
  IconSettings
} from '@audius/harmony'
import { Link } from 'react-router'

import { RestrictionType, useRequiresAccountFn } from 'hooks/useRequiresAccount'

import { NavHeaderButton } from './NavHeaderButton'
import { NotificationsButton } from './NotificationsButton'
import { useNavSidebar } from './NavSidebarContext'

const { HOME_PAGE, SETTINGS_PAGE } = route

const messages = {
  homeLink: 'Go to Home',
  settingsLabel: 'Go to Settings'
}

type RestrictedLinkProps = {
  to: string
  restriction?: RestrictionType
  children: ReactNode
}

export const canAccess = (
  restriction: RestrictionType,
  hasAccount: boolean,
  isAccountComplete: boolean
): boolean => {
  if (restriction === 'none') return true
  if (restriction === 'guest') return hasAccount
  return isAccountComplete
}

const RestrictedLink = ({
  to,
  restriction = 'none',
  children
}: RestrictedLinkProps) => {
  const { requiresAccount } = useRequiresAccountFn(undefined, restriction)
  const hasAccount = useHasAccount()
  const { data: isAccountComplete = false } = useCurrentAccountUser({
    select: selectIsAccountComplete
  })

  const handleClick = (e: MouseEvent) => {
    if (restriction === 'none') return

    const canAccessRoute = canAccess(restriction, hasAccount, isAccountComplete)
    if (!canAccessRoute) {
      e.preventDefault()
      requiresAccount()
    }
  }

  return (
    <Link to={to} onClick={handleClick}>
      {children}
    </Link>
  )
}

export const NavHeader = () => {
  const { isCollapsed } = useNavSidebar()

  if (isCollapsed) {
    return (
      <Flex
        direction='column'
        backgroundColor='surface1'
        flex={0}
        css={{ minHeight: 58 }}
      >
        {/* Row 1: actions (settings + bell) */}
        <Flex
          alignItems='center'
          justifyContent='space-around'
          ph='xs'
          css={{ height: 26, paddingTop: 4 }}
        >
          <RestrictedLink to={SETTINGS_PAGE} restriction='account'>
            <NavHeaderButton
              icon={IconSettings}
              aria-label={messages.settingsLabel}
              isActive={location.pathname === SETTINGS_PAGE}
              size='m'
            />
          </RestrictedLink>
          <NotificationsButton size='m' />
        </Flex>
        {/* Row 2: Audius triangle logo */}
        <Flex
          alignItems='center'
          justifyContent='center'
          css={{ height: 32 }}
        >
          <Link to={HOME_PAGE} aria-label={messages.homeLink}>
            <IconAudiusLogo color='subdued' size='m' />
          </Link>
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex
      alignItems='center'
      backgroundColor='surface1'
      justifyContent='space-between'
      pv='l'
      ph='m'
      flex={0}
      css={{ minHeight: 58 }}
    >
      <Link to={HOME_PAGE} aria-label={messages.homeLink}>
        <IconAudiusLogoHorizontalNew color='subdued' size='m' width='auto' />
      </Link>
      <Flex justifyContent='center' alignItems='center'>
        <RestrictedLink to={SETTINGS_PAGE} restriction='account'>
          <NavHeaderButton
            icon={IconSettings}
            aria-label={messages.settingsLabel}
            isActive={location.pathname === SETTINGS_PAGE}
          />
        </RestrictedLink>
        <NotificationsButton />
      </Flex>
    </Flex>
  )
}
