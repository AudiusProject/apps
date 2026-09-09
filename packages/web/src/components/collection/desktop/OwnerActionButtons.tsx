import { useCallback } from 'react'

import { useCollection } from '@audius/common/api'
import { useAddTracksByUrlModal } from '@audius/common/store'
import { IconButton, IconLink, Tooltip } from '@audius/harmony'
import { pick } from 'lodash'

import { EditButton } from './EditButton'
import { OverflowMenuButton } from './OverflowMenuButton'
import { PublishButton } from './PublishButton'
import { ShareButton } from './ShareButton'

const messages = {
  addTracksByUrl: 'Add Tracks by URL'
}

type OwnerActionButtonProps = {
  collectionId: number
}

export const OwnerActionButtons = (props: OwnerActionButtonProps) => {
  const { collectionId } = props
  const { data: partialCollection } = useCollection(collectionId, {
    select: (collection) =>
      pick(
        collection,
        'is_private',
        'is_album',
        'playlist_contents',
        'ddex_app'
      )
  })
  const { is_private, is_album, playlist_contents, ddex_app } =
    partialCollection ?? {}
  const track_count = playlist_contents?.track_ids.length ?? 0

  const isDisabled = !track_count || track_count === 0
  const { onOpen: openAddTracksByUrlModal } = useAddTracksByUrlModal()

  const handleOpenAddTracksByUrl = useCallback(() => {
    openAddTracksByUrlModal({ collectionId, isAlbum: !!is_album })
  }, [collectionId, is_album, openAddTracksByUrlModal])

  if (!partialCollection) return null

  return (
    <>
      {ddex_app ? null : <EditButton collectionId={collectionId} />}
      {!is_album && !ddex_app ? (
        <Tooltip text={messages.addTracksByUrl}>
          <IconButton
            color='subdued'
            icon={IconLink}
            size='2xl'
            aria-label={messages.addTracksByUrl}
            onClick={handleOpenAddTracksByUrl}
          />
        </Tooltip>
      ) : null}
      <ShareButton
        collectionId={collectionId}
        disabled={isDisabled}
        tooltipText={
          isDisabled
            ? `You can’t share an empty ${is_album ? 'album' : 'playlist'}.`
            : undefined
        }
      />
      {is_private ? <PublishButton collectionId={collectionId} /> : null}

      <OverflowMenuButton collectionId={collectionId} isOwner />
    </>
  )
}
