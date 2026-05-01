import { ReactNode, useCallback } from 'react'

import { User } from '@audius/common/models'
import { route } from '@audius/common/utils'
import cn from 'classnames'

import { ArtistPopover } from 'components/artist/ArtistPopover'
import { UserLink } from 'components/link/UserLink'
import { ProfilePicture } from 'components/notification/Notification/components/ProfilePicture'
import UserBadges from 'components/user-badges/UserBadges'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import styles from './ChatUser.module.css'

const { profilePage } = route

export const ChatUser = ({
  user,
  children,
  textClassName,
  disableNavigation
}: {
  user: User
  children?: ReactNode
  textClassName?: string
  disableNavigation?: boolean
}) => {
  const navigate = useNavigateToPage()
  const goToProfile = useCallback(
    () => navigate(profilePage(user.handle)),
    [navigate, user]
  )

  return (
    <div
      className={cn(styles.root, {
        [styles.nonInteractive]: disableNavigation
      })}
    >
      <ProfilePicture
        user={user}
        className={styles.profilePicture}
        disableClick={disableNavigation}
        disablePopover={disableNavigation}
      />
      <div className={cn(styles.text, textClassName)}>
        <div className={styles.nameAndBadge}>
          {disableNavigation ? (
            <>
              <span className={styles.name}>{user.name}</span>
              <UserBadges
                userId={user.user_id}
                size='s'
                disableInteraction
                css={{ display: 'inline-flex', verticalAlign: 'middle' }}
              />
            </>
          ) : (
            <UserLink
              userId={user.user_id}
              popover
              onClick={goToProfile}
              className={styles.name}
              fullWidth
            />
          )}
        </div>
        {disableNavigation ? (
          <span className={styles.handle}>@{user.handle}</span>
        ) : (
          <ArtistPopover handle={user.handle}>
            <span className={styles.handle} onClick={goToProfile}>
              @{user.handle}
            </span>
          </ArtistPopover>
        )}
      </div>
      {children}
    </div>
  )
}
