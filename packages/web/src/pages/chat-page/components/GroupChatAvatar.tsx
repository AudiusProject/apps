import { User } from '@audius/common/models'
import cn from 'classnames'

import { ProfilePicture } from 'components/notification/Notification/components/ProfilePicture'

import styles from './GroupChatAvatar.module.css'

/** Two overlapping profile pictures for a group chat. */
export const GroupChatAvatar = ({ users }: { users: User[] }) => {
  const [first, second] = users
  return (
    <div className={styles.root}>
      {first ? (
        <ProfilePicture
          user={first}
          className={cn(styles.picture, second ? styles.first : styles.single)}
          disableClick
          disablePopover
        />
      ) : null}
      {second ? (
        <ProfilePicture
          user={second}
          className={cn(styles.picture, styles.second)}
          disableClick
          disablePopover
        />
      ) : null}
    </div>
  )
}
