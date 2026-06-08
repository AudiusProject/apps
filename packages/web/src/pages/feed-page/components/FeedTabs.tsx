import { ChangeEvent, useCallback } from 'react'

import { FeedTab } from '@audius/common/models'
import { Flex, SelectablePill } from '@audius/harmony'

type FeedTabsProps = {
  currentTab: FeedTab
  onSelectTab: (tab: FeedTab) => void
}

const messages = {
  forYou: 'For You',
  latest: 'Latest'
}

const tabToLabel: Record<FeedTab, string> = {
  [FeedTab.FOR_YOU]: messages.forYou,
  [FeedTab.LATEST]: messages.latest
}

const tabs: FeedTab[] = [FeedTab.FOR_YOU, FeedTab.LATEST]

export const FeedTabs = ({ currentTab, onSelectTab }: FeedTabsProps) => {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onSelectTab(e.target.value as FeedTab)
    },
    [onSelectTab]
  )

  return (
    <Flex gap='s' role='radiogroup' onChange={handleChange}>
      {tabs.map((tab) => (
        <SelectablePill
          name='feed-tab'
          key={tab}
          type='radio'
          value={tab}
          label={tabToLabel[tab]}
          isSelected={currentTab === tab}
          size='large'
        />
      ))}
    </Flex>
  )
}
