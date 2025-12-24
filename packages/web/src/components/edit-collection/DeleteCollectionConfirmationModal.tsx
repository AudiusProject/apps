import { useCallback } from 'react'

import { useCurrentAccount, useDeleteCollection } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { useNavigate } from 'react-router'
import { SetRequired } from 'type-fest'

import { DeleteConfirmationModal } from 'components/delete-confirmation'
import { DeleteConfirmationModalProps } from 'components/delete-confirmation/DeleteConfirmationModal'
import { useLastLocation } from 'hooks/useLastLocation'

const { FEED_PAGE } = route

const messages = {
  edit: 'Edit',
  delete: 'Delete',
  title: {
    playlist: 'Playlist',
    album: 'Album'
  },
  type: {
    playlist: 'Playlist',
    album: 'Album'
  }
}

type DeleteCollectionConfirmationModalProps = SetRequired<
  Partial<DeleteConfirmationModalProps>,
  'visible' | 'onCancel'
> & {
  collectionId: ID
}

export const DeleteCollectionConfirmationModal = (
  props: DeleteCollectionConfirmationModalProps
) => {
  const navigate = useNavigate()
  const lastLocation = useLastLocation()
  const { collectionId, visible, onCancel, onDelete } = props
  const { data: accountCollection } = useCurrentAccount({
    select: (account) => account?.collections?.[collectionId]
  })
  const { is_album, permalink } = accountCollection ?? {}
  const { mutateAsync: deleteCollection, isPending: isDeleting } =
    useDeleteCollection()

  const handleDelete = useCallback(async () => {
    try {
      await deleteCollection({
        collectionId,
        source: 'delete_collection_confirmation_modal'
      })
      onDelete?.()

      if (lastLocation?.pathname === permalink) {
        navigate(FEED_PAGE, { replace: true })
      }
    } catch (error) {
      console.error('Failed to delete collection:', error)
      // Error is handled by the mutation's onError callback
    }
  }, [
    deleteCollection,
    collectionId,
    onDelete,
    lastLocation?.pathname,
    permalink,
    navigate
  ])

  const entity = is_album ? messages.type.album : messages.type.playlist
  const title = `${messages.delete} ${is_album ? messages.title.album : messages.title.playlist}`

  return (
    <DeleteConfirmationModal
      title={title}
      entity={entity}
      visible={visible}
      onCancel={onCancel}
      onDelete={handleDelete}
      isDeleting={isDeleting}
    />
  )
}
