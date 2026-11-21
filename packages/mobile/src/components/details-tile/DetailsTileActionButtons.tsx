import { useMemo } from 'react'

import { useCollection, useTracks } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { pick } from 'lodash'

import {
  Flex,
  IconButton,
  IconKebabHorizontal,
  IconPencil,
  IconRocket,
  IconShare
} from '@audius/harmony-native'
import { FavoriteButton } from 'app/components/favorite-button'
import { RepostButton } from 'app/components/repost-button'
import { makeStyles } from 'app/styles'
import type { GestureResponderHandler } from 'app/types/gesture'

const getMessages = (collectionType: 'album' | 'playlist') => ({
  publishButtonEmptyDisabledContent: 'You must add at least 1 track.',
  publishButtonHiddenDisabledContent: `You cannot make a ${collectionType} with hidden tracks public.`,
  shareButtonDisabledHint: `You can’t share an empty ${collectionType}.`,
  shareButtonLabel: 'Share Content',
  overflowButtonLabel: 'More Options',
  editButtonLabel: 'Edit Content',
  publishButtonLabel: 'Publish Content'
})

type DetailsTileActionButtonsProps = {
  collectionId?: ID
  ddexApp?: string | null
  hasReposted: boolean
  hasSaved: boolean
  isOwner: boolean
  isCollection?: boolean
  isPublished?: boolean
  hideFavorite?: boolean
  hideOverflow?: boolean
  hideRepost?: boolean
  hideShare?: boolean
  onPressEdit?: GestureResponderHandler
  onPressPublish?: GestureResponderHandler
  onPressRepost?: GestureResponderHandler
  onPressSave?: GestureResponderHandler
  onPressShare?: GestureResponderHandler
  onPressOverflow?: GestureResponderHandler
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  actionButton: {
    width: spacing(8),
    height: spacing(8)
  }
}))

export const DetailsTileActionButtons = ({
  collectionId,
  ddexApp,
  hasReposted,
  hasSaved,
  isCollection,
  isOwner,
  isPublished,
  hideFavorite,
  hideOverflow,
  hideRepost,
  hideShare,
  onPressEdit,
  onPressPublish,
  onPressOverflow,
  onPressRepost,
  onPressSave,
  onPressShare
}: DetailsTileActionButtonsProps) => {
  const styles = useStyles()
  const { data: partialCollection } = useCollection(collectionId, {
    select: (collection) => pick(collection, ['playlist_contents', 'is_album'])
  })
  const { playlist_contents, is_album } = partialCollection ?? {}
  const isCollectionEmpty = playlist_contents?.track_ids.length === 0
  const { data: tracks } = useTracks(
    playlist_contents?.track_ids.map((t) => t.track)
  )
  const collectionHasHiddenTracks = useMemo(() => {
    return tracks?.some((track) => track.is_unlisted)
  }, [tracks])
  const messages = getMessages(is_album ? 'album' : 'playlist')

  const repostButton = (
    <RepostButton
      wrapperStyle={styles.actionButton}
      onPress={onPressRepost}
      isActive={!isOwner && hasReposted}
      isDisabled={isOwner}
    />
  )

  const favoriteButton = (
    <FavoriteButton
      wrapperStyle={styles.actionButton}
      onPress={onPressSave}
      isActive={!isOwner && hasSaved}
      isDisabled={isOwner}
    />
  )

  const shareButton = (
    <IconButton
      color='subdued'
      icon={IconShare}
      disabled={isCollectionEmpty}
      disabledHint={messages.shareButtonDisabledHint}
      onPress={onPressShare}
      aria-label={messages.shareButtonLabel}
      size='2xl'
      style={{ padding: 0 }}
    />
  )

  const overflowMenu = (
    <IconButton
      color='subdued'
      icon={IconKebabHorizontal}
      onPress={onPressOverflow}
      aria-label={messages.overflowButtonLabel}
      size='2xl'
      style={{ padding: 0 }}
    />
  )

  const editButton = (
    <IconButton
      color='subdued'
      icon={IconPencil}
      onPress={onPressEdit}
      aria-label={messages.editButtonLabel}
      size='2xl'
    />
  )

  const publishButton = (
    <IconButton
      color='subdued'
      icon={IconRocket}
      disabled={isCollectionEmpty}
      disabledHint={
        collectionHasHiddenTracks
          ? messages.publishButtonHiddenDisabledContent
          : messages.publishButtonEmptyDisabledContent
      }
      aria-label={messages.publishButtonLabel}
      onPress={onPressPublish}
      size='2xl'
    />
  )

  return (
    <Flex direction='row' justifyContent='center' gap='xl'>
      {isOwner || ddexApp || hideRepost ? null : repostButton}
      {isOwner || hideFavorite ? null : favoriteButton}
      {hideShare ? null : shareButton}
      {isOwner && !ddexApp ? editButton : null}
      {isOwner && !isPublished ? publishButton : null}
      {hideOverflow ? null : overflowMenu}
    </Flex>
  )
}
