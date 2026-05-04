import { ID, Remix } from '@audius/common/models'
import { Image } from '@audius/harmony'

import { ArtistPopover } from 'components/artist/ArtistPopover'
import TrackFlair from 'components/track-flair/TrackFlair'
import { Size } from 'components/track-flair/types'
import UserBadges from 'components/user-badges/UserBadges'

import styles from './RemixCard.module.css'

const messages = {
  by: 'By '
}

type RemixCardProps = {
  profilePictureImage?: string
  coverArtImage?: string
  coSign?: Remix | null
  artistName: string
  artistHandle: string
  onClick: () => void
  onClickArtistName: () => void
  userId: ID
  trackId: ID
}

const RemixCard = ({
  profilePictureImage,
  coverArtImage,
  coSign,
  artistName,
  artistHandle,
  onClick,
  onClickArtistName,
  userId,
  trackId
}: RemixCardProps) => {
  const images = (
    <div className={styles.images}>
      <div className={styles.profilePicture}>
        <Image src={profilePictureImage} />
      </div>
      <div className={styles.coverArt}>
        <Image src={coverArtImage} />
      </div>
    </div>
  )
  return (
    <div className={styles.remixCard}>
      <div className={styles.imagesContainer} onClick={onClick}>
        <TrackFlair size={Size.MEDIUM} id={trackId}>
          {images}
        </TrackFlair>
      </div>
      <div className={styles.artist} onClick={onClickArtistName}>
        <ArtistPopover handle={artistHandle}>
          <div className={styles.name}>
            <div className={styles.by}>{messages.by}</div>
            <div className={styles.hoverable}>{artistName}</div>
            <UserBadges
              className={styles.badges}
              userId={userId}
              size='2xs'
              inline
            />
          </div>
        </ArtistPopover>
      </div>
    </div>
  )
}

export default RemixCard
