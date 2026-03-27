import { useCallback } from 'react'

import {
  useArtistCoin,
  useCoinBalance,
  useCurrentUserId,
  useExclusiveTracks,
  useExclusiveTracksCount
} from '@audius/common/api'
import {
  useBuySellInitialTab,
  useIsManagedAccount
} from '@audius/common/hooks'
import { coinDetailsMessages, walletMessages } from '@audius/common/messages'
import {
  exclusiveTracksPageLineupActions as exclusiveTracksActions,
  receiveTokensModalActions
} from '@audius/common/store'
import { TouchableOpacity } from 'react-native'
import { useDispatch } from 'react-redux'

import {
  Button,
  Flex,
  IconCaretRight,
  IconCloudUpload,
  Paper,
  Text
} from '@audius/harmony-native'
import { TokenIcon } from 'app/components/core'
import { TanQueryLineup } from 'app/components/lineup/TanQueryLineup'
import { useNavigation } from 'app/hooks/useNavigation'

import { BannerSection } from './CoinInfoCard'
import { CoinLeaderboardCard } from './CoinLeaderboardCard'

const messages = {
  poweredBy: 'POWERED BY',
  uploadExclusiveTrack: coinDetailsMessages.coinInfo.uploadExclusiveTrack,
  becomeAMember: coinDetailsMessages.balance.becomeAMember,
  hintDescription: coinDetailsMessages.balance.hintDescription,
  fanClubFeed: 'Fan Club Feed'
}

const MAX_PREVIEW_TRACKS = 3

const itemStyles = {
  paddingHorizontal: 0
}

type FanClubTabProps = {
  mint: string
  onSwitchToCoinTab: () => void
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

const FanClubFeed = ({ mint }: { mint: string }) => {
  const { data: coin } = useArtistCoin(mint)
  const ownerId = coin?.ownerId

  const { data, lineup, pageSize, isFetching, loadNextPage, isPending } =
    useExclusiveTracks({
      userId: ownerId,
      pageSize: MAX_PREVIEW_TRACKS
    })

  const { data: totalCount = 0 } = useExclusiveTracksCount({
    userId: ownerId
  })

  const shouldShowCard = totalCount > 0 && ownerId
  if (!shouldShowCard) return null

  return (
    <Flex column w='100%'>
      <Flex row alignItems='center' gap='xs' pb='s'>
        <Text variant='heading' size='s'>
          {messages.fanClubFeed}
        </Text>
        {totalCount > 0 ? (
          <Text variant='heading' size='s' color='subdued'>
            ({totalCount})
          </Text>
        ) : null}
      </Flex>
      <TanQueryLineup
        actions={exclusiveTracksActions}
        lineup={lineup}
        offset={0}
        maxEntries={MAX_PREVIEW_TRACKS}
        pageSize={pageSize}
        includeLineupStatus
        itemStyles={itemStyles}
        isFetching={isFetching}
        loadNextPage={loadNextPage}
        hasMore={false}
        isPending={isPending}
        queryData={data}
        hidePlayBarChin
      />
    </Flex>
  )
}

export const FanClubTab = ({ mint, onSwitchToCoinTab }: FanClubTabProps) => {
  const { data: coin } = useArtistCoin(mint)
  const { data: currentUserId } = useCurrentUserId()
  const { data: tokenBalance } = useCoinBalance({ mint })
  const navigation = useNavigation()

  const isOwner = currentUserId === coin?.ownerId
  const hasBalance =
    tokenBalance?.balance && Number(tokenBalance.balance.toString()) > 0

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
        <CoinPill mint={mint} onPress={onSwitchToCoinTab} />
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
      {isOwner || hasBalance ? (
        <Flex ph='l'>
          <CoinLeaderboardCard mint={mint} />
        </Flex>
      ) : null}

      {/* Fan Club Feed */}
      <Flex ph='l'>
        <FanClubFeed mint={mint} />
      </Flex>
    </Flex>
  )
}
