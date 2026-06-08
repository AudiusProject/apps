import { useCallback, useState } from 'react'

import { useCurrentUserId, usePostEventComment } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { getVideoThumbnailUrl, parseVideoUrl } from '@audius/common/utils'
import {
  Avatar as HarmonyAvatar,
  Box,
  Flex,
  IconClose,
  IconPlay,
  Paper,
  PlainButton
} from '@audius/harmony'
import { EntityType } from '@audius/sdk'

import { ComposerInput } from 'components/composer-input/ComposerInput'
import { useProfilePicture } from 'hooks/useProfilePicture'

import { AttachVideoModal } from '../../fan-club-detail-page/components/AttachVideoModal'

const messages = {
  placeholder: 'Update your fans',
  attachVideo: '+ Attach Video'
}

type PostUpdateComposerProps = {
  eventId: ID
  eventOwnerUserId: ID | undefined
}

/**
 * Standalone POST UPDATE composer card for the contest host. Renders only
 * for the event owner. Posts a top-level comment with `videoUrl` when
 * Attach Video is filled in — these top-level host posts are surfaced
 * elsewhere as the "Updates" feed (see ContestCommentsTile mode='updates').
 *
 * Use this on tabs / surfaces where the host should be able to compose an
 * update without also rendering the historical updates feed in-place
 * (e.g. mobile Details tab, where the Updates tab already owns the feed).
 */
export const PostUpdateComposer = ({
  eventId,
  eventOwnerUserId
}: PostUpdateComposerProps) => {
  const { data: currentUserId } = useCurrentUserId()
  const isEventOwner =
    currentUserId !== null &&
    eventOwnerUserId !== undefined &&
    currentUserId === eventOwnerUserId

  const { mutate: postComment, isPending: isPosting } = usePostEventComment()

  const [videoUrl, setVideoUrl] = useState<string | undefined>()
  const [showAttachVideoModal, setShowAttachVideoModal] = useState(false)
  const [messageId, setMessageId] = useState(0)

  const handleSubmit = useCallback(
    (value: string) => {
      const body = value.trim()
      if (!body || !currentUserId) return
      postComment({
        userId: currentUserId,
        eventId,
        body,
        videoUrl: videoUrl && videoUrl.trim().length > 0 ? videoUrl : undefined
      })
      setVideoUrl(undefined)
      setMessageId((prev) => prev + 1)
    },
    [currentUserId, eventId, postComment, videoUrl]
  )

  const profileImage = useProfilePicture({
    userId: currentUserId ?? undefined,
    size: SquareSizes.SIZE_150_BY_150
  })

  if (!isEventOwner) return null

  const parsedVideo = videoUrl ? parseVideoUrl(videoUrl) : null
  const thumbnailUrl = parsedVideo ? getVideoThumbnailUrl(parsedVideo) : null

  return (
    <Paper
      w='100%'
      direction='column'
      gap='m'
      p='l'
      borderRadius='m'
      border='default'
      backgroundColor='white'
      shadow='flat'
    >
      <Flex w='100%' gap='s' alignItems='center'>
        <HarmonyAvatar
          size='auto'
          borderWidth='thin'
          isLoading={false}
          src={profileImage}
          css={{ width: 32, height: 32, flexShrink: 0 }}
        />
        <Box css={{ flex: 1, minWidth: 0 }}>
          <ComposerInput
            messageId={messageId}
            entityId={eventId}
            entityType={EntityType.EVENT}
            placeholder={messages.placeholder}
            maxLength={400}
            maxMentions={10}
            onSubmit={(value) => handleSubmit(value)}
            disabled={isPosting}
            blurOnSubmit
          />
        </Box>
      </Flex>

      <Flex direction='row' alignItems='center' gap='m'>
        {videoUrl && parsedVideo ? (
          <Flex
            css={(theme) => ({
              position: 'relative',
              width: 102,
              height: 56,
              borderRadius: theme.cornerRadius.s,
              overflow: 'hidden',
              backgroundColor: theme.color.neutral.n800,
              cursor: 'pointer'
            })}
          >
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt=''
                css={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : null}
            <Flex
              alignItems='center'
              justifyContent='center'
              css={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.3)'
              }}
            >
              <IconPlay size='l' color='staticWhite' />
            </Flex>
            <Flex
              alignItems='center'
              justifyContent='center'
              onClick={() => setVideoUrl(undefined)}
              css={(theme) => ({
                position: 'absolute',
                top: 4,
                left: 4,
                width: 24,
                height: 24,
                borderRadius: theme.cornerRadius.circle,
                backgroundColor: 'rgba(0,0,0,0.5)',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.7)'
                }
              })}
            >
              <IconClose size='xs' color='staticWhite' />
            </Flex>
          </Flex>
        ) : (
          <PlainButton
            type='button'
            variant='subdued'
            onClick={() => setShowAttachVideoModal(true)}
          >
            {messages.attachVideo}
          </PlainButton>
        )}
      </Flex>

      <AttachVideoModal
        isOpen={showAttachVideoModal}
        onClose={() => setShowAttachVideoModal(false)}
        onAttach={(url) => setVideoUrl(url)}
      />
    </Paper>
  )
}
