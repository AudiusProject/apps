import { chatSelectors, InboxTab } from '@audius/common/store'
import { useSelector } from 'react-redux'

import { Box, Flex, SelectablePill, useTheme } from '@audius/harmony-native'

const { getHasUnreadPriorityMessages, getHasUnreadGeneralMessages } =
  chatSelectors

const messages = {
  priority: 'Priority',
  general: 'General'
}

export const inboxTabLabels: Record<InboxTab, string> = {
  [InboxTab.PRIORITY]: messages.priority,
  [InboxTab.GENERAL]: messages.general
}

const tabs: InboxTab[] = [InboxTab.PRIORITY, InboxTab.GENERAL]

const DOT_SIZE = 10

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
  const { color } = useTheme()
  const hasUnreadPriority = useSelector(getHasUnreadPriorityMessages)
  const hasUnreadGeneral = useSelector(getHasUnreadGeneralMessages)
  const hasUnread: Record<InboxTab, boolean> = {
    [InboxTab.PRIORITY]: hasUnreadPriority,
    [InboxTab.GENERAL]: hasUnreadGeneral
  }

  return (
    <Flex
      direction='row'
      alignItems='center'
      gap='s'
      ph='l'
      pv='s'
      backgroundColor='white'
      borderBottom='default'
      accessibilityRole='tablist'
    >
      {tabs.map((tab) => (
        <Box key={tab} style={{ position: 'relative' }}>
          <SelectablePill
            type='radio'
            size='large'
            value={tab}
            label={inboxTabLabels[tab]}
            isSelected={currentTab === tab}
            onChange={(value, isSelected) => {
              if (!isSelected) return
              onSelectTab(value as InboxTab)
            }}
            disableUnselectAnimation
          />
          {hasUnread[tab] ? (
            <Box
              testID={`inbox-tab-dot-${tab}`}
              accessibilityLabel={`${inboxTabLabels[tab]}: unread messages`}
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: DOT_SIZE / 2,
                backgroundColor: color.secondary.s300,
                borderWidth: 1.5,
                borderColor: color.background.white
              }}
            />
          ) : null}
        </Box>
      ))}
    </Flex>
  )
}
