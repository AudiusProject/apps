import { forwardRef, useCallback } from 'react'

import {
  chatSelectors,
  CommonState,
  useCreateChatModal
} from '@audius/common/store'
import {
  IconCompose,
  IconSettings,
  IconButton,
  Paper,
  Flex,
  Text,
  IconMessages
} from '@audius/harmony'
import { useSelector } from 'react-redux'
import { useMedia } from 'react-use'

import { useModalState } from 'common/hooks/useModalState'

import { ChatBlastHeader } from './ChatBlastHeader'
import { UserChatHeader } from './UserChatHeader'

const messages = {
  header: 'Messages',
  settings: 'Settings',
  compose: 'Compose'
}

type ChatHeaderProps = {
  currentChatId?: string
  scrollBarWidth?: number
  headerContainerRef?: React.RefObject<HTMLDivElement>
}

export const ChatHeader = forwardRef<HTMLDivElement, ChatHeaderProps>(
  ({ currentChatId, scrollBarWidth, headerContainerRef }, ref) => {
    const { onOpen: openCreateChatModal } = useCreateChatModal()
    const [, setInboxSettingsVisible] = useModalState('InboxSettings')
    const chat = useSelector((state: CommonState) =>
      chatSelectors.getChat(state, currentChatId ?? '')
    )
    const isBlast = chat?.is_blast

    const handleComposeClicked = useCallback(() => {
      openCreateChatModal()
    }, [openCreateChatModal])

    const handleSettingsClicked = useCallback(() => {
      setInboxSettingsVisible(true)
    }, [setInboxSettingsVisible])

    const isSmallScreen = useMedia('(max-width: 1080px)')

    const headerContent = (
      <Flex p='l' alignItems='flex-end' gap='m'>
        <IconMessages size='2xl' color='heading' />
        <Text variant='heading' strength='default' size='l' color='heading'>
          {messages.header}
        </Text>
        <IconButton
          aria-label={messages.settings}
          icon={IconSettings}
          onClick={handleSettingsClicked}
        />
        <IconButton
          aria-label={messages.compose}
          icon={IconCompose}
          onClick={handleComposeClicked}
        />
      </Flex>
    )

    return (
      <Paper shadow='flat' ref={ref} ph={20} mh={-80} h={112}>
        <Flex w={isSmallScreen ? 96 : 400} borderRight='default'>
          {isSmallScreen ? null : headerContent}
        </Flex>
        {isSmallScreen ? headerContent : null}
        <Flex p='l' flex={1} alignItems='flex-end'>
          {isBlast ? (
            <ChatBlastHeader chat={chat} />
          ) : (
            <UserChatHeader chatId={chat?.chat_id} />
          )}
        </Flex>
      </Paper>
    )
  }
)
