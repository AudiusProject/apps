import { useState, useEffect, useCallback } from 'react'

import type { Coin } from '@audius/common/adapters'
import {
  useArtistCoins,
  GetCoinsSortMethodEnum,
  GetCoinsSortDirectionEnum
} from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import { useRoute } from '@react-navigation/native'
import type { ListRenderItem } from '@shopify/flash-list'
import { FlashList } from '@shopify/flash-list'
import { ImageBackground, TouchableOpacity } from 'react-native'
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
import { PlayBarChin } from 'app/components/core/PlayBarChin'
import { UserLink } from 'app/components/user-link'
import { useNavigation } from 'app/hooks/useNavigation'
import { useStatusBarStyle } from 'app/hooks/useStatusBarStyle'
import { env } from 'app/services/env'

import {
  GradientText,
  TokenIcon,
  Screen,
  VirtualizedScrollView
} from '../../components/core'

const COIN_ROW_HEIGHT = 50 // Estimated height for FlashList optimization

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
            hideArtistCoinBadge
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
        {walletMessages.artistCoins.noCoins}
      </Text>
      <Text variant='body' size='l' textAlign='center'>
        {walletMessages.artistCoins.noCoinsDescription}
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
  return (
    <ImageBackground source={imageSearchHeaderBackground}>
      <Flex row pt='unit14' ph='l' pb='m' gap='m' alignItems='center'>
        <IconCaretLeft
          size='l'
          color='staticWhite'
          onPress={() => navigation.goBack()}
        />
        <Flex flex={1}>
          <TextInput
            label='Search'
            autoCorrect={false}
            placeholder={walletMessages.artistCoins.searchPlaceholder}
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

export const ArtistCoinsExploreScreen = () => {
  const { typography } = useTheme()
  const route = useRoute()
  const navigation = useNavigation()
  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('')
  const [sortMethod, setSortMethod] = useState<GetCoinsSortMethodEnum>(
    GetCoinsSortMethodEnum.MarketCap
  )
  const [sortDirection, setSortDirection] = useState<GetCoinsSortDirectionEnum>(
    GetCoinsSortDirectionEnum.Desc
  )

  // Set status bar to light content for dark header
  useStatusBarStyle('light-content')

  // Debounce search value to avoid excessive API calls
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
  } = useArtistCoins({
    sortMethod,
    sortDirection,
    query: debouncedSearchValue
  })

  // Filter out WAUDIO
  const allCoins =
    coins?.filter((coin) => coin.mint !== env.WAUDIO_MINT_ADDRESS) ?? []

  const handleCoinPress = useCallback(
    (ticker?: string) => {
      if (ticker) {
        navigation.navigate('CoinDetailsScreen', { ticker })
      }
    },
    [navigation]
  )

  const handleSortPress = useCallback(() => {
    navigation.navigate('ArtistCoinSort', {
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
    const routeParams = route.params as any
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
  return (
    <Screen
      header={() => (
        <Header searchValue={searchValue} setSearchValue={setSearchValue} />
      )}
    >
      <VirtualizedScrollView>
        <Flex
          mh='l'
          mv='xl'
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
              {walletMessages.artistCoins.title}
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
      </VirtualizedScrollView>
      <PlayBarChin />
    </Screen>
  )
}
