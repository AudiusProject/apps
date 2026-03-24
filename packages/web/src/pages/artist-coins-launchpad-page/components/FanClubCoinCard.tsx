import { useCallback, type KeyboardEvent } from 'react'

import type { Coin } from '@audius/common/adapters'
import { useUser } from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import { WidthSizes } from '@audius/common/models'
import { formatCount, formatCurrencyWithSubscript } from '@audius/common/utils'
import {
  Box,
  Divider,
  Flex,
  Paper,
  Skeleton,
  Text,
  useTheme
} from '@audius/harmony'

import { Avatar } from 'components/avatar/Avatar'
import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import UserBadges from 'components/user-badges/UserBadges'
import { useCoverPhoto } from 'hooks/useCoverPhoto'

const messages = walletMessages.artistCoins

type FanClubCoinCardProps = {
  coin: Coin
  onPress: () => void
}

export const FanClubCoinCard = ({ coin, onPress }: FanClubCoinCardProps) => {
  const theme = useTheme()
  const { ownerId, bannerImageUrl, ticker, logoUri, displayPrice } = coin

  const { image: ownerCoverPhoto } = useCoverPhoto({
    userId: ownerId,
    size: WidthSizes.SIZE_640
  })
  const bannerSrc =
    bannerImageUrl && bannerImageUrl.trim().length > 0
      ? bannerImageUrl
      : ownerCoverPhoto

  const { data: ownerName } = useUser(ownerId, {
    select: (user) => user?.name
  })

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onPress()
      }
    },
    [onPress]
  )

  const rawPrice =
    (coin.price === 0 ? coin.dynamicBondingCurve?.priceUSD : coin.price) ?? 0
  const formattedPrice = formatCurrencyWithSubscript(displayPrice ?? rawPrice)

  return (
    <Paper
      role='button'
      tabIndex={0}
      onClick={onPress}
      onKeyDown={handleKeyDown}
      border='default'
      borderRadius='l'
      shadow='mid'
      column
      w='100%'
      css={{
        overflow: 'hidden',
        cursor: 'pointer',
        outline: 'none',
        ':focus-visible': {
          boxShadow: `0 0 0 2px ${theme.color.secondary.secondary}`
        }
      }}
    >
      <Box
        w='100%'
        css={{
          height: 96,
          flexShrink: 0,
          borderBottom: `1px solid ${theme.color.border.default}`,
          backgroundColor: theme.color.background.surface2,
          ...(bannerSrc
            ? {
                backgroundImage: `url("${bannerSrc}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }
            : {})
        }}
      />
      <Flex
        column
        gap='l'
        ph='l'
        pb='l'
        pt='l'
        css={{
          marginTop: -theme.spacing.unit9
        }}
      >
        <Flex gap='s' alignItems='flex-end' w='100%' css={{ minWidth: 0 }}>
          <Avatar userId={ownerId} size='large' disableLink />
          <Flex column gap='2xs' flex={1} css={{ minWidth: 0 }}>
            <Text variant='label' size='s' color='subdued'>
              {messages.fanClubLabel}
            </Text>
            <Flex gap='xs' alignItems='center' w='100%' css={{ minWidth: 0 }}>
              <Text variant='title' size='l' ellipses css={{ minWidth: 0 }}>
                {ownerName ?? ''}
              </Text>
              <Flex css={{ flexShrink: 0 }}>
                <UserBadges userId={ownerId} size='m' mint={coin.mint} />
              </Flex>
            </Flex>
          </Flex>
        </Flex>

        <Paper
          backgroundColor='surface1'
          border='default'
          borderRadius='m'
          ph='l'
          pv='m'
          column
          gap='m'
          w='100%'
        >
          <Flex gap='m' alignItems='center' w='100%' css={{ minWidth: 0 }}>
            <TokenIcon logoURI={logoUri} size='xl' hex />
            <Flex column gap='xs' flex={1} css={{ minWidth: 0 }}>
              <Text variant='label' size='s' color='subdued'>
                {walletMessages.poweredBy}
              </Text>
              <Text variant='heading' size='s' ellipses>
                {ticker ?? ''}
              </Text>
            </Flex>
          </Flex>

          <Divider />

          <Flex gap='l' alignItems='flex-start'>
            <Flex column gap='xs' css={{ minWidth: 72 }}>
              <Text variant='label' size='s' color='subdued'>
                {messages.members}
              </Text>
              <Text variant='body' size='m'>
                {formatCount(coin.holder ?? 0)}
              </Text>
            </Flex>
            <Flex column gap='xs' css={{ minWidth: 72 }}>
              <Text variant='label' size='s' color='subdued'>
                {messages.price}
              </Text>
              <Text variant='body' size='m'>
                {formattedPrice}
              </Text>
            </Flex>
          </Flex>
        </Paper>
      </Flex>
    </Paper>
  )
}

export const FanClubCardSkeleton = () => (
  <Paper
    border='default'
    borderRadius='l'
    column
    css={{ overflow: 'hidden' }}
    shadow='mid'
  >
    <Skeleton h={96} w='100%' />
    <Flex column gap='l' p='l'>
      <Flex gap='s' alignItems='flex-end'>
        <Skeleton borderRadius='circle' w={72} h={72} />
        <Flex column gap='xs' flex={1}>
          <Skeleton h={12} w={64} />
          <Skeleton h={24} w='70%' />
        </Flex>
      </Flex>
      <Paper
        border='default'
        borderRadius='m'
        p='m'
        column
        gap='m'
        backgroundColor='surface1'
      >
        <Flex gap='m' alignItems='center'>
          <Skeleton w={40} h={40} />
          <Flex column gap='xs' flex={1}>
            <Skeleton h={12} w={72} />
            <Skeleton h={20} w={40} />
          </Flex>
        </Flex>
        <Skeleton h={1} w='100%' />
        <Flex gap='l'>
          <Flex column gap='xs'>
            <Skeleton h={12} w={56} />
            <Skeleton h={20} w={40} />
          </Flex>
          <Flex column gap='xs'>
            <Skeleton h={12} w={40} />
            <Skeleton h={20} w={64} />
          </Flex>
        </Flex>
      </Paper>
    </Flex>
  </Paper>
)
