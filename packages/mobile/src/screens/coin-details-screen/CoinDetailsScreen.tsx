import { useState, useCallback } from 'react'

import { useArtistCoinByTicker } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { useRoute } from '@react-navigation/native'

import { Flex, IconButton, IconKebabHorizontal } from '@audius/harmony-native'
import {
  Screen,
  ScreenContent,
  ScrollView,
  SegmentedControl
} from 'app/components/core'
import type { Option } from 'app/components/core/SegmentedControl'
import { useDrawer } from 'app/hooks/useDrawer'

import { CoinTab } from './components/CoinTab'
import { FanClubTab } from './components/FanClubTab'

type TabType = 'fanClub' | 'coin'

const tabOptions: Array<Option<TabType>> = [
  { key: 'fanClub', text: 'Fan Club' },
  { key: 'coin', text: 'Coin' }
]

export const CoinDetailsScreen = () => {
  const { ticker } = useRoute().params as { ticker: string }
  const { data: coin } = useArtistCoinByTicker({ ticker })
  const { onOpen } = useDrawer('CoinInsightsOverflowMenu')
  const mint = coin?.mint ?? ''
  const [activeTab, setActiveTab] = useState<TabType>('fanClub')

  const handleOpenOverflowMenu = useCallback(() => {
    onOpen({ mint })
  }, [onOpen, mint])

  const topbarRight = (
    <IconButton
      icon={IconKebabHorizontal}
      onPress={handleOpenOverflowMenu}
      color='subdued'
      ripple
    />
  )

  const coinName = coin?.name ?? (ticker ? `$${ticker}` : 'Coin Details')

  return (
    <Screen
      url={route.COIN_DETAIL_PAGE}
      variant='secondary'
      topbarRight={topbarRight}
      title={coinName}
    >
      <ScreenContent>
        <Flex ph='l' pv='s'>
          <SegmentedControl
            options={tabOptions}
            selected={activeTab}
            onSelectOption={setActiveTab}
            fullWidth
            equalWidth
          />
        </Flex>
        <ScrollView>
          <Flex column gap='m' pv='l'>
            {activeTab === 'fanClub' ? (
              <FanClubTab mint={mint} />
            ) : (
              <Flex ph='l'>
                <CoinTab mint={mint} />
              </Flex>
            )}
          </Flex>
        </ScrollView>
      </ScreenContent>
    </Screen>
  )
}
