import React, { useCallback } from 'react'

import {
  useArtistCreatedFanClub,
  useCurrentUserId,
  useQueryContext,
  useUserCoins
} from '@audius/common/api'
import { buySellMessages, walletMessages } from '@audius/common/messages'
import { AUDIO_TICKER } from '@audius/common/store'
import { removeNullable } from '@audius/common/utils'
import { TouchableOpacity } from 'react-native'

import {
  Box,
  Button,
  Divider,
  Flex,
  IconCaretRight,
  Paper,
  Text
} from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import { AudioCoinCard } from './AudioCoinCard'
import { CashCard } from './CashCard'
import { CoinCard, CoinCardSkeleton, HexagonalSkeleton } from './CoinCard'

const messages = {
  ...buySellMessages,
  assets: 'Assets'
}

const YourCoinsSkeleton = () => {
  return (
    <Flex p='l' pl='xl' row justifyContent='space-between' alignItems='center'>
      <Flex row alignItems='center' gap='l'>
        <HexagonalSkeleton />
        <CoinCardSkeleton />
      </Flex>
    </Flex>
  )
}

const YourCoinsHeader = () => {
  const navigation = useNavigation()

  const handleBuySell = useCallback(() => {
    navigation.navigate('BuySell', {
      initialTab: 'buy',
      coinTicker: AUDIO_TICKER
    })
  }, [navigation])

  return (
    <Flex
      row
      alignItems='center'
      justifyContent='space-between'
      p='l'
      pb='s'
      borderBottom='default'
    >
      <Text variant='heading' size='s' color='default'>
        {messages.assets}
      </Text>
      <Button variant='secondary' size='small' onPress={handleBuySell}>
        {messages.buySell}
      </Button>
    </Flex>
  )
}

const DiscoverFanClubsCard = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Flex
        p='l'
        pl='xl'
        row
        h={96}
        justifyContent='space-between'
        alignItems='center'
      >
        <Text variant='heading' size='s' numberOfLines={1}>
          {walletMessages.fanClubs.title}
        </Text>
        <IconCaretRight color='subdued' />
      </Flex>
    </TouchableOpacity>
  )
}

export const YourCoins = () => {
  const { data: currentUserId } = useCurrentUserId()
  const navigation = useNavigation()
  const { env } = useQueryContext()

  const { data: fanClubs, isPending: isLoadingCoins } = useUserCoins({
    userId: currentUserId
  })
  const { data: artistOwnedCoin } = useArtistCreatedFanClub(currentUserId)
  const audioCoin = fanClubs?.find(
    (coin) => coin?.mint === env.WAUDIO_MINT_ADDRESS
  )
  const otherCoins = fanClubs?.filter(
    (coin) =>
      coin?.mint !== env.WAUDIO_MINT_ADDRESS &&
      coin?.mint !== artistOwnedCoin?.mint &&
      coin?.balance > 0
  )
  const orderedCoins = [
    audioCoin,
    artistOwnedCoin,
    ...(otherCoins ?? [])
  ].filter(removeNullable)

  // Show audio coin card when no coins are available
  const coins =
    orderedCoins.length === 0 ? ['audio-coin' as const] : orderedCoins

  // Add cash card at the beginning, and discover fan clubs card at the end
  const cards = ['cash' as const, ...coins, 'discover-fan-clubs' as const]

  const handleDiscoverFanClubs = useCallback(() => {
    navigation.navigate('FanClubsExplore')
  }, [navigation])

  return (
    <Paper border='default'>
      <YourCoinsHeader />
      <Flex column>
        {isLoadingCoins || !currentUserId ? (
          <YourCoinsSkeleton />
        ) : (
          cards.map((item, idx) => (
            <Box key={typeof item === 'string' ? item : item.mint}>
              {item === 'cash' ? (
                <CashCard />
              ) : item === 'discover-fan-clubs' ? (
                <DiscoverFanClubsCard onPress={handleDiscoverFanClubs} />
              ) : item === 'audio-coin' ? (
                <AudioCoinCard />
              ) : (
                <CoinCard mint={item.mint} />
              )}
              {idx !== cards.length - 1 && <Divider />}
            </Box>
          ))
        )}
      </Flex>
    </Paper>
  )
}
