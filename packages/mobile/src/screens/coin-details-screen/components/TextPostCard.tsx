import { useComment } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { getLargestTimeUnitText } from '@audius/common/utils'

import {
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
  locked: 'Hold this coin to unlock'
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
      ) : (
        <Text variant='body' size='m'>
          {comment.message}
        </Text>
      )}
    </Paper>
  )
}
