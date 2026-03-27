import { useCallback } from 'react'

import { useArtistCoin, useCoinBalance, useCurrentUserId } from '@audius/common/api'
import { coinDetailsMessages, walletMessages } from '@audius/common/messages'
import {
  useBuySellInitialTab,
  useIsManagedAccount
} from '@audius/common/hooks'
import {
  receiveTokensModalActions
} from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { TouchableOpacity } from 'react-native'

import {
  Button,
  Flex,
  IconCaretRight,
  IconCloudUpload,
  Paper,
  Text
} from '@audius/harmony-native'
import { TokenIcon } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'

import { BannerSection } from './CoinInfoCard'
import { CoinLeaderboardCard } from './CoinLeaderboardCard'
import { ExclusiveTracksSection } from './ExclusiveTracksSection'

const messages = {
  fanClub: 'FAN CLUB',
  poweredBy: 'POWERED BY',
  uploadExclusiveTrack: coinDetailsMessages.coinInfo.uploadExclusiveTrack,
  becomeAMember: coinDetailsMessages.balance.becomeAMember,
  hintDescription: coinDetailsMessages.balance.hintDescription,
  fanClubFeed: 'Fan Club Feed'
}

type FanClubTabProps = {
  mint: string
}

const BecomeAMemberCard = ({
  ticker,
  mint,
  coinTicker
}: {
  ticker: string
  mint: string
  coinTicker?: string
}) => {
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const isManagerMode = useIsManagedAccount()
  const initialTab = useBuySellInitialTab()

  const handleBuy = useCallback(() => {
    navigation.navigate('BuySell', {
      initialTab,
      coinTicker
    })
  }, [navigation, initialTab, coinTicker])

  const handleReceive = useCallback(() => {
    dispatch(receiveTokensModalActions.open({ mint, isOpen: true }))
  }, [dispatch, mint])

  return (
    <Flex column gap='l' w='100%'>
      <Paper
        column
        backgroundColor='surface2'
        shadow='flat'
        border='strong'
        ph='xl'
        pv='l'
        gap='xs'
      >
        <Text variant='heading' size='s'>
          {messages.becomeAMember}
        </Text>
        <Text>{messages.hintDescription(ticker)}</Text>
      </Paper>
      <Flex column gap='s'>
        <Button
          disabled={isManagerMode}
          variant='primary'
          fullWidth
          onPress={handleBuy}
        >
          {walletMessages.buy}
        </Button>
        <Button variant='secondary' fullWidth onPress={handleReceive}>
          {walletMessages.receive}
        </Button>
      </Flex>
    </Flex>
  )
}

const CoinPill = ({
  mint,
  onPress
}: {
  mint: string
  onPress: () => void
}) => {
  const { data: coin } = useArtistCoin(mint)
  if (!coin) return null

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Paper
        row
        alignItems='center'
        gap='s'
        ph='l'
        pv='s'
        borderRadius='l'
        border='default'
        shadow='flat'
      >
        <TokenIcon logoURI={coin.logoUri} size={24} />
        <Flex row alignItems='center' gap='xs' flex={1}>
          <Text variant='label' size='xs' color='subdued'>
            {messages.poweredBy}
          </Text>
          <Text variant='title' size='m'>
            {coin.name}
          </Text>
        </Flex>
        <IconCaretRight size='s' color='subdued' />
      </Paper>
    </TouchableOpacity>
  )
}

export const FanClubTab = ({ mint }: FanClubTabProps) => {
  const { data: coin } = useArtistCoin(mint)
  const { data: currentUserId } = useCurrentUserId()
  const { data: tokenBalance } = useCoinBalance({ mint })
  const navigation = useNavigation()

  const isOwner = currentUserId === coin?.ownerId
  const hasBalance =
    tokenBalance?.balance && Number(tokenBalance.balance.toString()) > 0

  const handleCoinPillPress = useCallback(() => {
    // This will be handled by the parent to switch to Coin tab
    // For now, navigate to the coin details
  }, [])

  const handleUploadExclusive = useCallback(() => {
    navigation.navigate('Upload', {})
  }, [navigation])

  if (!coin) return null

  const ticker = coin.ticker ?? ''

  return (
    <Flex column gap='l' w='100%'>
      {/* Banner */}
      <BannerSection mint={mint} />

      {/* Coin Pill */}
      <Flex ph='l'>
        <CoinPill mint={mint} onPress={handleCoinPillPress} />
      </Flex>

      {/* Description */}
      {coin.description ? (
        <Flex ph='l'>
          <Text variant='body' size='m'>
            {coin.description}
          </Text>
        </Flex>
      ) : null}

      {/* Upload Exclusive Track - Artist only */}
      {isOwner ? (
        <Flex ph='l'>
          <Button
            variant='secondary'
            fullWidth
            iconLeft={IconCloudUpload}
            onPress={handleUploadExclusive}
          >
            {messages.uploadExclusiveTrack}
          </Button>
        </Flex>
      ) : null}

      {/* Become a Member - Non-holder only */}
      {!isOwner && !hasBalance ? (
        <Flex ph='l'>
          <BecomeAMemberCard
            ticker={ticker}
            mint={mint}
            coinTicker={coin.ticker}
          />
        </Flex>
      ) : null}

      {/* Members Leaderboard - for holders and owners */}
      {(isOwner || hasBalance) ? (
        <Flex ph='l'>
          <CoinLeaderboardCard mint={mint} />
        </Flex>
      ) : null}

      {/* Fan Club Feed */}
      <Flex ph='l' column gap='m'>
        <ExclusiveTracksSection mint={mint} />
      </Flex>
    </Flex>
  )
}
