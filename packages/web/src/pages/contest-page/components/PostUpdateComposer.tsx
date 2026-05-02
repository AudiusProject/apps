import { useCallback, useState } from 'react'

import { useCurrentUserId, usePostEventComment } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import {
  Avatar as HarmonyAvatar,
  Box,
  Flex,
  IconCamera,
  Paper,
  PlainButton,
  Text,
  TextInput
} from '@audius/harmony'
import { EntityType } from '@audius/sdk'

import { ComposerInput } from 'components/composer-input/ComposerInput'
import { useProfilePicture } from 'hooks/useProfilePicture'

const messages = {
  postUpdate: 'POST UPDATE',
  placeholder: 'Update your fans',
  attachVideo: 'Attach Video',
  videoUrlPlaceholder: 'Paste a YouTube or Vimeo URL'
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

  const [videoUrlOpen, setVideoUrlOpen] = useState(false)
  const [videoUrlDraft, setVideoUrlDraft] = useState('')
  const [messageId, setMessageId] = useState(0)

  const handleSubmit = useCallback(
    (value: string) => {
      const body = value.trim()
      if (!body || !currentUserId) return
      const trimmedVideoUrl = videoUrlDraft.trim()
      postComment({
        userId: currentUserId,
        eventId,
        body,
        videoUrl: trimmedVideoUrl.length > 0 ? trimmedVideoUrl : undefined
      })
      setVideoUrlDraft('')
      setVideoUrlOpen(false)
      setMessageId((prev) => prev + 1)
    },
    [currentUserId, eventId, postComment, videoUrlDraft]
  )

  const profileImage = useProfilePicture({
    userId: currentUserId ?? undefined,
    size: SquareSizes.SIZE_150_BY_150
  })

  if (!isEventOwner) return null

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
      <Text variant='label' size='m' color='subdued'>
        {messages.postUpdate}
      </Text>

      <Flex w='100%' gap='s' alignItems='center'>
        <HarmonyAvatar
          size='auto'
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

      <Flex direction='column' gap='s' w='100%'>
        <PlainButton
          type='button'
          variant='subdued'
          iconLeft={IconCamera}
          onClick={() => setVideoUrlOpen((v) => !v)}
          css={{ alignSelf: 'flex-start' }}
        >
          {messages.attachVideo}
        </PlainButton>
        {videoUrlOpen ? (
          <TextInput
            label=''
            value={videoUrlDraft}
            onChange={(e) => setVideoUrlDraft(e.target.value)}
            placeholder={messages.videoUrlPlaceholder}
          />
        ) : null}
      </Flex>
    </Paper>
  )
}
