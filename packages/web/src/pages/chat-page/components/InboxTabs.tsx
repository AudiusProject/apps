import { ChangeEvent, useCallback } from 'react'

import { chatSelectors, InboxTab } from '@audius/common/store'
import { Flex, SelectablePill } from '@audius/harmony'
import { useSelector } from 'react-redux'

import { NotificationDot } from 'components/notification-dot/NotificationDot'

const { getHasUnreadPriorityMessages, getHasUnreadGeneralMessages } =
  chatSelectors

const messages = {
  inbox: 'Inbox',
  priority: 'Priority',
  general: 'General',
  unread: 'Unread messages'
}

export const inboxTabLabels: Record<InboxTab, string> = {
  [InboxTab.PRIORITY]: messages.priority,
  [InboxTab.GENERAL]: messages.general
}

const tabs: InboxTab[] = [InboxTab.PRIORITY, InboxTab.GENERAL]

type InboxTabsProps = {
  currentTab: InboxTab
  onSelectTab: (tab: InboxTab) => void
}

/**
 * Priority / General inbox switcher. Each tab shows its own purple dot when
 * that tab has unread messages; uncategorized chats count towards Priority
 * since that is where they are displayed.
 */
export const InboxTabs = ({ currentTab, onSelectTab }: InboxTabsProps) => {
  const hasUnreadPriority = useSelector(getHasUnreadPriorityMessages)
  const hasUnreadGeneral = useSelector(getHasUnreadGeneralMessages)
  const hasUnread: Record<InboxTab, boolean> = {
    [InboxTab.PRIORITY]: hasUnreadPriority,
    [InboxTab.GENERAL]: hasUnreadGeneral
  }

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onSelectTab(e.target.value as InboxTab)
    },
    [onSelectTab]
  )

  return (
    <Flex
      gap='s'
      role='radiogroup'
      aria-label={messages.inbox}
      onChange={handleChange}
    >
      {tabs.map((tab) => (
        <Flex key={tab} css={{ position: 'relative' }}>
          <SelectablePill
            name='inbox-tab'
            type='radio'
            value={tab}
            label={inboxTabLabels[tab]}
            isSelected={currentTab === tab}
            size='large'
          />
          {hasUnread[tab] ? (
            <NotificationDot
              variant='small'
              role='img'
              aria-label={`${inboxTabLabels[tab]}: ${messages.unread}`}
              data-testid={`inbox-tab-dot-${tab}`}
              css={{ position: 'absolute', top: -2, right: -2 }}
            />
          ) : null}
        </Flex>
      ))}
    </Flex>
  )
}
