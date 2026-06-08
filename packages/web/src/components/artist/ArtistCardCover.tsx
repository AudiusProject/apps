import { useCallback } from 'react'

import { SquareSizes, WidthSizes, User } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { IconArtistBadge, IconLabelBadge, Image } from '@audius/harmony'
import cn from 'classnames'
import { useDispatch } from 'react-redux'

import FollowsYouBadge from 'components/user-badges/FollowsYouBadge'
import UserBadges from 'components/user-badges/UserBadges'
import { useCoverPhoto } from 'hooks/useCoverPhoto'
import { useProfilePicture } from 'hooks/useProfilePicture'
import { push } from 'utils/navigation'

import styles from './ArtistCardCover.module.css'

const { profilePage } = route
const gradient = `linear-gradient(180deg, rgba(0, 0, 0, 0.001) 0%, rgba(0, 0, 0, 0.005) 67.71%, rgba(0, 0, 0, 0.15) 79.17%, rgba(0, 0, 0, 0.25) 100%)`

type ArtistCoverProps = {
  artist: User
  profileType: 'artist' | 'label' | null
  onNavigateAway?: () => void
}

export const ArtistCardCover = (props: ArtistCoverProps) => {
  const { profileType, artist, onNavigateAway } = props

  const { user_id, name, handle } = artist
  const dispatch = useDispatch()

  const { image: coverPhoto, shouldBlur } = useCoverPhoto({
    userId: user_id,
    size: WidthSizes.SIZE_640
  })
  const profilePicture = useProfilePicture({
    userId: user_id,
    size: SquareSizes.SIZE_150_BY_150
  })

  const handleClickUser = useCallback(() => {
    if (onNavigateAway) {
      onNavigateAway()
    }
    dispatch(push(profilePage(handle)))
  }, [dispatch, handle, onNavigateAway])

  return (
    <div
      className={styles.artistCoverPhoto}
      style={{
        backgroundImage: `${gradient}, url(${coverPhoto})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {shouldBlur ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backdropFilter: 'blur(25px)',
            zIndex: 1
          }}
        />
      ) : null}
      <div className={styles.coverPhotoContentContainer}>
        {profileType === 'artist' ? (
          <IconArtistBadge className={styles.badge} />
        ) : profileType === 'label' ? (
          <IconLabelBadge className={styles.badge} />
        ) : null}
        <Image
          className={cn(styles.profilePictureWrapper, styles.profilePicture)}
          src={profilePicture}
          immediate
        />
        <div className={styles.headerTextContainer}>
          <div className={styles.nameContainer}>
            <div className={styles.artistName} onClick={handleClickUser}>
              {name}
            </div>
            <UserBadges userId={user_id} className={styles.iconVerified} />
          </div>
          <div className={styles.artistHandleWrapper}>
            <div
              className={styles.artistHandle}
              onClick={handleClickUser}
            >{`@${handle}`}</div>
            <FollowsYouBadge userId={user_id} />
          </div>
        </div>
      </div>
    </div>
  )
}
