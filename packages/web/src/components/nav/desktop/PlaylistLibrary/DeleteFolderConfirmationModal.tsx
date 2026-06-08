import { useCallback } from 'react'

import { useCurrentAccount, useUpdatePlaylistLibrary } from '@audius/common/api'
import { Name } from '@audius/common/models'
import { playlistLibraryHelpers } from '@audius/common/store'
import { SetRequired } from 'type-fest'

import { useRecord, make } from 'common/store/analytics/actions'
import { DeleteConfirmationModal } from 'components/delete-confirmation'
import { DeleteConfirmationModalProps } from 'components/delete-confirmation/DeleteConfirmationModal'

const { removePlaylistFolderInLibrary } = playlistLibraryHelpers

const messages = {
  confirmDeleteFolderModalTitle: 'Delete Folder',
  confirmDeleteFolderModalHeader:
    'Are you sure you want to delete this folder?',
  confirmDeleteFolderModalDescription:
    'Any playlists inside will be moved out before the folder is deleted.',
  folderEntity: 'Folder'
}

type DeleteFolderConfirmationModalProps = SetRequired<
  Partial<DeleteConfirmationModalProps>,
  'visible' | 'onCancel'
> & {
  folderId: string
}

export const DeleteFolderConfirmationModal = (
  props: DeleteFolderConfirmationModalProps
) => {
  const { folderId, visible, onCancel, onDelete } = props
  const { data: accountData } = useCurrentAccount({
    select: (account) => ({
      playlistLibrary: account?.playlistLibrary,
      folder: account?.playlistLibrary?.contents.find(
        (item) => item.type === 'folder' && item.id === folderId
      )
    })
  })
  const { playlistLibrary, folder } = accountData ?? {}
  const record = useRecord()
  const { mutate: updatePlaylistLibrary } = useUpdatePlaylistLibrary()

  const handleDelete = useCallback(() => {
    if (!playlistLibrary || !folder) return
    const newLibrary = removePlaylistFolderInLibrary(playlistLibrary, folderId)
    updatePlaylistLibrary(newLibrary)

    record(make(Name.FOLDER_DELETE, {}))
    onDelete?.()
  }, [
    folder,
    folderId,
    onDelete,
    playlistLibrary,
    record,
    updatePlaylistLibrary
  ])

  return (
    <DeleteConfirmationModal
      header={messages.confirmDeleteFolderModalHeader}
      description={messages.confirmDeleteFolderModalDescription}
      title={messages.confirmDeleteFolderModalTitle}
      entity={messages.folderEntity}
      onDelete={handleDelete}
      onCancel={onCancel}
      visible={visible}
    />
  )
}
