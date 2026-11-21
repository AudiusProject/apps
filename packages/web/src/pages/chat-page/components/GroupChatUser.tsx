import { ReactNode } from 'react'

import { User } from '@audius/common/models'
import { formatGroupChatTitle } from '@audius/common/utils'
import cn from 'classnames'

import styles from './ChatUser.module.css'
import { GroupChatAvatar } from './GroupChatAvatar'

const messages = {
  members: (count: number) => `${count} ${count === 1 ? 'member' : 'members'}`
}

export const GroupChatUser = ({
  users,
  children,
  textClassName,
  onClick
}: {
  users: User[]
  children?: ReactNode
  textClassName?: string
  onClick?: () => void
}) => {
  return (
    <div className={styles.root}>
      <GroupChatAvatar users={users} />
      <div className={cn(styles.text, textClassName)} onClick={onClick}>
        <div className={styles.nameAndBadge}>
          <span className={styles.name}>{formatGroupChatTitle(users)}</span>
        </div>
        <span className={styles.handle}>
          {messages.members(users.length + 1)}
        </span>
      </div>
      {children}
    </div>
  )
}
