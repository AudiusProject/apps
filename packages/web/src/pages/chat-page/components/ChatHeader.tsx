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
  Flex,
  Text,
  IconMessages
} from '@audius/harmony'
import { useSelector } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'

import { ChatBlastHeader } from './ChatBlastHeader'
import { UserChatHeader } from './UserChatHeader'

const messages = {
  header: 'Messages',
  settings: 'Settings',
  compose: 'Compose'
}

const CHAT_HEADER_PADDING_PX = 20
const CHAT_LIST_WIDTH_PX = 400

type ChatHeaderProps = {
  currentChatId?: string
  isNarrowLayout?: boolean
  scrollBarWidth?: number
  headerContainerRef?: React.RefObject<HTMLDivElement | null>
}

export const ChatHeader = forwardRef<HTMLDivElement, ChatHeaderProps>(
  ({ currentChatId, isNarrowLayout }, ref) => {
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

    const headerContent = (
      <Flex p='l' alignItems='center' gap='m'>
        <IconMessages size='2xl' color='heading' />
        <Text variant='heading' strength='default' size='l' color='heading'>
          {messages.header}
        </Text>
        <Flex gap='m' css={{ marginLeft: 'auto' }}>
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
      </Flex>
    )

    return (
      <Flex
        ref={ref}
        w='100%'
        h={112}
        ph={CHAT_HEADER_PADDING_PX}
        css={{ minWidth: 0, borderRadius: 0 }}
        borderBottom='default'
      >
        <Flex
          w={isNarrowLayout ? '100%' : CHAT_LIST_WIDTH_PX}
          css={{ flexShrink: 0 }}
        >
          {headerContent}
        </Flex>
        {isNarrowLayout ? null : (
          <Flex p='l' flex={1} alignItems='center' css={{ minWidth: 0 }}>
            {chat ? (
              isBlast ? (
                <ChatBlastHeader chat={chat} />
              ) : (
                <UserChatHeader chatId={chat.chat_id} />
              )
            ) : null}
          </Flex>
        )}
      </Flex>
    )
  }
)
