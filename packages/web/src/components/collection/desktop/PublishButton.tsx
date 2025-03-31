import { useCallback } from 'react'

import {
  useCollection,
  useGetCurrentUserId,
  useGetPlaylistById
} from '@audius/common/api'
import {
  cacheCollectionsActions,
  useEarlyReleaseConfirmationModal,
  usePublishConfirmationModal
} from '@audius/common/store'
import { IconRocket, IconButton, IconButtonProps } from '@audius/harmony'
import { pick } from 'lodash'
import { useDispatch } from 'react-redux'

import { Tooltip } from 'components/tooltip'

const messages = {
  publish: 'Make Public',
  publishing: 'Making Public',
  emptyPlaylistTooltipText: 'You must add at least 1 song.',
  missingArtworkTooltipText: 'You must add artwork'
}

type PublishButtonProps = Partial<IconButtonProps> & {
  collectionId: number
}

export const PublishButton = (props: PublishButtonProps) => {
  const { collectionId, ...other } = props
  const { data: partialCollection } = useCollection(collectionId, {
    select: (collection) =>
      pick(collection, '_is_publishing', 'is_scheduled_release', 'is_album')
  })
  const { _is_publishing, is_scheduled_release, is_album } =
    partialCollection ?? {}
  const { data: currentUserId } = useGetCurrentUserId({})
  const { data: collection } = useGetPlaylistById({
    playlistId: collectionId,
    currentUserId
  })
  const { track_count, cover_art_sizes } = collection ?? {}

  const { onOpen: openPublishConfirmation } = usePublishConfirmationModal()
  const { onOpen: openEarlyReleaseConfirmation } =
    useEarlyReleaseConfirmationModal()

  const dispatch = useDispatch()
  const isDisabled = !track_count || track_count === 0 || !cover_art_sizes

  const publishRelease = useCallback(() => {
    dispatch(
      cacheCollectionsActions.publishPlaylist(collectionId, undefined, is_album)
    )
  }, [dispatch, collectionId, is_album])

  const handleClickPublish = useCallback(() => {
    if (is_scheduled_release) {
      openEarlyReleaseConfirmation({
        contentType: 'album',
        confirmCallback: publishRelease
      })
    } else {
      openPublishConfirmation({
        contentType: is_album ? 'album' : 'playlist',
        confirmCallback: publishRelease
      })
    }
  }, [
    openEarlyReleaseConfirmation,
    openPublishConfirmation,
    is_album,
    is_scheduled_release,
    publishRelease
  ])

  const publishButtonElement = (
    <Tooltip text={messages.publish}>
      <IconButton
        icon={IconRocket}
        onClick={handleClickPublish}
        aria-label='Publish Collection'
        size='2xl'
        color='subdued'
        disabled={isDisabled}
        isLoading={_is_publishing}
        {...other}
      />
    </Tooltip>
  )

  return (
    <>
      {isDisabled ? (
        <Tooltip
          text={
            !track_count || track_count === 0
              ? messages.emptyPlaylistTooltipText
              : !cover_art_sizes
                ? messages.missingArtworkTooltipText
                : null
          }
        >
          <span>{publishButtonElement}</span>
        </Tooltip>
      ) : (
        publishButtonElement
      )}
    </>
  )
}
