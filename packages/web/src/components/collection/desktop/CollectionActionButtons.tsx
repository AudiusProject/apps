import { useCollection, useCollectionTracks } from '@audius/common/api'
import {
  useGatedContentAccess,
  useGatedContentAccessMap
} from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import { Button, Flex, IconPause, IconPlay } from '@audius/harmony'
import cn from 'classnames'
import { pick } from 'lodash'

import styles from './CollectionHeader.module.css'
import { OwnerActionButtons } from './OwnerActionButtons'
import { ViewerActionButtons } from './ViewerActionButtons'

const messages = {
  actionGroupLabel: 'collection actions',
  play: 'Play',
  preview: 'Preview',
  pause: 'Pause'
}

type CollectionActionButtonProps = {
  collectionId: ID
  isOwner?: boolean
  isPlaying: boolean
  isPreviewing: boolean
  tracksLoading: boolean
  isPlayable: boolean
  isPremium?: Nullable<boolean>
  onPlay: () => void
  onPreview: () => void
}

export const CollectionActionButtons = (props: CollectionActionButtonProps) => {
  const {
    isOwner,
    collectionId,
    onPlay,
    onPreview,
    isPlaying,
    isPlayable,
    tracksLoading,
    isPremium
  } = props

  const { data: partialCollection } = useCollection(collectionId, {
    select: (collection) =>
      pick(collection, [
        'playlist_id',
        'is_stream_gated',
        'access',
        'stream_conditions'
      ])
  })
  const { hasStreamAccess } = useGatedContentAccess(partialCollection)
  const { data: tracks } = useCollectionTracks(collectionId)
  const trackAccessMap = useGatedContentAccessMap(tracks ?? [])
  const doesUserHaveAccessToAnyTrack = Object.values(trackAccessMap).some(
    ({ hasStreamAccess }) => hasStreamAccess
  )

  // Show play if user has access to the collection or any of its contents,
  // otherwise show preview
  const shouldShowPlay =
    (isPlayable && hasStreamAccess) || doesUserHaveAccessToAnyTrack
  const shouldShowPreview = isPremium && !hasStreamAccess && !shouldShowPlay

  let actionButtons: Nullable<JSX.Element> = null

  if (isOwner) {
    actionButtons = <OwnerActionButtons collectionId={collectionId} />
  } else {
    actionButtons = <ViewerActionButtons collectionId={collectionId} />
  }

  const playButton = (
    <Button
      variant='primary'
      iconLeft={isPlaying ? IconPause : IconPlay}
      onClick={onPlay}
      size='large'
      className={styles.playbackButton}
      aria-label={isPlaying ? messages.pause : messages.play}
    >
      <span className={styles.playbackButtonLabel}>
        {isPlaying ? messages.pause : messages.play}
      </span>
    </Button>
  )

  const previewButton = (
    <Button
      variant='secondary'
      iconLeft={isPlaying ? IconPause : IconPlay}
      onClick={onPreview}
      size='large'
      className={styles.playbackButton}
      aria-label={isPlaying ? messages.pause : messages.preview}
    >
      <span className={styles.playbackButtonLabel}>
        {isPlaying ? messages.pause : messages.preview}
      </span>
    </Button>
  )

  return (
    <Flex
      className={cn({
        [styles.actionButtons]: true,
        [styles.show]: !tracksLoading,
        [styles.hide]: tracksLoading
      })}
      role='group'
      aria-label={messages.actionGroupLabel}
      gap='xl'
      alignItems='center'
    >
      {shouldShowPlay ? playButton : null}
      {shouldShowPreview ? previewButton : null}
      {actionButtons}
    </Flex>
  )
}
