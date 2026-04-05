import { useCallback, useMemo } from 'react'

import {
  useArtistCoin,
  useCoinBalance,
  useCurrentUserId,
  useFanClubFeed
} from '@audius/common/api'
import {
  useBuySellInitialTab,
  useIsManagedAccount,
  useToggleTrack
} from '@audius/common/hooks'
import { coinDetailsMessages, walletMessages } from '@audius/common/messages'
import { Kind, WidthSizes } from '@audius/common/models'
import type { ID } from '@audius/common/models'
import { QueueSource, receiveTokensModalActions } from '@audius/common/store'
import { makeUid } from '@audius/common/utils'
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useDispatch } from 'react-redux'

import {
  Button,
  Flex,
  IconCaretRight,
  IconCloudUpload,
  LoadingSpinner,
  Paper,
  Text,
  spacing as harmonySpacing
} from '@audius/harmony-native'
import { ProfilePicture, TokenIcon } from 'app/components/core'
import { useCoverPhoto } from 'app/components/image/CoverPhoto'
import { primitiveToImageSource } from 'app/components/image/primitiveToImageSource'
import { TrackTile } from 'app/components/lineup-tile'
import { LineupTileSource } from 'app/components/lineup-tile/types'
import { UserLink } from 'app/components/user-link'
import { useNavigation } from 'app/hooks/useNavigation'
import { useThemeColors } from 'app/utils/theme'

import { CoinLeaderboardCard } from './CoinLeaderboardCard'
import { PostUpdateCard } from './PostUpdateCard'
import { TextPostCard } from './TextPostCard'

const FAN_CLUB_COVER_HEIGHT = 96
const FAN_CLUB_AVATAR_OVERLAP = -harmonySpacing.unit9
const FEED_PAGE_SIZE = 10

const messages = {
  uploadExclusiveTrack: coinDetailsMessages.coinInfo.uploadExclusiveTrack,
  becomeAMember: coinDetailsMessages.balance.becomeAMember,
  hintDescription: coinDetailsMessages.balance.hintDescription,
  title: 'Fan Club Feed',
  loadMore: 'Load More'
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

type FanClubHeroTileProps = {
  mint: string
  onPoweredByPress: () => void
}

const FanClubHeroTile = ({ mint, onPoweredByPress }: FanClubHeroTileProps) => {
  const { borderDefault } = useThemeColors()
  const { data: coin, isLoading } = useArtistCoin(mint)
  const ownerId = coin?.ownerId

  const { source: coverPhotoSource } = useCoverPhoto({
    userId: ownerId,
    size: WidthSizes.SIZE_640
  })

  const bannerImageSource = useMemo(() => {
    if (coin?.bannerImageUrl) {
      return primitiveToImageSource(coin.bannerImageUrl)
    }
    return coverPhotoSource
  }, [coin?.bannerImageUrl, coverPhotoSource])

  if (isLoading || !coin || !ownerId) {
    return null
  }

  const fanClubLabel = walletMessages.artistCoins.fanClubLabel

  return (
    <Paper
      column
      w='100%'
      borderRadius='l'
      shadow='mid'
      border='default'
      style={{ overflow: 'hidden' }}
    >
      <View
        style={{
          height: FAN_CLUB_COVER_HEIGHT,
          width: '100%',
          borderBottomWidth: 1,
          borderBottomColor: borderDefault,
          overflow: 'hidden'
        }}
      >
        {bannerImageSource ? (
          <Image
            source={bannerImageSource}
            style={StyleSheet.absoluteFillObject}
            resizeMode='cover'
          />
        ) : null}
      </View>

      <Flex
        column
        gap='l'
        ph='l'
        pb='l'
        pt='l'
        style={{ marginTop: FAN_CLUB_AVATAR_OVERLAP }}
      >
        <Flex row gap='s' alignItems='flex-end' w='100%'>
          <ProfilePicture userId={ownerId} size='large' />
          <Flex column gap='2xs' flex={1} style={{ minWidth: 0 }}>
            <Text
              variant='label'
              size='s'
              color='subdued'
              style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              {fanClubLabel}
            </Text>
            <UserLink userId={ownerId} size='l' mint={mint} />
          </Flex>
        </Flex>

        <TouchableOpacity onPress={onPoweredByPress} activeOpacity={0.7}>
          <Paper
            backgroundColor='surface1'
            border='default'
            borderRadius='m'
            ph='l'
            pv='m'
            row
            alignItems='center'
            gap='m'
            w='100%'
          >
            <TokenIcon logoURI={coin.logoUri} size='xl' />
            <Flex column gap='xs' flex={1} style={{ minWidth: 0 }}>
              <Text variant='label' size='s' color='subdued'>
                {walletMessages.poweredBy}
              </Text>
              <Text variant='heading' size='s' numberOfLines={1}>
                {coin.ticker ?? coin.name}
              </Text>
            </Flex>
            <IconCaretRight size='s' color='subdued' />
          </Paper>
        </TouchableOpacity>

        {coin.description ? (
          <Text variant='body' size='m'>
            {coin.description}
          </Text>
        ) : null}
      </Flex>
    </Paper>
  )
}

const FeedTrackTile = ({
  trackId,
  index
}: {
  trackId: ID
  index: number
}) => {
  const uid = useMemo(() => makeUid(Kind.TRACKS, trackId), [trackId])

  const { togglePlay } = useToggleTrack({
    id: trackId,
    uid,
    source: QueueSource.FAN_CLUB_FEED
  })

  return (
    <TrackTile
      id={trackId}
      uid={uid}
      index={index}
      togglePlay={togglePlay}
      isTrending={false}
      source={LineupTileSource.LINEUP_TRACK}
      style={{ paddingHorizontal: 0 }}
    />
  )
}

const FanClubFeed = ({ mint }: { mint: string }) => {
  const {
    data: feedItems,
    isPending,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useFanClubFeed({
    mint,
    sortMethod: 'newest',
    pageSize: FEED_PAGE_SIZE,
    enabled: !!mint
  })

  const hasContent = feedItems && feedItems.length > 0

  if (!hasContent && !isPending) {
    return null
  }

  let trackIndex = 0

  return (
    <Flex column w='100%' gap='m'>
      <Flex row alignItems='center' gap='xs' pb='s'>
        <Text variant='heading' size='s'>
          {messages.title}
        </Text>
      </Flex>

      <PostUpdateCard mint={mint} />

      {isPending ? (
        <Flex justifyContent='center' pv='l'>
          <LoadingSpinner />
        </Flex>
      ) : (
        <Flex column gap='m'>
          {feedItems?.map((item) => {
            if (item.itemType === 'text_post') {
              return (
                <TextPostCard
                  key={`post-${item.commentId}`}
                  commentId={item.commentId}
                  mint={mint}
                />
              )
            }

            const currentTrackIndex = trackIndex++
            return (
              <FeedTrackTile
                key={`track-${item.trackId}`}
                trackId={item.trackId}
                index={currentTrackIndex}
              />
            )
          })}

          {hasNextPage ? (
            <Flex justifyContent='center' pb='m'>
              <Button
                variant='secondary'
                size='small'
                fullWidth
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <LoadingSpinner />
                ) : (
                  messages.loadMore
                )}
              </Button>
            </Flex>
          ) : null}
        </Flex>
      )}
    </Flex>
  )
}

