import { MouseEventHandler, useCallback } from 'react'

import { SquareSizes, User } from '@audius/common/models'
import { useNotificationModal } from '@audius/common/store'
import { Image } from '@audius/harmony'
import cn from 'classnames'
import { useNavigate } from 'react-router'

import { ArtistPopover } from 'components/artist/ArtistPopover'
import { useProfilePicture } from 'hooks/useProfilePicture'

import styles from './ProfilePicture.module.css'

type ProfilePictureProps = {
  user: User
  className?: string
  innerClassName?: string
  disablePopover?: boolean
  disableClick?: boolean
  stopPropagation?: boolean
}

export const ProfilePicture = (props: ProfilePictureProps) => {
  const {
    user,
    className,
    innerClassName,
    disablePopover,
    disableClick,
    stopPropagation
  } = props
  const { user_id, handle } = user
  const navigate = useNavigate()
  const { onClose } = useNotificationModal()
  const profilePicture = useProfilePicture({
    userId: user_id,
    size: SquareSizes.SIZE_150_BY_150
  })

  const handleClick: MouseEventHandler = useCallback(
    (e) => {
      if (stopPropagation) {
        e.stopPropagation()
      }
      if (!disableClick) {
        navigate(`/${handle}`)
      }
    },
    [stopPropagation, disableClick, navigate, handle]
  )

  const profilePictureElement = (
    <Image
      onClick={handleClick}
      className={cn(
        styles.profilePictureWrapper,
        styles.profilePicture,
        className,
        innerClassName
      )}
      src={profilePicture}
    />
  )

  if (disablePopover) return profilePictureElement

  return (
    <ArtistPopover handle={user.handle} onNavigateAway={onClose}>
      {profilePictureElement}
    </ArtistPopover>
  )
}
