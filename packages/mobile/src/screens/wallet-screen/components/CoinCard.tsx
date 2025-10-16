import { useCallback } from 'react'

import { useArtistCoin } from '@audius/common/api'
import { useFormattedCoinBalance } from '@audius/common/hooks'
import { Image, TouchableOpacity } from 'react-native'

import {
  Box,
  Flex,
  HexagonalIcon,
  Skeleton,
  spacing,
  Text
} from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

const ICON_SIZE = 64

export const CoinCardSkeleton = () => {
  return (
    <Flex column gap='xs'>
      <Box w={240} h={36}>
        <Skeleton />
      </Box>
      <Box w={140} h={24}>
        <Skeleton />
      </Box>
    </Flex>
  )
}

export const HexagonalSkeleton = () => {
  return (
    <HexagonalIcon size={ICON_SIZE}>
      <Box w={ICON_SIZE} h={ICON_SIZE}>
        <Skeleton />
      </Box>
    </HexagonalIcon>
  )
}

export type CoinCardProps = {
  mint: string
  showUserBalance?: boolean
}

export const CoinCard = ({ mint, showUserBalance = true }: CoinCardProps) => {
  const navigation = useNavigation()

  const { data: coinData, isPending: coinsDataLoading } = useArtistCoin(mint)
  const ticker = coinData?.ticker ?? ''
  const icon = coinData?.logoUri ?? ''

  const onPress = useCallback(() => {
    navigation.navigate('CoinDetailsScreen', { ticker })
  }, [ticker, navigation])

  const {
    coinBalanceFormatted: balance,
    coinDollarValue: dollarValue,
    isCoinBalanceLoading,
    isCoinPriceLoading,
    formattedHeldValue
  } = useFormattedCoinBalance(mint)

  const isLoading =
    isCoinBalanceLoading || isCoinPriceLoading || coinsDataLoading

  const renderIcon = () => {
    if (typeof icon === 'string') {
      return (
        <HexagonalIcon size={ICON_SIZE}>
          <Image
            source={{ uri: icon }}
            style={{
              width: ICON_SIZE,
              height: ICON_SIZE
            }}
          />
        </HexagonalIcon>
      )
    }
    return icon
  }

  return (
    <TouchableOpacity onPress={onPress} disabled={isLoading}>
      <Flex
        p='l'
        pl='xl'
        row
        justifyContent='space-between'
        alignItems='center'
      >
        <Flex row alignItems='center' gap='l' style={{ flexShrink: 1 }}>
          {isLoading ? <HexagonalSkeleton /> : renderIcon()}
          <Flex column gap='xs'>
            {isLoading ? (
              <CoinCardSkeleton />
            ) : (
              <>
                {coinData?.name ? (
                  <Text
                    variant='heading'
                    size='s'
                    numberOfLines={1}
                    ellipsizeMode='tail'
                  >
                    {coinData.name}
                  </Text>
                ) : null}
                <Flex
                  row
                  alignItems='center'
                  gap='xs'
                  style={{ maxWidth: '100%' }}
                >
                  <Text variant='title' size='l'>
                    {balance}
                  </Text>
                  <Text
                    variant='title'
                    size='l'
                    color='subdued'
                    numberOfLines={1}
                    ellipsizeMode='tail'
                    style={{ flexShrink: 1 }}
                  >
                    ${coinData?.ticker}
                  </Text>
                </Flex>
              </>
            )}
          </Flex>
        </Flex>
        <Flex row alignItems='center' gap='m' ml={spacing.unit22}>
          {!isLoading && showUserBalance ? (
            <Text variant='title' size='l' color='default'>
              {formattedHeldValue ?? dollarValue}
            </Text>
          ) : null}
        </Flex>
      </Flex>
    </TouchableOpacity>
  )
}
