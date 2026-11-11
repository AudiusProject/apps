import { useSelector } from 'react-redux'

import { CommonState } from '~/store/commonStore'
import { getChat } from '~/store/pages/chat/selectors'

/** True if the chat is a group chat (more than two members at creation). */
export const useIsGroupChat = (chatId?: string) =>
  useSelector((state: CommonState) => {
    const chat = chatId ? getChat(state, chatId) : undefined
    return !!chat && !chat.is_blast && !!chat.is_group
  })
