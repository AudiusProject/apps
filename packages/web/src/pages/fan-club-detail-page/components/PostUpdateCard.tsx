import { useCallback, useState } from 'react'

import {
  useArtistCoin,
  useCurrentUserId,
  usePostTextUpdate
} from '@audius/common/api'
import { Checkbox, Flex, Paper, Text } from '@audius/harmony'

import { ComposerInput } from 'components/composer-input/ComposerInput'

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
  const { mutate: postTextUpdate, isPending } = usePostTextUpdate()

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

  if (!isOwner) return null

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

        <Flex row alignItems='center' justifyContent='flex-end' gap='s'>
          <Text variant='label' size='s'>
            {messages.membersOnly}
          </Text>
          <Checkbox checked disabled />
        </Flex>
      </Flex>
    </Paper>
  )
}
