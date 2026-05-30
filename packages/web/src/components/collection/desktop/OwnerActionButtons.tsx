import { useCollection } from '@audius/common/api'
import { pick } from 'lodash'

import { EditButton } from './EditButton'
import { OverflowMenuButton } from './OverflowMenuButton'
import { PublishButton } from './PublishButton'
import { ShareButton } from './ShareButton'

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

  if (!partialCollection) return null

  return (
    <>
      {ddex_app ? null : <EditButton collectionId={collectionId} />}
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
