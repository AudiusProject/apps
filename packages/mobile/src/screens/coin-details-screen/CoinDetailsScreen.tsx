import { useState, useCallback, useMemo } from 'react'

import { useArtistCoinByTicker } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { useRoute } from '@react-navigation/native'
import { useWindowDimensions } from 'react-native'
import {
  TabView,
  TabBar,
  type Route as TabRoute,
  type SceneRendererProps
} from 'react-native-tab-view'

import {
  Flex,
  IconButton,
  IconKebabHorizontal,
  Text
} from '@audius/harmony-native'
import { Screen, ScreenContent, ScrollView } from 'app/components/core'
import { useDrawer } from 'app/hooks/useDrawer'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { CoinTab } from './components/CoinTab'
import { FanClubTab } from './components/FanClubTab'

const messages = {
  fanClub: 'Fan Club',
  coin: 'Coin'
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  tabBar: {
    backgroundColor: palette.white,
    height: spacing(10),
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderDefault
  },
  tabIndicator: {
    backgroundColor: palette.focus,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    height: 3,
    bottom: -3
  }
}))

const tabRoutes: TabRoute[] = [
  { key: 'fanClub', title: messages.fanClub },
  { key: 'coin', title: messages.coin }
]

export const CoinDetailsScreen = () => {
  const { ticker } = useRoute().params as { ticker: string }
  const { data: coin } = useArtistCoinByTicker({ ticker })
  const { onOpen } = useDrawer('CoinInsightsOverflowMenu')
  const mint = coin?.mint ?? ''
  const layout = useWindowDimensions()
  const styles = useStyles()
  const { textIconSubdued, neutral } = useThemeColors()

  const [tabIndex, setTabIndex] = useState(0)

  const handleOpenOverflowMenu = useCallback(() => {
    onOpen({ mint })
  }, [onOpen, mint])

  const handleSwitchToCoinTab = useCallback(() => {
    setTabIndex(1)
  }, [])

  const topbarRight = (
    <IconButton
      icon={IconKebabHorizontal}
      onPress={handleOpenOverflowMenu}
      color='subdued'
      ripple
    />
  )

  const coinName = coin?.name ?? (ticker ? `$${ticker}` : 'Coin Details')

  const renderScene = useCallback(
    ({ route: tabRoute }: SceneRendererProps & { route: TabRoute }) => {
      switch (tabRoute.key) {
        case 'fanClub':
          return (
            <ScrollView>
              <Flex column gap='m' pv='l'>
                <FanClubTab
                  mint={mint}
                  onSwitchToCoinTab={handleSwitchToCoinTab}
                />
              </Flex>
            </ScrollView>
          )
        case 'coin':
          return (
            <ScrollView>
              <Flex column gap='m' ph='l' pv='l'>
                <CoinTab mint={mint} />
              </Flex>
            </ScrollView>
          )
        default:
          return null
      }
    },
    [mint, handleSwitchToCoinTab]
  )

  const tabCommonOptions = useMemo(
    () => ({
      label: ({
        focused,
        route: tabRoute
      }: {
        focused: boolean
        route: TabRoute
      }) => (
        <Text
          variant='body'
          size='xs'
          strength='strong'
          color={focused ? 'default' : 'subdued'}
        >
          {tabRoute.title}
        </Text>
      )
    }),
    []
  )

  const renderTabBar = useCallback(
    (props: any) => (
      <TabBar
        {...props}
        style={styles.tabBar}
        indicatorStyle={styles.tabIndicator}
        activeColor={neutral}
        inactiveColor={textIconSubdued}
        pressColor='transparent'
        pressOpacity={0.7}
      />
    ),
    [styles.tabBar, styles.tabIndicator, neutral, textIconSubdued]
  )

  return (
    <Screen
      url={route.COIN_DETAIL_PAGE}
      variant='secondary'
      topbarRight={topbarRight}
      title={coinName}
    >
      <ScreenContent>
        <TabView
          navigationState={{ index: tabIndex, routes: tabRoutes }}
          renderScene={renderScene}
          renderTabBar={renderTabBar}
          onIndexChange={setTabIndex}
          initialLayout={{ width: layout.width }}
          swipeEnabled
          style={{ flex: 1 }}
          commonOptions={tabCommonOptions}
        />
      </ScreenContent>
    </Screen>
  )
}
