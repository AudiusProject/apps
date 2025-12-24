import React from 'react'

import { useHasAccount } from '@audius/common/api'
import { chatSelectors } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { IconMessages, NotificationCount } from '@audius/harmony'
import { useSelector } from 'react-redux'
import { useLocation } from 'react-router'

import { matchesRoute } from 'utils/route'

import { LeftNavLink } from '../LeftNavLink'

const { CHATS_PAGE } = route
const { getUnreadMessagesCount } = chatSelectors

export const MessagesNavItem = () => {
  const hasAccount = useHasAccount()
  const unreadMessagesCount = useSelector(getUnreadMessagesCount)
  const location = useLocation()

  return (
    <LeftNavLink
      leftIcon={IconMessages}
      to={CHATS_PAGE}
      disabled={!hasAccount}
      restriction='account'
      hasNotification={unreadMessagesCount > 0}
      rightIcon={
        unreadMessagesCount > 0 ? (
          <NotificationCount
            count={unreadMessagesCount}
            isSelected={matchesRoute({
              current: location.pathname,
              target: CHATS_PAGE
            })}
          />
        ) : undefined
      }
    >
      Messages
    </LeftNavLink>
  )
}
