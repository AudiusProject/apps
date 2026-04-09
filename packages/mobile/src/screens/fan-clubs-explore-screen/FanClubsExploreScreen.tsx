import { useState, useEffect, useCallback, useMemo } from 'react'

import type { Coin } from '@audius/common/adapters'
import {
  useFanClubs,
  GetCoinsSortMethodEnum,
  GetCoinsSortDirectionEnum
} from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import { useRoute } from '@react-navigation/native'
import type { ListRenderItem } from '@shopify/flash-list'
import { FlashList } from '@shopify/flash-list'
import {
  ImageBackground,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native'
import {
  TabView,
  TabBar,
  type Route as TabRoute,
  type SceneRendererProps
} from 'react-native-tab-view'
import { useDebounce } from 'react-use'

import {
  Divider,
  Flex,
  IconCaretLeft,
  IconSearch,
  IconSort,
  LoadingSpinner,
  Text,
  TextInput,
  TextInputSize,
  useTheme
} from '@audius/harmony-native'
import imageSearchHeaderBackground from 'app/assets/images/imageCoinsBackgroundImage.webp'
import { GradientText, Screen, TokenIcon } from 'app/components/core'
import { PlayBarChin } from 'app/components/core/PlayBarChin'
import { UserLink } from 'app/components/user-link'
import { useNavigation } from 'app/hooks/useNavigation'
import { useStatusBarStyle } from 'app/hooks/useStatusBarStyle'
import { env } from 'app/services/env'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { FanClubExploreCard } from './FanClubExploreCard'

const COIN_ROW_HEIGHT = 56
/** FlashList: slightly conservative height avoids mis-recycling tall cards when scrolling. */
const COIN_CARD_ESTIMATED_HEIGHT = 400
const EXPLORE_PAGE_SIZE = 12

const COIN_ROW_MESSAGES = walletMessages.fanClubs

type CoinRowProps = {
  coin: Coin
  onPress: () => void
}

const CoinRow = ({ coin, onPress }: CoinRowProps) => {
  const { ownerId } = coin

  return (
    <TouchableOpacity onPress={onPress}>
      <Flex row gap='s' alignItems='center' ph='m' pv='s'>
        <TokenIcon logoURI={coin.logoUri} size='3xl' />
        <Flex>
          <Flex row gap='xs' alignItems='center'>
            <Text variant='title' size='s' strength='weak'>
              {coin.name}
            </Text>
            <Text variant='body' size='s' color='subdued'>
              ${coin.ticker}
            </Text>
          </Flex>

          <UserLink
            userId={ownerId}
            size='xs'
            badgeSize='2xs'
            hideFanClubBadge
            mint={coin.mint}
          />
        </Flex>
      </Flex>
    </TouchableOpacity>
  )
}

const NoCoinsContent = () => {
  return (
    <Flex justifyContent='center' alignItems='center' p='4xl' gap='xl'>
      <IconSearch size='2xl' color='default' />
      <Text variant='heading' size='m'>
        {COIN_ROW_MESSAGES.noCoins}
      </Text>
      <Text variant='body' size='l' textAlign='center'>
        {COIN_ROW_MESSAGES.noCoinsDescription}
      </Text>
    </Flex>
  )
}

const Header = ({
  searchValue,
  setSearchValue
}: {
  searchValue: string
  setSearchValue: (value: string) => void
}) => {
  const navigation = useNavigation()
  const { focus, backgroundSurface2 } = useThemeColors()

  return (
    <ImageBackground source={imageSearchHeaderBackground}>
      <Flex row pt='unit14' ph='l' pb='m' gap='m' alignItems='center'>
        <IconCaretLeft
          size='l'
          color='staticWhite'
          onPress={() => navigation.goBack()}
        />
        <Flex
          flex={1}
          style={{
            borderWidth: 1,
            borderColor: focus,
            borderRadius: 4,
            backgroundColor: backgroundSurface2
          }}
        >
          <TextInput
            label='Search'
            autoCorrect={false}
            placeholder={COIN_ROW_MESSAGES.searchPlaceholder}
            size={TextInputSize.EXTRA_SMALL}
            startIcon={IconSearch}
            onChangeText={setSearchValue}
            value={searchValue}
          />
        </Flex>
      </Flex>
    </ImageBackground>
  )
}

const useTabStyles = makeStyles(({ palette, spacing }) => ({
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
  { key: 'cards', title: COIN_ROW_MESSAGES.cardView },
  { key: 'leaderboard', title: COIN_ROW_MESSAGES.leaderboardView }
]

export const FanClubsExploreScreen = () => {
  const { typography } = useTheme()
  const route = useRoute()
  const navigation = useNavigation()
  const layout = useWindowDimensions()
  const tabStyles = useTabStyles()
  const { textIconSubdued, neutral, backgroundSurface2 } = useThemeColors()

  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('')
  const [tabIndex, setTabIndex] = useState(0)
  const [sortMethod, setSortMethod] = useState<GetCoinsSortMethodEnum>(
    GetCoinsSortMethodEnum.MarketCap
  )
  const [sortDirection, setSortDirection] = useState<GetCoinsSortDirectionEnum>(
    GetCoinsSortDirectionEnum.Desc
  )

  useStatusBarStyle('light-content')

  useDebounce(
    () => {
      setDebouncedSearchValue(searchValue)
    },
    300,
    [searchValue]
  )

  const {
    data: coins,
    isPending,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useFanClubs({
    pageSize: EXPLORE_PAGE_SIZE,
    sortMethod,
    sortDirection,
    query: debouncedSearchValue
  })

  const allCoins = useMemo(
    () => coins?.filter((coin) => coin.mint !== env.WAUDIO_MINT_ADDRESS) ?? [],
    [coins]
  )

  const handleCoinPress = useCallback(
    (ticker?: string) => {
      if (ticker) {
        navigation.navigate('CoinDetailsScreen', { ticker })
      }
    },
    [navigation]
  )

  const handleSortPress = useCallback(() => {
    navigation.navigate('FanClubSort', {
      initialSortMethod: sortMethod,
      initialSortDirection: sortDirection
    })
  }, [navigation, sortMethod, sortDirection])

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage()
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage])

  useEffect(() => {
    const routeParams = route.params as {
      sortMethod?: GetCoinsSortMethodEnum
      sortDirection?: GetCoinsSortDirectionEnum
    }
    if (routeParams?.sortMethod) {
      setSortMethod(routeParams.sortMethod)
    }
    if (routeParams?.sortDirection) {
      setSortDirection(routeParams.sortDirection)
    }
  }, [route.params])

  const shouldShowNoCoinsContent =
    !isPending && !isFetching && allCoins.length === 0

  const renderCoinRow: ListRenderItem<Coin> = useCallback(
    ({ item }) => (
      <CoinRow coin={item} onPress={() => handleCoinPress(item.ticker)} />
    ),
    [handleCoinPress]
  )

  const renderCoinCard: ListRenderItem<Coin> = useCallback(
    ({ item }) => (
      <FanClubExploreCard
        coin={item}
        onPress={() => handleCoinPress(item.ticker)}
      />
    ),
    [handleCoinPress]
  )

  const keyExtractor = useCallback((coin: Coin) => coin.mint, [])

  const renderFooter = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <Flex justifyContent='center' alignItems='center' p='l'>
          <LoadingSpinner />
        </Flex>
      )
    }
    return null
  }, [isFetchingNextPage])

  const renderTabBar = useCallback(
    (props: any) => (
      <TabBar
        {...props}
        style={tabStyles.tabBar}
        indicatorStyle={tabStyles.tabIndicator}
        activeColor={neutral}
        inactiveColor={textIconSubdued}
        pressColor='transparent'
        pressOpacity={0.7}
      />
    ),
    [tabStyles.tabBar, tabStyles.tabIndicator, neutral, textIconSubdued]
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
          strength={focused ? 'strong' : 'default'}
          color={focused ? 'default' : 'subdued'}
        >
          {tabRoute.title}
        </Text>
      )
    }),
    []
  )

  const renderScene = useCallback(
    ({ route: sceneRoute }: SceneRendererProps & { route: TabRoute }) => {
      if (sceneRoute.key === 'cards') {
        return (
          <View style={{ flex: 1, backgroundColor: backgroundSurface2 }}>
            {isPending ? (
              <Flex
                flex={1}
                justifyContent='center'
                alignItems='center'
                p='4xl'
              >
                <LoadingSpinner />
              </Flex>
            ) : shouldShowNoCoinsContent ? (
              <NoCoinsContent />
            ) : (
              <FlashList
                data={allCoins}
                renderItem={renderCoinCard}
                keyExtractor={keyExtractor}
                estimatedItemSize={COIN_CARD_ESTIMATED_HEIGHT}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.8}
                ListFooterComponent={renderFooter}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingVertical: 16
                }}
              />
            )}
          </View>
        )
      }

      return (
        <View style={{ flex: 1, backgroundColor: backgroundSurface2 }}>
          <Flex mh='l' mv='l' flex={1}>
            <Flex
              flex={1}
              border='default'
              borderRadius='m'
              backgroundColor='white'
            >
              <Flex
                row
                ph='l'
                pv='s'
                justifyContent='space-between'
                alignItems='center'
              >
                <GradientText
                  style={{
                    fontSize: typography.size.l,
                    fontFamily: typography.fontByWeight.bold
                  }}
                >
                  {COIN_ROW_MESSAGES.title}
                </GradientText>
                <TouchableOpacity onPress={handleSortPress}>
                  <Flex
                    alignItems='center'
                    border='default'
                    borderRadius='s'
                    ph='m'
                    pv='s'
                  >
                    <IconSort size='s' color='default' />
                  </Flex>
                </TouchableOpacity>
              </Flex>
              <Divider orientation='horizontal' />
              {isPending ? (
                <Flex justifyContent='center' alignItems='center' p='4xl'>
                  <LoadingSpinner />
                </Flex>
              ) : shouldShowNoCoinsContent ? (
                <NoCoinsContent />
              ) : (
                <FlashList
                  data={allCoins}
                  renderItem={renderCoinRow}
                  keyExtractor={keyExtractor}
                  estimatedItemSize={COIN_ROW_HEIGHT}
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.8}
                  ListFooterComponent={renderFooter}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </Flex>
          </Flex>
        </View>
      )
    },
    [
      allCoins,
      backgroundSurface2,
      handleLoadMore,
      handleSortPress,
      isPending,
      keyExtractor,
      renderCoinCard,
      renderCoinRow,
      renderFooter,
      shouldShowNoCoinsContent,
      typography.fontByWeight.bold,
      typography.size.l
    ]
  )

  return (
    <Screen
      header={() => (
        <Header searchValue={searchValue} setSearchValue={setSearchValue} />
      )}
    >
      <View style={{ flex: 1 }}>
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
      </View>
      <PlayBarChin />
    </Screen>
  )
}
