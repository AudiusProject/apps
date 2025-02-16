import { SquareSizes, WidthSizes, ID } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { Text } from '@audius/harmony'

import DynamicImage from 'components/dynamic-image/DynamicImage'
import { componentWithErrorBoundary } from 'components/error-wrapper/componentWithErrorBoundary'
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

const ArtistCardContent = ({ userId, handle, name }: ArtistCardProps) => {
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
      <DynamicImage
        className={styles.coverPhoto}
        wrapperClassName={styles.coverPhotoWrapper}
        image={coverPhoto}
        useBlur={shouldBlur}
      />
      <div className={styles.details}>
        <DynamicImage
          className={styles.profilePicture}
          wrapperClassName={styles.profilePictureWrapper}
          image={profilePicture}
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

export const ArtistCard = componentWithErrorBoundary(ArtistCardContent, {
  name: 'ArtistCard'
})
