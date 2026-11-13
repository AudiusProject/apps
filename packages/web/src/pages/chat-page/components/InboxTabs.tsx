import { ChangeEvent, useCallback } from 'react'

import { chatSelectors, InboxTab } from '@audius/common/store'
import { Flex, SelectablePill, useTheme } from '@audius/harmony'
import { useSelector } from 'react-redux'

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

const DOT_SIZE = 8

type InboxTabsProps = {
  currentTab: InboxTab
  onSelectTab: (tab: InboxTab) => void
}

/**
 * Priority / General inbox switcher. Each tab shows its own dot, inside the
 * pill after the label, when that tab has unread messages.
 */
export const InboxTabs = ({ currentTab, onSelectTab }: InboxTabsProps) => {
  const { color } = useTheme()
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
        <SelectablePill
          key={tab}
          name='inbox-tab'
          type='radio'
          value={tab}
          label={inboxTabLabels[tab]}
          isSelected={currentTab === tab}
          size='large'
          endAdornment={
            hasUnread[tab] ? (
              <span
                role='img'
                aria-label={messages.unread}
                data-testid={`inbox-tab-dot-${tab}`}
                css={{
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  flexShrink: 0,
                  borderRadius: '50%',
                  // Selected pills are purple, so the dot flips to white
                  backgroundColor:
                    currentTab === tab
                      ? color.static.white
                      : color.secondary.secondary,
                  'label:hover &': { backgroundColor: color.static.white }
                }}
              />
            ) : null
          }
        />
      ))}
    </Flex>
  )
}