export const FanClubTab = ({ mint, onSwitchToCoinTab }: FanClubTabProps) => {
  const { data: coin } = useArtistCoin(mint)
  const { data: currentUserId, isPending: isCurrentUserPending } =
    useCurrentUserId()
  const { data: tokenBalance, isPending: isBalancePending } = useCoinBalance({
    mint
  })
  const navigation = useNavigation()

  const isOwner =
    !isCurrentUserPending &&
    currentUserId != null &&
    coin != null &&
    currentUserId === coin.ownerId

  const hasBalance =
    !isBalancePending &&
    !!(tokenBalance?.balance && Number(tokenBalance.balance.toString()) > 0)

  const membershipKnown =
    coin != null && !isCurrentUserPending && (isOwner || !isBalancePending)

  const isMemberOrOwner = isOwner || hasBalance

  const handleUploadExclusive = useCallback(() => {
    navigation.navigate('Upload', {})
  }, [navigation])

  if (!coin) return null

  const ticker = coin.ticker ?? ''

  return (
    <Flex column gap='l' w='100%' ph='l'>
      <FanClubHeroTile mint={mint} onPoweredByPress={onSwitchToCoinTab} />

      {/* Upload Exclusive Track - Artist only */}
      {isOwner ? (
        <Button
          variant='secondary'
          fullWidth
          iconLeft={IconCloudUpload}
          onPress={handleUploadExclusive}
        >
          {messages.uploadExclusiveTrack}
        </Button>
      ) : null}

      {/* Membership CTA / leaderboard: wait until account + balance are known to avoid CLS */}
      {!membershipKnown ? (
        <Paper
          column
          backgroundColor='surface2'
          border='strong'
          borderRadius='l'
          shadow='flat'
          alignItems='center'
          justifyContent='center'
          pv='2xl'
          w='100%'
        >
          <LoadingSpinner />
        </Paper>
      ) : !isMemberOrOwner ? (
        <BecomeAMemberCard
          ticker={ticker}
          mint={mint}
          coinTicker={coin.ticker}
        />
      ) : null}

      {membershipKnown && isMemberOrOwner ? (
        <CoinLeaderboardCard mint={mint} />
      ) : null}

      {membershipKnown ? <FanClubFeed mint={mint} /> : null}
    </Flex>
  )
}
