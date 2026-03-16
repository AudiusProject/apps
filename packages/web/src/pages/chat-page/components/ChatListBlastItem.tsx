import { useCallback } from 'react'

import { useChatBlastAudienceContent } from '@audius/common/hooks'
import { formatCount } from '@audius/common/utils'
import { Box, Flex, IconTowerBroadcast, IconUser, Text } from '@audius/harmony'
import { ChatBlast } from '@audius/sdk/services'
import cn from 'classnames'

import styles from './ChatListItem.module.css'

const messages = {
  audience: 'AUDIENCE'
}

type ChatListBlastItemProps = {
  chat: ChatBlast
  currentChatId?: string
  onChatClicked: (chatId: string) => void
}

export const ChatListBlastItem = (props: ChatListBlastItemProps) => {
  const { chat, onChatClicked, currentChatId } = props
  const { chat_id: chatId } = chat
  const isCurrentChat = currentChatId && currentChatId === chatId
  const { chatBlastTitle, contentTitle, audienceCount } =
    useChatBlastAudienceContent({
      chat
    })

  const handleClick = useCallback(() => {
    onChatClicked(chatId)
  }, [chatId, onChatClicked])

  return (
    <Flex
      ph='xl'
      pv='l'
      direction='column'
      gap='s'
      borderBottom='default'
      onClick={handleClick}
      className={cn(styles.root, { [styles.active]: isCurrentChat })}
    >
      <Flex row gap='s' w='100%' className={styles.headingContainer}>
        <IconTowerBroadcast size='l' color='default' />
        <Box css={{ flexShrink: 0 }} className={styles.blastPreview}>
          <Text size='l' strength='strong'>
            {chatBlastTitle}
          </Text>
        </Box>
        {contentTitle ? (
          <Text
            size='l'
            color='subdued'
            ellipses
            css={{ display: 'block' }}
            className={styles.blastPreview}
          >
            {contentTitle}
          </Text>
        ) : null}
      </Flex>
      <Flex
        justifyContent='space-between'
        w='100%'
        className={styles.blastPreview}
      >
        <Text variant='label' textTransform='capitalize' color='subdued'>
          {messages.audience}
        </Text>
        {audienceCount ? (
          <Flex gap='xs'>
            <IconUser size='s' color='subdued' />
            <Text variant='label' color='subdued'>
              {formatCount(audienceCount)}
            </Text>
          </Flex>
        ) : null}
      </Flex>
    </Flex>
  )
}
