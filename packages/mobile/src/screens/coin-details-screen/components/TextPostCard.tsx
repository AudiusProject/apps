import { useCallback } from 'react'

import { useComment } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { getLargestTimeUnitText } from '@audius/common/utils'

import {
  Button,
  Flex,
  IconLock,
  Paper,
  Skeleton,
  Text
} from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import { UserLink } from 'app/components/user-link'
import { useDrawer } from 'app/hooks/useDrawer'

const messages = {
  unlock: 'Unlock',
  membersOnly: 'Members Only'
}

type TextPostCardProps = {
  commentId: ID
  mint: string
}

export const TextPostCard = ({ commentId, mint }: TextPostCardProps) => {
  const { data: comment, isPending } = useComment(commentId)
  const { onOpen: openLockedTextPostDrawer } = useDrawer('LockedTextPost')

  const handleUnlock = useCallback(() => {
    openLockedTextPostDrawer({ mint })
  }, [openLockedTextPostDrawer, mint])

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
        <Flex row alignItems='center' justifyContent='space-between'>
          <Button
            variant='secondary'
            size='small'
            rounded
            onPress={handleUnlock}
            style={{ height: 24 }}
          >
            {messages.unlock}
          </Button>
          <Flex row alignItems='center' gap='xs' onTouchEnd={handleUnlock}>
            <IconLock size='s' color='default' />
            <Text variant='body' size='s' strength='strong'>
              {messages.membersOnly}
            </Text>
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
