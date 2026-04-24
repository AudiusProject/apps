import { ComponentPropsWithoutRef } from 'react'

import { chatSelectors, CommonState } from '@audius/common/store'
import { Flex } from '@audius/harmony'
import type { ChatBlast } from '@audius/sdk'
import cn from 'classnames'
import { useSelector } from 'react-redux'

import { Frosted } from 'components/frosted/Frosted'

import { ChatBlastHeader } from './ChatBlastHeader'
import { UserChatHeader } from './UserChatHeader'

const CHAT_PANE_HEADER_HEIGHT_PX = 112
const CHAT_PANE_HEADER_PADDING_PX = 20

type ChatPaneHeaderProps = ComponentPropsWithoutRef<'div'> & {
  chatId?: string
  isNarrowLayout?: boolean
}

export const ChatPaneHeader = (props: ChatPaneHeaderProps) => {
  const { chatId, className, isNarrowLayout, ...other } = props
  const chat = useSelector((state: CommonState) =>
    chatSelectors.getChat(state, chatId ?? '')
  )
  const isBlast = chat?.is_blast

  if (!chatId) return null

  return (
    <Frosted
      w='100%'
      h={
        isNarrowLayout
          ? 'var(--chat-pane-header-height, var(--chat-row-height, 80px))'
          : CHAT_PANE_HEADER_HEIGHT_PX
      }
      contentPaddingInline='0px'
      css={{
        borderRadius: 0,
        minWidth: 0,
        ...(isNarrowLayout && { boxShadow: 'var(--box-shadow-mid)' })
      }}
      borderBottom='default'
      className={cn(className)}
      alignItems='center'
      {...other}
    >
      <Flex
        w='100%'
        ph={CHAT_PANE_HEADER_PADDING_PX}
        pv='l'
        alignItems='center'
        css={{ minWidth: 0 }}
      >
        {chat ? (
          isBlast ? (
            <ChatBlastHeader chat={chat as ChatBlast} />
          ) : (
            <UserChatHeader chatId={chat.chat_id} />
          )
        ) : null}
      </Flex>
    </Frosted>
  )
}
