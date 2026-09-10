import { forwardRef, useCallback } from 'react'

import {
  chatActions,
  chatSelectors,
  CommonState,
  InboxTab,
  useCreateChatModal
} from '@audius/common/store'
import {
  IconCompose,
  IconSettings,
  IconButton,
  Flex,
  Text,
  IconMessages,
  IconCheck,
  IconKebabHorizontal,
  PopupMenu
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import { Frosted } from 'components/frosted/Frosted'

import { ChatBlastHeader } from './ChatBlastHeader'
import { InboxTabs } from './InboxTabs'
import { UserChatHeader } from './UserChatHeader'

const messages = {
  header: 'Messages',
  inboxOptions: 'Inbox Options',
  inboxSettings: 'Inbox Settings',
  compose: 'Compose',
  markAllAsRead: 'Mark All as Read'
}

const CHAT_HEADER_PADDING_PX = 20
const CHAT_LIST_WIDTH_PX = 400

type ChatHeaderProps = {
  currentChatId?: string
  currentTab: InboxTab
  onSelectTab: (tab: InboxTab) => void
  isNarrowLayout?: boolean
  scrollBarWidth?: number
  headerContainerRef?: React.RefObject<HTMLDivElement | null>
}

export const ChatHeader = forwardRef<HTMLDivElement, ChatHeaderProps>(
  ({ currentChatId, currentTab, onSelectTab, isNarrowLayout }, ref) => {
    const dispatch = useDispatch()
    const { onOpen: openCreateChatModal } = useCreateChatModal()
    const [, setInboxSettingsVisible] = useModalState('InboxSettings')
    const chat = useSelector((state: CommonState) =>
      chatSelectors.getChat(state, currentChatId ?? '')
    )
    const unreadMessagesCount = useSelector(
      chatSelectors.getUnreadMessagesCount
    )
    const hasUnread = unreadMessagesCount > 0
    const isBlast = chat?.is_blast

    const handleComposeClicked = useCallback(() => {
      openCreateChatModal()
    }, [openCreateChatModal])

    const handleSettingsClicked = useCallback(() => {
      setInboxSettingsVisible(true)
    }, [setInboxSettingsVisible])

    const handleMarkAllAsReadClicked = useCallback(() => {
      dispatch(chatActions.markAllChatsAsRead())
    }, [dispatch])

    const inboxMenuItems = [
      {
        text: messages.inboxSettings,
        icon: <IconSettings />,
        onClick: handleSettingsClicked
      },
      ...(hasUnread
        ? [
            {
              text: messages.markAllAsRead,
              icon: <IconCheck />,
              onClick: handleMarkAllAsReadClicked
            }
          ]
        : [])
    ]

    // Title row (32px) + tabs row (32px) + padding/gap fill the 112px
    // --chat-header-height exactly, so the list offsets are unchanged.
    const headerContent = (
      <Flex column p='l' gap='m' w='100%' css={{ minWidth: 0 }}>
        <Flex alignItems='center' gap='m' w='100%'>
          <IconMessages size='2xl' color='heading' />
          <Text variant='heading' strength='default' size='l' color='heading'>
            {messages.header}
          </Text>
          <Flex gap='m' css={{ marginLeft: 'auto' }}>
            <IconButton
              aria-label={messages.compose}
              icon={IconCompose}
              onClick={handleComposeClicked}
            />
            <PopupMenu
              items={inboxMenuItems}
              transformOrigin={{ horizontal: 'left', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
              renderTrigger={(ref, trigger) => (
                <IconButton
                  ref={ref}
                  aria-label={messages.inboxOptions}
                  icon={IconKebabHorizontal}
                  onClick={() => trigger()}
                />
              )}
            />
          </Flex>
        </Flex>
        <InboxTabs currentTab={currentTab} onSelectTab={onSelectTab} />
      </Flex>
    )

    return (
      <Frosted
        w='100%'
        h='var(--chat-header-height, 112px)'
        contentPaddingInline='0px'
        borderBottom='default'
      >
        <Flex
          ref={ref}
          w='100%'
          h='var(--chat-header-height, 112px)'
          ph={CHAT_HEADER_PADDING_PX}
          css={{ minWidth: 0, borderRadius: 0 }}
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
      </Frosted>
    )
  }
)
