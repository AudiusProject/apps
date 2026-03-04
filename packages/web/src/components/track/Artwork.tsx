import { memo } from 'react'

import { SquareSizes, ID } from '@audius/common/models'
import {
  IconImage,
  IconLock,
  IconPlaybackPlay as IconPlay,
  IconPlaybackPause as IconPause
} from '@audius/harmony'
import cn from 'classnames'

import DynamicImage from 'components/dynamic-image/DynamicImage'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import TrackFlair from 'components/track-flair/TrackFlair'
import { Size } from 'components/track-flair/types'
import { useCollectionCoverArt } from 'hooks/useCollectionCoverArt'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

import styles from './Artwork.module.css'

type TileArtworkProps = {
  id: ID
  size: any
  isBuffering: boolean
  isPlaying: boolean
  showArtworkIcon: boolean
  showSkeleton: boolean
  noShimmer?: boolean
  artworkIconClassName?: string
  coSign?: {
    has_remix_author_saved: boolean
    has_remix_author_reposted: boolean
    user: { name: string; is_verified: boolean; user_id: ID }
  }
  hasStreamAccess?: boolean
}

export const ArtworkIcon = ({
  isBuffering,
  isPlaying,
  artworkIconClassName,
  hasStreamAccess,
  isTrack,
  hasNoArtwork
}: {
  isBuffering: boolean
  isPlaying: boolean
  artworkIconClassName?: string
  hasStreamAccess?: boolean
  isTrack?: boolean
  hasNoArtwork?: boolean
}) => {
  let artworkIcon
  if (hasNoArtwork) {
    artworkIcon = <IconImage width={36} height={36} />
  } else if (isTrack && !hasStreamAccess) {
    artworkIcon = <IconLock width={36} height={36} />
  } else if (isBuffering) {
    artworkIcon = <LoadingSpinner className={styles.spinner} />
  } else if (isPlaying) {
    artworkIcon = <IconPause />
  } else {
    artworkIcon = <IconPlay />
  }
  return (
    <div
      className={cn(styles.artworkIcon, {
        [artworkIconClassName!]: !!artworkIconClassName
      })}
    >
      {artworkIcon}
    </div>
  )
}

type ArtworkProps = TileArtworkProps & {
  image: any
  label?: string
  isTrack?: boolean
  hasNoArtwork?: boolean
}

const Artwork = memo(
  ({
    id,
    size,
    showSkeleton,
    showArtworkIcon,
    artworkIconClassName,
    isBuffering,
    isPlaying,
    image,
    coSign,
    label,
    hasStreamAccess,
    isTrack,
    noShimmer,
    hasNoArtwork
  }: ArtworkProps) => {
    const imageElement = (
      <DynamicImage
        wrapperClassName={cn(styles.artworkWrapper, {
          [styles.artworkInset]: !coSign,
          [styles.small]: size === 'small',
          [styles.large]: size === 'large',
          [styles.artworkEmpty]: hasNoArtwork ?? false
        })}
        className={styles.artwork}
        image={showSkeleton ? '' : image}
        aria-label={label}
        noShimmer={noShimmer}
        useSkeleton={!hasNoArtwork}
      >
        {showArtworkIcon && (
          <ArtworkIcon
            isBuffering={isBuffering}
            isPlaying={isPlaying}
            artworkIconClassName={artworkIconClassName}
            hasStreamAccess={hasStreamAccess}
            isTrack={isTrack}
            hasNoArtwork={hasNoArtwork}
          />
        )}
      </DynamicImage>
    )
    return isTrack ? (
      <TrackFlair
        size={Size.MEDIUM}
        id={id}
        className={cn(styles.artworkInset, {
          [styles.small]: size === 'small',
          [styles.large]: size === 'large'
        })}
      >
        {imageElement}
      </TrackFlair>
    ) : (
      imageElement
    )
  }
)

export const TrackArtwork = memo((props: TileArtworkProps) => {
  const { imageUrl: image, hasNoArtwork } = useTrackCoverArt({
    trackId: props.id,
    size: SquareSizes.SIZE_150_BY_150
  })

  return (
    <Artwork {...props} image={image} isTrack hasNoArtwork={hasNoArtwork} />
  )
})

export const CollectionArtwork = memo((props: TileArtworkProps) => {
  const { imageUrl: image, hasNoArtwork } = useCollectionCoverArt({
    collectionId: props.id,
    size: SquareSizes.SIZE_150_BY_150
  })

  return <Artwork {...props} image={image} hasNoArtwork={hasNoArtwork} />
})
