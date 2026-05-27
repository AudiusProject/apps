import { FeedTab } from '@audius/common/models'
import { ScrollView, View } from 'react-native'

import { Flex, SelectablePill, useTheme } from '@audius/harmony-native'

const tabLabels: Record<FeedTab, string> = {
  [FeedTab.FOR_YOU]: 'For You',
  [FeedTab.LATEST]: 'Latest'
}

const tabs: FeedTab[] = [FeedTab.FOR_YOU, FeedTab.LATEST]

type FeedTabsProps = {
  currentTab: FeedTab
  onSelectTab: (tab: FeedTab) => void
}

export const FeedTabs = ({ currentTab, onSelectTab }: FeedTabsProps) => {
  const { spacing, color } = useTheme()
  return (
    <View
      style={{
        backgroundColor: color.background.white,
        paddingVertical: spacing.s
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.l }}
      >
        <Flex direction='row' alignItems='center' gap='s'>
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
      </ScrollView>
    </View>
  )
}
