import { useCollection, useTrack } from '@audius/common/api'
import { SquareSizes, USDCContentPurchaseType } from '@audius/common/models'
import { Skeleton, Text } from '@audius/harmony'

import DynamicImage from 'components/dynamic-image/DynamicImage'
import { useCollectionCoverArt } from 'hooks/useCollectionCoverArt'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

import styles from './TrackNameWithArtwork.module.css'

export const TrackNameWithArtwork = ({
  id,
  contentType
}: {
  id: number
  contentType: USDCContentPurchaseType
}) => {
  const isTrack = contentType === USDCContentPurchaseType.TRACK
  const { data: trackTitle, isPending: isTrackPending } = useTrack(id, {
    enabled: isTrack,
    select: (track) => track.title
  })
  const { data: albumTitle, isPending: isAlbumPending } = useCollection(id, {
    enabled: !isTrack,
    select: (collection) => collection.playlist_name
  })
  const { imageUrl: trackArtwork } = useTrackCoverArt({
    trackId: id,
    size: SquareSizes.SIZE_150_BY_150
  })
  const { imageUrl: albumArtwork } = useCollectionCoverArt({
    collectionId: id,
    size: SquareSizes.SIZE_150_BY_150
  })
  const title = isTrack ? trackTitle : albumTitle
  const image = isTrack ? trackArtwork : albumArtwork
  const loading = isTrack ? isTrackPending : isAlbumPending

  return (
    <div className={styles.container}>
      {loading ? (
        <Skeleton />
      ) : (
        <>
          <DynamicImage wrapperClassName={styles.artwork} image={image} />
          <Text ellipses>{title}</Text>
        </>
      )}
    </div>
  )
}
