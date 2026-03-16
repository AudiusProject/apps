import { useCallback } from 'react'

import { useOtherChatUsersFromChat } from '@audius/common/api'
import type { UserChat } from '@audius/sdk/services'
import cn from 'classnames'

import styles from './ChatListItem.module.css'
import { ChatUser } from './ChatUser'

const messages = {
  new: ' New',
  ninePlus: '9+'
}

type ChatListItemProps = {
  currentChatId?: string
  chat: UserChat
  onChatClicked: (chatId: string) => void
}

export const ChatListItem = (props: ChatListItemProps) => {
  const { chat, currentChatId, onChatClicked } = props
  const isCurrentChat = currentChatId && currentChatId === chat.chat_id

  const users = useOtherChatUsersFromChat(chat)

  const handleClick = useCallback(() => {
    onChatClicked(chat.chat_id)
  }, [onChatClicked, chat])

  if (users.length === 0) {
    return null
  }
  return (
    <div
      className={cn(styles.root, { [styles.active]: isCurrentChat })}
      onClick={handleClick}
    >
      <ChatUser user={users[0]} textClassName={styles.userText}>
        {chat.unread_message_count > 0 ? (
          <>
            <div className={styles.minimizedUnreadIndicatorTag} />
            <div className={styles.unreadIndicatorTag}>
              {chat.unread_message_count > 9
                ? messages.ninePlus
                : chat.unread_message_count}
              {messages.new}
            </div>
          </>
        ) : null}
      </ChatUser>
      <div className={styles.messagePreview}>{chat.last_message}</div>
    </div>
  )
}
