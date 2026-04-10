import { memo, MouseEvent } from 'react'

import {
  SquareSizes,
  ID,
  CoverArtSizes,
  AccessConditions,
  isContentUSDCPurchaseGated,
  GatedContentStatus
} from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import {
  IconRemove,
  IconPlaybackPause,
  IconPlaybackPlay,
  IconDrag,
  IconKebabHorizontal,
  IconLock,
  IconButton,
  IconVisibilityHidden
} from '@audius/harmony'
import cn from 'classnames'
import Lottie from 'lottie-react'

import loadingSpinner from 'assets/animations/loadingSpinner.json'
import { SeoLink } from 'components/link'
import { TablePlayButton } from 'components/table/components/TablePlayButton'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

import styles from './TrackListItem.module.css'

export enum TrackItemAction {
  Save = 'save',
  Overflow = 'overflow'
}

type ArtworkIconProps = {
  isLoading: boolean
  isPlaying: boolean
}

const ArtworkIcon = ({ isLoading, isPlaying }: ArtworkIconProps) => {
  let artworkIcon
  if (isLoading) {
    artworkIcon = (
      <div className={styles.loadingAnimation}>
        <Lottie loop autoplay animationData={loadingSpinner} />
      </div>
    )
  } else if (isPlaying) {
    artworkIcon = <IconPlaybackPause />
  } else {
    artworkIcon = <IconPlaybackPlay />
  }
  return <div className={styles.artworkIcon}>{artworkIcon}</div>
}

type ArtworkProps = {
  trackId: ID
  isLoading: boolean
  isActive?: boolean
  isPlaying: boolean
  coverArtSizes: CoverArtSizes
}
const Artwork = ({
  trackId,
  isPlaying,
  isActive,
  isLoading,
  coverArtSizes
}: ArtworkProps) => {
  const { imageUrl: image } = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_150_BY_150
  })

  return (
    <div className={styles.artworkContainer}>
      <div
        className={cn(styles.artwork, {})}
        style={
          image
            ? {
                backgroundImage: `url(${image})`
              }
            : {}
        }
      >
        {isActive ? (
          <ArtworkIcon isLoading={isLoading} isPlaying={isPlaying} />
        ) : null}
      </div>
    </div>
  )
}

const getMessages = ({ isDeleted = false }: { isDeleted?: boolean } = {}) => ({
  deleted: isDeleted ? ' [Deleted By Artist]' : '',
  locked: 'Locked'
})

export type TrackListItemProps = {
  className?: string
  index: number
  isLoading: boolean
  isStreamGated?: boolean
  isUnlisted?: boolean
  isSaved?: boolean
  isReposted?: boolean
  isActive?: boolean
  isPlaying?: boolean
  isDeleted: boolean
  isLocked: boolean
  isPremium?: boolean
  coverArtSizes?: CoverArtSizes
  trackTitle: string
  trackId: ID
  ddexApp?: string | null
  permalink: string
  uid?: string
  isReorderable?: boolean
  isDragging?: boolean
  onRemove?: (trackId: ID) => void
  togglePlay?: (uid: string, trackId: ID) => void
  onClickOverflow?: () => void
  onClickGatedUnlockPill?: (e: MouseEvent) => void
  hasStreamAccess?: boolean
  trackItemAction?: TrackItemAction
  gatedUnlockStatus?: GatedContentStatus
  streamConditions?: Nullable<AccessConditions>
}

const TrackListItem = ({
  className,
  isLoading,
  index,
  isActive = false,
  isPlaying = false,
  trackTitle,
  permalink,
  trackId,
  uid,
  coverArtSizes,
  isUnlisted,
  isDeleted,
  isLocked,
  isPremium,
  onRemove,
  togglePlay,
  trackItemAction,
  onClickOverflow,
  streamConditions,
  isReorderable = false,
  isDragging = false
}: TrackListItemProps) => {
  const messages = getMessages({ isDeleted })
  const isUsdcPurchaseGated = isContentUSDCPurchaseGated(streamConditions)

  const onClickTrack = () => {
    if (uid && !isDeleted && (!isLocked || isUsdcPurchaseGated) && togglePlay)
      togglePlay(uid, trackId)
  }

  const onRemoveTrack = (e: MouseEvent<Element>) => {
    e.stopPropagation()
    if (onRemove) onRemove(index)
  }

  return (
    <div
      className={cn(styles.trackContainer, className, {
        [styles.isActive]: isActive,
        [styles.isDeleted]: isDeleted,
        [styles.isReorderable]: isReorderable,
        [styles.isDragging]: isDragging
      })}
      onClick={onClickTrack}
    >
      {coverArtSizes ? (
        <div>
          <Artwork
            trackId={trackId}
            coverArtSizes={coverArtSizes}
            isActive={isActive}
            isLoading={isLoading}
            isPlaying={isPlaying}
          />
        </div>
      ) : isActive && !isDeleted ? (
        <div className={styles.playButtonContainer}>
          <TablePlayButton
            playing={true}
            paused={!isPlaying}
            hideDefault={false}
            isTrackPremium={isPremium}
            isLocked={isLocked}
          />
        </div>
      ) : null}
      {isReorderable && <IconDrag className={styles.dragIcon} />}

      <div className={styles.nameArtistContainer}>
        <SeoLink
          to={permalink}
          className={cn(styles.trackTitle, {
            [styles.lockedTrackTitle]: !isDeleted && isLocked && !isPremium
          })}
        >
          {trackTitle}
          {messages.deleted}
        </SeoLink>
      </div>
      {isUnlisted ? <IconVisibilityHidden color='subdued' size='s' /> : null}
      {!isDeleted && isLocked ? <IconLock color='subdued' size='s' /> : null}
      {onClickOverflow && trackItemAction === TrackItemAction.Overflow && (
        <div className={styles.iconContainer}>
          <IconButton
            aria-label='more actions'
            icon={IconKebabHorizontal}
            color='subdued'
            size='m'
            onClick={(e: MouseEvent) => {
              e.stopPropagation()
              onClickOverflow()
            }}
          />
        </div>
      )}
      {onRemove && (
        <div className={styles.iconContainer}>
          <IconButton
            aria-label='remove track'
            icon={IconRemove}
            onClick={onRemoveTrack}
          />
        </div>
      )}
    </div>
  )
}

export default memo(TrackListItem)
