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
}

/** Rendered inside `FloatingSubHeader`'s glass pill bar, which owns the fill. */
export const FeedTabs = ({ currentTab, onSelectTab }: FeedTabsProps) => {
  return (
    <Flex direction='row' alignItems='center' gap='xs'>
      {tabs.map((tab) => (
        <SelectablePill
          key={tab}
          type='radio'
          size='large'
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
    </Flex>
  )
}
