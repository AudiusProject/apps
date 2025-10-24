import { useCallback } from 'react'

import { useSupportedUsers } from '@audius/common/api'
import { User } from '@audius/common/models'
import {
  userListActions,
  SUPPORTING_USER_LIST_TAG as SUPPORTING_TAG
} from '@audius/common/store'
import { MAX_ARTIST_HOVER_TOP_SUPPORTING } from '@audius/common/utils'
import { IconTipping as IconTip } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { UserProfilePictureList } from 'components/user-profile-picture-list'
import {
  setUsers,
  setVisibility
} from 'store/application/ui/userListModal/slice'
import {
  UserListEntityType,
  UserListType
} from 'store/application/ui/userListModal/types'

import styles from './ArtistSupporting.module.css'
const { loadMore, reset } = userListActions

const messages = {
  supporting: 'Supporting'
}

type ArtistSupportingProps = {
  artist: User
  onNavigateAway?: () => void
}
export const ArtistSupporting = (props: ArtistSupportingProps) => {
  const { artist, onNavigateAway } = props
  const { user_id, supporting_count } = artist
  const dispatch = useDispatch()

  const { data: supportedUsers = [] } = useSupportedUsers({
    userId: user_id,
    pageSize: MAX_ARTIST_HOVER_TOP_SUPPORTING
  })

  const handleClick = useCallback(() => {
    /**
     * It's possible that we are already in the supporting
     * user list modal, and that we are hovering over one
     * of the users.
     * Clicking on the supporting section is supposed to
     * load a new user list modal that shows the users who
     * are being supported by the user represented by the
     * artist card.
     */
    dispatch(reset(SUPPORTING_TAG))
    dispatch(
      setUsers({
        userListType: UserListType.SUPPORTING,
        entityType: UserListEntityType.USER,
        id: user_id
      })
    )
    dispatch(loadMore(SUPPORTING_TAG))
    // Wait until event bubbling finishes so that any modals are already dismissed
    // Without this, the user list won't be visible if the popover is from an existing user list
    setTimeout(() => {
      dispatch(setVisibility(true))
    }, 0)

    // Used to dismiss popovers etc
    if (onNavigateAway) {
      onNavigateAway()
    }
  }, [dispatch, user_id, onNavigateAway])

  return supportedUsers.length > 0 ? (
    <div className={styles.supportingContainer} onClick={handleClick}>
      <div className={styles.supportingTitleContainer}>
        <IconTip className={styles.supportingIcon} />
        <span className={styles.supportingTitle}>{messages.supporting}</span>
      </div>
      <div className={styles.line} />
      <UserProfilePictureList
        limit={MAX_ARTIST_HOVER_TOP_SUPPORTING}
        users={supportedUsers.map((supportedUser) => supportedUser.receiver)}
        disableProfileClick
        disablePopover
        profilePictureClassname={styles.profilePictureWrapper}
      />
    </div>
  ) : supporting_count > 0 ? (
    <div className={styles.emptyContainer} />
  ) : null
}
