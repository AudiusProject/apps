import { useCallback, useState } from 'react'

import { useArtistCoin, useComment } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { getLargestTimeUnitText } from '@audius/common/utils'
import { TouchableOpacity } from 'react-native'

import {
  Button,
  Flex,
  IconLock,
  Paper,
  Skeleton,
  Text,
  useTheme
} from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import { UserLink } from 'app/components/user-link'
import { useNavigation } from 'app/hooks/useNavigation'

const messages = {
  locked: 'Hold this coin to unlock',
  howToUnlock: 'How To Unlock',
  description: 'To unlock this post, you need to hold',
  buyCoins: 'Buy Coins'
}

type TextPostCardProps = {
  commentId: ID
  mint: string
}

export const TextPostCard = ({ commentId, mint }: TextPostCardProps) => {
  const { data: comment, isPending } = useComment(commentId)
  const { data: coin } = useArtistCoin(mint)
  const { color, spacing, cornerRadius } = useTheme()
  const navigation = useNavigation()
  const [showUnlock, setShowUnlock] = useState(false)

  const handleBuyCoins = useCallback(() => {
    if (coin?.ticker) {
      navigation.navigate('BuySell', {
        initialTab: 'buy',
        coinTicker: coin.ticker
      })
      setShowUnlock(false)
    }
  }, [coin?.ticker, navigation])

  if (isPending) {
    return (
      <Paper
        column
        gap='m'
        ph='l'
        pv='l'
        border='default'
        borderRadius='m'
        shadow='flat'
      >
        <Flex row gap='s' alignItems='center'>
          <Skeleton w={32} h={32} style={{ borderRadius: 16 }} />
          <Skeleton w={120} h={16} />
        </Flex>
        <Skeleton w='100%' h={40} />
      </Paper>
    )
  }

  if (!comment) return null

  const isLocked = comment.message === null

  return (
    <Paper
      column
      gap='m'
      ph='l'
      pv='l'
      border='default'
      borderRadius='m'
      shadow='flat'
    >
      <Flex row gap='s' alignItems='center'>
        {comment.userId ? (
          <ProfilePicture userId={comment.userId} size='small' />
        ) : null}
        <Flex column>
          {comment.userId ? (
            <UserLink userId={comment.userId} size='s' />
          ) : null}
          {comment.createdAt ? (
            <Text variant='body' size='xs' color='subdued'>
              {getLargestTimeUnitText(new Date(comment.createdAt))}
            </Text>
          ) : null}
        </Flex>
      </Flex>

      {isLocked ? (
        <Flex column gap='m'>
          <TouchableOpacity
            onPress={() => setShowUnlock(true)}
            activeOpacity={0.7}
          >
            <Flex
              row
              alignItems='center'
              gap='s'
              style={{
                padding: spacing.m,
                borderRadius: cornerRadius.s,
                backgroundColor: color.background.surface2
              }}
            >
              <IconLock size='s' color='subdued' />
              <Text variant='body' size='s' color='subdued'>
                {messages.locked}
              </Text>
            </Flex>
          </TouchableOpacity>
          {showUnlock ? (
            <Flex
              column
              gap='m'
              style={{
                padding: spacing.l,
                borderRadius: cornerRadius.m,
                backgroundColor: color.background.surface1
              }}
            >
              <Flex row alignItems='center' gap='s'>
                <IconLock size='s' color='default' />
                <Text variant='label' size='m'>
                  {messages.howToUnlock}
                </Text>
              </Flex>
              <Text variant='body' size='m'>
                {messages.description}{' '}
                <Text variant='body' size='m' strength='strong'>
                  {coin?.ticker ? `$${coin.ticker}` : "the artist's coins"}
                </Text>
                .
              </Text>
              <Button
                variant='primary'
                color='coinGradient'
                fullWidth
                onPress={handleBuyCoins}
              >
                {messages.buyCoins}
              </Button>
            </Flex>
          ) : null}
        </Flex>
      ) : (
        <Text variant='body' size='m'>
          {comment.message}
        </Text>
      )}
    </Paper>
  )
}
