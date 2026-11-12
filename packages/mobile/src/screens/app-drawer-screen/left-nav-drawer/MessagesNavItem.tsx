import React from 'react'

import { useIsManagedAccount } from '@audius/common/hooks'
import { chatSelectors } from '@audius/common/store'
import { useSelector } from 'react-redux'

import { IconMessages, NotificationCount } from '@audius/harmony-native'

import { LeftNavLink } from './LeftNavLink'

const { getHasUnreadMessages, getUnreadMessagesCount } = chatSelectors

export const MessagesNavItem = () => {
  const hasUnreadMessages = useSelector(getHasUnreadMessages)
  const unreadMessagesCount = useSelector(getUnreadMessagesCount)
  const isManagedAccount = useIsManagedAccount()

  // DMs aren't available while managing another account
  if (isManagedAccount) return null

  return (
    <LeftNavLink
      icon={IconMessages}
      label='Messages'
      to='ChatList'
      showNotificationBubble={hasUnreadMessages}
    >
      {unreadMessagesCount > 0 ? (
        <NotificationCount count={unreadMessagesCount} />
      ) : undefined}
    </LeftNavLink>
  )
}
