import { memo } from 'react'

import { SquareSizes, ID, Remix } from '@audius/common/models'
import cn from 'classnames'

import DynamicImage from 'components/dynamic-image/DynamicImage'
import TrackFlair from 'components/track-flair/TrackFlair'
import { Size } from 'components/track-flair/types'
import { useCollectionCoverArt } from 'hooks/useCollectionCoverArt'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

import { ArtworkIcon } from '../Artwork'

import styles from './TrackTileArt.module.css'

type TrackTileArtProps = {
  isTrack: boolean
  id: ID
  className?: string
  showSkeleton?: boolean
  noShimmer?: boolean
  coSign?: Remix | null
  label?: string
  isPlaying?: boolean
  isBuffering?: boolean
  artworkIconClassName?: string
  // Called when the image is done loading
  callback?: () => void
}

const TrackTileArt = ({
  id,
  className,
  showSkeleton,
  noShimmer,
  coSign,
  label,
  isBuffering,
  isPlaying,
  artworkIconClassName,
  callback
}: TrackTileArtProps) => {
  const { imageUrl: image, hasNoArtwork } = useTrackCoverArt({
    trackId: id,
    size: SquareSizes.SIZE_150_BY_150
  })

  const imageProps = {
    image: showSkeleton ? '' : image,
    noShimmer,
    useSkeleton: !hasNoArtwork,
    wrapperClassName: coSign
      ? styles.imageWrapper
      : cn(
          styles.container,
          styles.imageWrapper,
          className,
          hasNoArtwork && styles.artworkEmpty
        ),
    'aria-label': label,
    onLoad: callback
  }

  const renderImage = () => (
    <DynamicImage {...imageProps}>
      <ArtworkIcon
        isBuffering={!!isBuffering}
        isPlaying={!!isPlaying}
        artworkIconClassName={cn(
          artworkIconClassName,
          hasNoArtwork && styles.artworkIconVisible
        )}
        hasNoArtwork={hasNoArtwork}
      />
    </DynamicImage>
  )

  return (
    <TrackFlair
      size={Size.SMALL}
      className={cn(styles.container, className)}
      id={id}
    >
      {renderImage()}
    </TrackFlair>
  )
}

const CollectionTileArt = ({
  id,
  className,
  showSkeleton,
  noShimmer,
  coSign,
  label,
  isBuffering,
  isPlaying,
  artworkIconClassName,
  callback
}: TrackTileArtProps) => {
  const { imageUrl: image, hasNoArtwork } = useCollectionCoverArt({
    collectionId: id,
    size: SquareSizes.SIZE_150_BY_150
  })

  const imageProps = {
    image: showSkeleton ? '' : image,
    noShimmer,
    useSkeleton: !hasNoArtwork,
    wrapperClassName: coSign
      ? styles.imageWrapper
      : cn(
          styles.container,
          styles.imageWrapper,
          className,
          hasNoArtwork && styles.artworkEmpty
        ),
    'aria-label': label,
    onLoad: callback
  }

  const renderImage = () => (
    <DynamicImage {...imageProps}>
      <ArtworkIcon
        isBuffering={!!isBuffering}
        isPlaying={!!isPlaying}
        artworkIconClassName={cn(
          artworkIconClassName,
          hasNoArtwork && styles.artworkIconVisible
        )}
        hasNoArtwork={hasNoArtwork}
      />
    </DynamicImage>
  )

  return renderImage()
}

const TileArt = (props: TrackTileArtProps) => {
  return props.isTrack ? (
    <TrackTileArt {...props} />
  ) : (
    <CollectionTileArt {...props} />
  )
}

export default memo(TileArt)
