import { useArtistCoinByTicker } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { useRoute } from '@react-navigation/native'

import { Flex, IconButton, IconKebabHorizontal } from '@audius/harmony-native'
import { Screen, ScreenContent, ScrollView } from 'app/components/core'
import { useDrawer } from 'app/hooks/useDrawer'

import { BalanceCard } from './components/BalanceCard'
import { CoinInfoCard } from './components/CoinInfoCard'
import { CoinInsightsCard } from './components/CoinInsightsCard'
import { CoinLeaderboardCard } from './components/CoinLeaderboardCard'
import { ExclusiveTracksSection } from './components/ExclusiveTracksSection'

export const CoinDetailsScreen = () => {
  const { ticker } = useRoute().params as { ticker: string }
  const { data: coin } = useArtistCoinByTicker({ ticker })
  const { onOpen } = useDrawer('CoinInsightsOverflowMenu')
  const mint = coin?.mint ?? ''

  const handleOpenOverflowMenu = () => {
    onOpen({ mint })
  }

  const topbarRight = (
    <IconButton
      icon={IconKebabHorizontal}
      onPress={handleOpenOverflowMenu}
      color='subdued'
      ripple
    />
  )

  return (
    <Screen
      url={route.COIN_DETAIL_PAGE}
      variant='secondary'
      topbarRight={topbarRight}
      title={ticker ? `$${ticker}` : 'Coin Details'}
    >
      <ScreenContent>
        <ScrollView>
          <Flex column gap='m' ph='s' pv='2xl'>
            <BalanceCard mint={mint} />
            <CoinInfoCard mint={mint} />
            <CoinInsightsCard mint={mint} />
            <CoinLeaderboardCard mint={mint} />
            <ExclusiveTracksSection mint={mint} />
          </Flex>
        </ScrollView>
      </ScreenContent>
    </Screen>
  )
}
