import { useCallback, useState } from 'react'

import {
  useArtistCoin,
  useCurrentUserId,
  usePostTextUpdate
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { parseVideoUrl, getVideoThumbnailUrl } from '@audius/common/utils'
import {
  Checkbox,
  Flex,
  IconClose,
  IconPlay,
  Paper,
  PlainButton,
  Text
} from '@audius/harmony'

import { ComposerInput } from 'components/composer-input/ComposerInput'

import { AttachVideoModal } from './AttachVideoModal'

const messages = {
  postUpdate: 'Post Update',
  placeholder: 'Update your fans',
  membersOnly: 'Members Only',
  attachVideo: '+ Attach Video'
}

type PostUpdateCardProps = {
  mint: string
}

export const PostUpdateCard = ({ mint }: PostUpdateCardProps) => {
  const [messageId, setMessageId] = useState(0)
  const [isMembersOnly, setIsMembersOnly] = useState(true)
  const [videoUrl, setVideoUrl] = useState<string | undefined>()
  const [showAttachVideoModal, setShowAttachVideoModal] = useState(false)
  const { data: currentUserId } = useCurrentUserId()
  const { data: coin } = useArtistCoin(mint)
  const { mutate: postTextUpdate, isPending } = usePostTextUpdate()
  const { isEnabled: isTextPostPostingEnabled } = useFeatureFlag(
    FeatureFlags.FAN_CLUB_TEXT_POST_POSTING
  )

  const isOwner = currentUserId != null && coin?.ownerId === currentUserId

  const parsedVideo = videoUrl ? parseVideoUrl(videoUrl) : null
  const thumbnailUrl = parsedVideo ? getVideoThumbnailUrl(parsedVideo) : null

  const handleSubmit = useCallback(
    (value: string) => {
      if (!value.trim() || !currentUserId || !coin?.ownerId) return

      postTextUpdate({
        userId: currentUserId,
        entityId: coin.ownerId,
        body: value.trim(),
        mint,
        isMembersOnly,
        videoUrl
      })
      setMessageId((prev) => prev + 1)
      setVideoUrl(undefined)
    },
    [
      currentUserId,
      coin?.ownerId,
      mint,
      postTextUpdate,
      isMembersOnly,
      videoUrl
    ]
  )

  if (!isOwner || !isTextPostPostingEnabled) return null

  return (
    <Paper
      column
      p='xl'
      border='strong'
      borderRadius='l'
      shadow='mid'
      css={{ overflow: 'hidden' }}
    >
      <Flex column gap='l'>
        <Text variant='heading' size='s'>
          {messages.postUpdate}
        </Text>

        <ComposerInput
          messageId={messageId}
          placeholder={messages.placeholder}
          onSubmit={(value) => handleSubmit(value)}
          maxLength={2000}
          disabled={isPending}
          blurOnSubmit
        />

        <Flex row alignItems='center' justifyContent='space-between'>
          <Flex row alignItems='center' gap='m'>
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
                variant='default'
                onClick={() => setShowAttachVideoModal(true)}
              >
                {messages.attachVideo}
              </PlainButton>
            )}
          </Flex>
          <Flex row alignItems='center' gap='s'>
            <Text variant='label' size='s'>
              {messages.membersOnly}
            </Text>
            <Checkbox
              checked={isMembersOnly}
              onChange={() => setIsMembersOnly((prev) => !prev)}
            />
          </Flex>
        </Flex>
      </Flex>

      <AttachVideoModal
        isOpen={showAttachVideoModal}
        onClose={() => setShowAttachVideoModal(false)}
        onAttach={(url) => setVideoUrl(url)}
      />
    </Paper>
  )
}
