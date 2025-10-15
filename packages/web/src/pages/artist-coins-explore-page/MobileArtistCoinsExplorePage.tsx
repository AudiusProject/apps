import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
  ChangeEvent
} from 'react'

import { Coin } from '@audius/common/adapters'
import {
  useArtistCoins,
  GetCoinsSortMethodEnum,
  GetCoinsSortDirectionEnum
} from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import { route } from '@audius/common/utils'
import {
  Box,
  Flex,
  IconSearch,
  IconSort,
  LoadingSpinner,
  Paper,
  Text,
  Divider,
  TextInput,
  TextInputSize
} from '@audius/harmony'
import InfiniteScroll from 'react-infinite-scroller'
import { useLocation } from 'react-router-dom'
import { useNavigate } from 'react-router-dom-v5-compat'
import { useDebounce } from 'react-use'

import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import { UserLink } from 'components/link'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, {
  LeftPreset,
  RightPreset
} from 'components/nav/mobile/NavContext'
import { env } from 'services/env'
import { getScrollParent } from 'utils/scrollParent'

import styles from './MobileArtistCoinsExplorePage.module.css'

type CoinRowProps = {
  coin: Coin
  onPress: () => void
}

const CoinRow = ({ coin, onPress }: CoinRowProps) => {
  const { ownerId } = coin

  return (
    <Flex ph='l' pv='s' alignItems='center' gap='s' onClick={onPress}>
      <TokenIcon logoURI={coin.logoUri} size='xl' hex />

      <Box flex={1}>
        <Flex alignItems='center' gap='xs' mb='xs'>
          <Text variant='title' size='s' strength='weak' ellipses>
            {coin.name}
          </Text>
          <Text variant='body' size='s' color='subdued'>
            {coin.ticker}
          </Text>
        </Flex>

        <UserLink userId={ownerId} size='xs' badgeSize='xs' />
      </Box>
    </Flex>
  )
}

const NoCoinsContent = () => {
  return (
    <Flex
      direction='column'
      alignItems='center'
      justifyContent='center'
      p='4xl'
      ph='l'
      gap='l'
    >
      <IconSearch size='2xl' color='default' />
      <Text variant='heading' size='m' textAlign='center'>
        {walletMessages.artistCoins.noCoins}
      </Text>
      <Text variant='body' size='l' color='subdued' textAlign='center'>
        {walletMessages.artistCoins.noCoinsDescription}
      </Text>
    </Flex>
  )
}

const SearchSection = ({
  searchValue,
  setSearchValue
}: {
  searchValue: string
  setSearchValue: (value: string) => void
}) => {
  return (
    <Flex borderBottom='default' p='l' backgroundColor='surface1'>
      <TextInput
        size={TextInputSize.EXTRA_SMALL}
        placeholder={walletMessages.artistCoins.searchPlaceholder}
        value={searchValue}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setSearchValue(e.target.value)
        }
        label={walletMessages.artistCoins.searchPlaceholder}
        startIcon={IconSearch}
      />
    </Flex>
  )
}

export const MobileArtistCoinsExplorePage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('')
  const routeParams = location.state as {
    sortMethod?: GetCoinsSortMethodEnum
    sortDirection?: GetCoinsSortDirectionEnum
  }
  const [sortMethod] = useState<GetCoinsSortMethodEnum>(
    routeParams?.sortMethod ?? GetCoinsSortMethodEnum.MarketCap
  )
  const [sortDirection] = useState<GetCoinsSortDirectionEnum>(
    routeParams?.sortDirection ?? GetCoinsSortDirectionEnum.Desc
  )

  const {
    data: coinsData,
    isPending,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useArtistCoins({
    sortMethod,
    sortDirection,
    query: debouncedSearchValue
  })
  const coins = coinsData?.filter(
    (coin) => coin.mint !== env.WAUDIO_MINT_ADDRESS
  )

  // Debounce search value to avoid excessive API calls
  useDebounce(() => setDebouncedSearchValue(searchValue), 300, [searchValue])

  const scrollRef = useRef<HTMLDivElement>(null)

  const getScrollableParent = useCallback(() => {
    if (!scrollRef.current) {
      return null
    }
    return (
      (getScrollParent(scrollRef.current) as unknown as HTMLElement) ?? null
    )
  }, [])

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const { setLeft, setRight } = useContext(NavContext)!
  useEffect(() => {
    setLeft(LeftPreset.BACK)
    setRight(RightPreset.KEBAB)
  }, [setLeft, setRight])

  const handleCoinPress = useCallback(
    (ticker: string) => {
      navigate(route.coinPage(ticker))
    },
    [navigate]
  )

  const handleSortPress = useCallback(() => {
    navigate('/coins/sort', {
      state: {
        sortMethod,
        sortDirection
      }
    })
  }, [navigate, sortMethod, sortDirection])

  const shouldShowNoCoinsContent = !coins || coins.length === 0

  return (
    <MobilePageContainer
      title={walletMessages.artistCoins.title}
      containerClassName={styles.container}
    >
      <InfiniteScroll
        hasMore={hasNextPage ?? false}
        loadMore={handleLoadMore}
        getScrollParent={getScrollableParent}
        useWindow={false}
      >
        <Flex column gap='l' w='100%' ref={scrollRef}>
          <SearchSection
            searchValue={searchValue}
            setSearchValue={setSearchValue}
          />

          <Paper column m='l' backgroundColor='white'>
            <Flex
              ph='l'
              pv='s'
              justifyContent='space-between'
              alignItems='center'
            >
              <Text
                variant='title'
                size='l'
                css={{
                  background: 'var(--harmony-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: 'transparent' // fallback for browsers that don't support background-clip
                }}
              >
                {walletMessages.artistCoins.title}
              </Text>
              <Flex
                border='default'
                borderRadius='s'
                ph='m'
                pv='s'
                alignItems='center'
                justifyContent='center'
                onClick={handleSortPress}
              >
                <IconSort size='s' color='default' />
              </Flex>
            </Flex>

            <Divider />

            <Box pt='s'>
              {isPending ? (
                <Flex justifyContent='center' alignItems='center' p='4xl'>
                  <LoadingSpinner />
                </Flex>
              ) : shouldShowNoCoinsContent ? (
                <NoCoinsContent />
              ) : (
                <Box>
                  {coins.map((coin) => (
                    <CoinRow
                      key={coin.mint}
                      coin={coin}
                      onPress={() => handleCoinPress(coin.ticker ?? '')}
                    />
                  ))}
                  {isFetchingNextPage ? (
                    <Flex justifyContent='center' p='l'>
                      <LoadingSpinner css={{ width: 20, height: 20 }} />
                    </Flex>
                  ) : null}
                </Box>
              )}
            </Box>
          </Paper>
        </Flex>
      </InfiniteScroll>
      <Flex pb='3xl' />
    </MobilePageContainer>
  )
}
