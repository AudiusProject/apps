import { useEffect } from 'react'

import { ID, User } from '@audius/common/models'
import cn from 'classnames'
import { useDispatch } from 'react-redux'

import { setUsers as setUserListUsers } from 'store/application/ui/userListModal/slice'
import {
  UserListEntityType,
  UserListType
} from 'store/application/ui/userListModal/types'

import { ProfilePicture } from '../notification/Notification/components/ProfilePicture'
import { USER_LENGTH_LIMIT } from '../notification/Notification/utils'

import styles from './UserProfilePictureList.module.css'

export type UserProfileListProps = {
  users: Array<User>
  limit?: number
  disableProfileClick?: boolean
  disablePopover?: boolean
  stopPropagation?: boolean
  userListType?: UserListType
  userListEntityId?: ID
  userListEntityType?: UserListEntityType
  profilePictureClassname?: string
}

export const UserProfilePictureList = ({
  users,
  limit = USER_LENGTH_LIMIT,
  disableProfileClick = false,
  disablePopover = false,
  stopPropagation = false,
  userListType,
  userListEntityId,
  userListEntityType,
  profilePictureClassname
}: UserProfileListProps) => {
  const dispatch = useDispatch()

  useEffect(() => {
    if (
      userListType &&
      userListEntityType &&
      userListEntityId &&
      users.length > 0
    ) {
      dispatch(
        setUserListUsers({
          userListType,
          id: userListEntityId,
          entityType: userListEntityType
        })
      )
    }
  }, [
    userListType,
    disableProfileClick,
    dispatch,
    userListEntityType,
    users.length,
    userListEntityId
  ])

  return (
    <div className={styles.root}>
      {users
        .filter((u) => !u.is_deactivated)
        .slice(0, limit)
        .map((user) => (
          <ProfilePicture
            key={user.user_id}
            className={cn(styles.profilePicture, profilePictureClassname, {
              [styles.disabled]: disableProfileClick
            })}
            user={user}
            disableClick={disableProfileClick}
            disablePopover={disablePopover}
            stopPropagation={stopPropagation}
          />
        ))}
    </div>
  )
}
