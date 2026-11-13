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
        <SelectablePill
          key={tab}
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
          endAdornment={
            hasUnread[tab] ? (
              <Box
                testID={`inbox-tab-dot-${tab}`}
                accessibilityLabel='unread messages'
                style={{
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  borderRadius: DOT_SIZE / 2,
                  // Selected pills are purple, so the dot flips to white
                  backgroundColor:
                    currentTab === tab
                      ? color.static.white
                      : color.secondary.secondary
                }}
              />
            ) : null
          }
        />
      ))}
    </Flex>
  )
}
