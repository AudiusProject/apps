import { useComment } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { getLargestTimeUnitText } from '@audius/common/utils'
import { View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

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

const messages = {
  unlock: 'Unlock',
  membersOnly: 'Members Only'
}

/**
 * Generate a deterministic pseudo-random placeholder string for locked posts
 * so each post looks visually distinct behind the blur.
 */
const generatePlaceholder = (commentId: ID) => {
  const seed = Number(commentId)
  const wordCount = 5 + (seed % 21) // 5–25 words
  const words = []
  const pool = 'abcdefghijklmnopqrstuvwxyz'
  for (let i = 0; i < wordCount; i++) {
    const len = 3 + ((seed * (i + 1) * 7) % 8) // 3–10 chars per word
    let word = ''
    for (let j = 0; j < len; j++) {
      word += pool[(seed * (i + 1) * (j + 1) * 13) % pool.length]
    }
    words.push(word)
  }
  return words.join(' ')
}

type TextPostCardProps = {
  commentId: ID
}

export const TextPostCard = ({ commentId }: TextPostCardProps) => {
  const { data: comment, isPending } = useComment(commentId)
  const { color, spacing, cornerRadius } = useTheme()

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
          <View style={{ position: 'relative', overflow: 'hidden' }}>
            <Text
              variant='body'
              size='m'
              style={{ opacity: 0.4 }}
            >
              {generatePlaceholder(commentId)}
            </Text>
            <LinearGradient
              colors={[
                'transparent',
                color.background.white
              ]}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <Flex row alignItems='center' justifyContent='space-between'>
            <Button variant='secondary' size='small'>
              {messages.unlock}
            </Button>
            <Flex row alignItems='center' gap='xs'>
              <IconLock size='s' color='default' />
              <Text variant='body' size='s' strength='strong'>
                {messages.membersOnly}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      ) : (
        <Text variant='body' size='m'>
          {comment.message}
        </Text>
      )}
    </Paper>
  )
}
