import type { ReactNode } from 'react'

import { FeedTab } from '@audius/common/models'

import { Flex, SelectablePill } from '@audius/harmony-native'

const tabLabels: Record<FeedTab, string> = {
  [FeedTab.FOR_YOU]: 'For You',
  [FeedTab.LATEST]: 'Latest'
}

const tabs: FeedTab[] = [FeedTab.FOR_YOU, FeedTab.LATEST]

type FeedTabsProps = {
  currentTab: FeedTab
  onSelectTab: (tab: FeedTab) => void
  /** `small` for the compact copy under the collapsed header pill. */
  size?: 'small' | 'large'
  children?: ReactNode
}

export const FeedTabs = ({
  currentTab,
  onSelectTab,
  size = 'large',
  children
}: FeedTabsProps) => {
  return (
    <Flex direction='row' alignItems='center' gap='s'>
      {tabs.map((tab) => (
        <SelectablePill
          key={tab}
          type='radio'
          size={size}
          value={tab}
          label={tabLabels[tab]}
          isSelected={currentTab === tab}
          onChange={(value, isSelected) => {
            if (!isSelected) return
            onSelectTab(value as FeedTab)
          }}
          disableUnselectAnimation
        />
      ))}
      {children}
    </Flex>
  )
}
