import { useCallback } from 'react'

import {
  useComment,
  useCurrentUserId,
  useReactToComment,
  useFanClub
} from '@audius/common/api'
import type { ID } from '@audius/common/models'
import {
  getLargestTimeUnitText,
  parseVideoUrl,
  getVideoEmbedUrl
} from '@audius/common/utils'
import { Pressable, View } from 'react-native'
import WebView from 'react-native-webview'

import {
  Button,
  Flex,
  IconLock,
  Paper,
  Skeleton,
  Text
} from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import { FavoriteButton } from 'app/components/favorite-button'
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
  const { data: currentUserId } = useCurrentUserId()
  const { data: coin } = useFanClub(mint)
  const { mutate: reactToComment } = useReactToComment()
  const { onOpen: openLockedTextPostDrawer } = useDrawer('LockedTextPost')

  const isCoinOwner = currentUserId != null && coin?.ownerId === currentUserId

  const handleReact = useCallback(() => {
    if (!currentUserId || !comment) return
    reactToComment({
      commentId,
      userId: currentUserId,
      isLiked: !comment.isCurrentUserReacted,
      currentSort: 'newest',
      trackId: comment.entityId,
      isEntityOwner: isCoinOwner,
      entityType: 'FanClub'
    })
  }, [currentUserId, comment, commentId, reactToComment, isCoinOwner])

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

  const parsedVideo = comment.videoUrl ? parseVideoUrl(comment.videoUrl) : null
  const videoEmbedUrl = parsedVideo ? getVideoEmbedUrl(parsedVideo) : null

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
        <>
          {parsedVideo ? (
            <Pressable onPress={handleUnlock}>
              <View
                style={{
                  width: '100%',
                  aspectRatio: 331 / 170,
                  borderRadius: 12,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: '#d8dbe2',
                  backgroundColor: '#c7ccd6',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <IconLock size='2xl' color='subdued' />
              </View>
            </Pressable>
          ) : null}
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
            </Flex>
          </Flex>
        </>
      ) : (
        <>
          <Text variant='body' size='m'>
            {comment.message}
          </Text>
          {videoEmbedUrl ? (
            <View
              style={{
                width: '100%',
                aspectRatio: 16 / 9,
                borderRadius: 12,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#d8dbe2',
                backgroundColor: '#1a1a2e'
              }}
            >
              <WebView
                source={{ uri: videoEmbedUrl }}
                style={{ flex: 1 }}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
              />
            </View>
          ) : null}
          <Flex direction='row' alignItems='center' gap='s'>
            {comment.isMembersOnly !== false ? (
              <Flex row alignItems='center' gap='xs'>
                <IconLock size='s' color='subdued' />
                <Text variant='body' size='xs' color='subdued'>
                  {messages.membersOnly}
                </Text>
              </Flex>
            ) : null}
            <FavoriteButton
              onPress={handleReact}
              isActive={comment.isCurrentUserReacted}
              wrapperStyle={{ height: 24, width: 24 }}
            />
            {comment.reactCount > 0 ? (
              <Text variant='body' size='s' strength='default'>
                {comment.reactCount}
              </Text>
            ) : null}
          </Flex>
        </>
      )}
    </Paper>
  )
}
