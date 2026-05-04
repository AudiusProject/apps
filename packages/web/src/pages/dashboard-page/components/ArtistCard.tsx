import { SquareSizes, WidthSizes, ID } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { Text, Image } from '@audius/harmony'
import cn from 'classnames'

import UserBadges from 'components/user-badges/UserBadges'
import { useCoverPhoto } from 'hooks/useCoverPhoto'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { useProfilePicture } from 'hooks/useProfilePicture'

import styles from './ArtistCard.module.css'

const { profilePage } = route

type ArtistCardProps = {
  userId: ID
  handle: string
  name: string
}

export const ArtistCard = ({ userId, handle, name }: ArtistCardProps) => {
  const profilePicture = useProfilePicture({
    userId,
    size: SquareSizes.SIZE_150_BY_150
  })
  const { image: coverPhoto, shouldBlur } = useCoverPhoto({
    userId: userId ?? undefined,
    size: WidthSizes.SIZE_2000
  })
  const navigate = useNavigateToPage()

  return (
    <div className={styles.root} onClick={() => navigate(profilePage(handle))}>
      <div
        className={cn(styles.coverPhotoWrapper, styles.coverPhoto)}
        css={{ position: 'relative', overflow: 'hidden' }}
      >
        <Image src={coverPhoto} css={{ position: 'absolute', inset: 0 }} />
        {shouldBlur ? (
          <div
            css={{
              position: 'absolute',
              inset: 0,
              backdropFilter: 'blur(25px)',
              zIndex: 3
            }}
          />
        ) : null}
      </div>
      <div className={styles.details}>
        <Image
          className={cn(styles.profilePictureWrapper, styles.profilePicture)}
          src={profilePicture}
        />
        <div className={styles.info}>
          <div className={styles.name}>
            <Text size='l' strength='default' variant='title'>
              {name}
            </Text>
            <UserBadges userId={userId} />
          </div>
          <Text size='l' strength='default' variant='body'>
            {`@${handle}`}
          </Text>
        </div>
      </div>
    </div>
  )
}
