import { useCallback, useState } from 'react'

import {
  useArtistCoin,
  useCurrentUserId,
  usePostTextUpdate
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { Flex, Paper, Text } from '@audius/harmony-native'
import { ComposerInput } from 'app/components/composer-input'

const messages = {
  postUpdate: 'Post Update',
  placeholder: 'Update your fans',
  membersOnly: 'Members Only'
}

type PostUpdateCardProps = {
  mint: string
}

export const PostUpdateCard = ({ mint }: PostUpdateCardProps) => {
  const [messageId, setMessageId] = useState(0)
  const { data: currentUserId } = useCurrentUserId()
  const { data: coin } = useArtistCoin(mint)
  const { mutate: postTextUpdate } = usePostTextUpdate()
  const { isEnabled: isTextPostPostingEnabled } = useFeatureFlag(
    FeatureFlags.FAN_CLUB_TEXT_POST_POSTING
  )

  const isOwner = currentUserId != null && coin?.ownerId === currentUserId

  const handleSubmit = useCallback(
    (value: string) => {
      if (!value.trim() || !currentUserId || !coin?.ownerId) return

      postTextUpdate({
        userId: currentUserId,
        entityId: coin.ownerId,
        body: value.trim(),
        mint
      })
      setMessageId((prev) => prev + 1)
    },
    [currentUserId, coin?.ownerId, mint, postTextUpdate]
  )

  if (!isOwner || !isTextPostPostingEnabled) return null

  return (
    <Paper
      column
      ph='xl'
      pv='xl'
      border='strong'
      borderRadius='l'
      shadow='mid'
      style={{ overflow: 'hidden' }}
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
        />

        <Flex row alignItems='center' justifyContent='flex-end' gap='s'>
          <Text variant='label' size='s'>
            {messages.membersOnly}
          </Text>
        </Flex>
      </Flex>
    </Paper>
  )
}
