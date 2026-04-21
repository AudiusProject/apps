import { ComponentPropsWithoutRef } from 'react'

import { chatSelectors, CommonState } from '@audius/common/store'
import { Flex, Paper } from '@audius/harmony'
import type { ChatBlast } from '@audius/sdk'
import cn from 'classnames'
import { useSelector } from 'react-redux'

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
    <Paper
      shadow='flat'
      w='100%'
      h={isNarrowLayout ? undefined : CHAT_PANE_HEADER_HEIGHT_PX}
      ph={CHAT_PANE_HEADER_PADDING_PX}
      css={{ borderRadius: 0 }}
      borderBottom='default'
      className={cn(className)}
      {...other}
    >
      <Flex
        w='100%'
        h={isNarrowLayout ? undefined : '100%'}
        ph='l'
        pv='l'
        alignItems={isNarrowLayout ? 'center' : 'flex-end'}
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
    </Paper>
  )
}
