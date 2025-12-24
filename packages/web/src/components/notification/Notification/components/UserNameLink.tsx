import { MouseEventHandler, useCallback } from 'react'

import { Name, User } from '@audius/common/models'
import { Notification, useNotificationModal } from '@audius/common/store'
import { route } from '@audius/common/utils'
import cn from 'classnames'
import { useNavigate } from 'react-router'

import { make, useRecord } from 'common/store/analytics/actions'
import { ArtistPopover } from 'components/artist/ArtistPopover'
import UserBadges from 'components/user-badges/UserBadges'
import { useIsMobile } from 'hooks/useIsMobile'

import styles from './UserNameLink.module.css'
const { profilePage } = route

const messages = {
  deactivated: 'Deactivated'
}

type UserNameLinkProps = {
  className?: string
  notification: Notification
  user: User
  isOwner?: boolean
}

export const UserNameLink = (props: UserNameLinkProps) => {
  const { className, notification, user, isOwner } = props
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const record = useRecord()
  const { type } = notification
  const { handle, user_id, name, is_deactivated } = user

  const profileLink = profilePage(handle)
  const { onClose } = useNotificationModal()

  const handleClick: MouseEventHandler = useCallback(
    (event) => {
      event.stopPropagation()
      event.preventDefault()
      onClose()
      navigate(profilePage(handle))
      record(
        make(Name.NOTIFICATIONS_CLICK_TILE, {
          kind: type,
          link_to: profileLink
        })
      )
    },
    [onClose, navigate, handle, record, type, profileLink]
  )

  const rootClassName = cn(styles.root, className)

  if (is_deactivated) {
    return (
      <span className={cn(rootClassName, styles.deactivated)}>
        {name} [{messages.deactivated}]
      </span>
    )
  }

  let userNameElement = (
    <span className={rootClassName}>
      <a onClick={handleClick} href={profileLink} className={styles.link}>
        {name}
        {isOwner ? "'s" : null}
      </a>
      <UserBadges
        inline
        userId={user_id}
        size='2xs'
        className={styles.badges}
      />
    </span>
  )

  if (!isMobile) {
    userNameElement = (
      <ArtistPopover handle={handle} onNavigateAway={onClose}>
        {userNameElement}
      </ArtistPopover>
    )
  }

  return userNameElement
}
