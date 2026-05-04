import { useCallback, useState } from 'react'

import { useCurrentAccount, useUpdatePlaylistLibrary } from '@audius/common/api'
import { Name, PlaylistLibraryFolder } from '@audius/common/models'
import { playlistLibraryHelpers } from '@audius/common/store'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  IconFolder
} from '@audius/harmony'

import { make, useRecord } from 'common/store/analytics/actions'
import FolderForm from 'components/create-playlist/FolderForm'
import { DeleteFolderConfirmationModal } from 'components/nav/desktop/PlaylistLibrary/DeleteFolderConfirmationModal'
import { zIndex } from 'utils/zIndex'

import styles from './EditFolderModal.module.css'

const { renamePlaylistFolderInLibrary } = playlistLibraryHelpers

const messages = {
  editFolderModalTitle: 'Edit Folder',
  folderEntity: 'Folder'
}

type EditFolderModalProps = {
  isOpen: boolean
  onClose: () => void
  folder: PlaylistLibraryFolder
}

export const EditFolderModal = (props: EditFolderModalProps) => {
  const { isOpen, onClose, folder } = props
  const record = useRecord()
  const { data: playlistLibrary } = useCurrentAccount({
    select: (account) => account?.playlistLibrary
  })
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const onCloseDeleteConfirmation = () => setShowDeleteConfirmation(false)

  const { mutate: updatePlaylistLibrary } = useUpdatePlaylistLibrary()

  const handleCancel = useCallback(() => {
    record(make(Name.FOLDER_CANCEL_EDIT, {}))
    onClose()
  }, [onClose, record])

  const handleSubmit = useCallback(
    (newName: string) => {
      if (playlistLibrary != null && newName !== folder.name) {
        const newLibrary = renamePlaylistFolderInLibrary(
          playlistLibrary,
          folder.id,
          newName
        )
        updatePlaylistLibrary(newLibrary)
      }
      record(make(Name.FOLDER_SUBMIT_EDIT, {}))
      onClose()
    },
    [folder, onClose, playlistLibrary, record, updatePlaylistLibrary]
  )

  const handleConfirmDelete = useCallback(() => {
    setShowDeleteConfirmation(true)
  }, [])

  const handleDelete = useCallback(() => {
    setShowDeleteConfirmation(false)
    onClose()
  }, [onClose])

  return (
    <>
      <Modal
        modalKey='editfolder'
        isOpen={isOpen}
        onClose={onClose}
        zIndex={zIndex.EDIT_PLAYLIST_MODAL}
        bodyClassName={styles.modalBody}
      >
        <ModalHeader onClose={onClose}>
          <ModalTitle
            icon={<IconFolder />}
            title={messages.editFolderModalTitle}
          />
        </ModalHeader>
        <ModalContent>
          <FolderForm
            isEditMode
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDelete={handleConfirmDelete}
            initialFolderName={folder.name}
          />
        </ModalContent>
      </Modal>
      <DeleteFolderConfirmationModal
        folderId={folder.id}
        visible={showDeleteConfirmation}
        onCancel={onCloseDeleteConfirmation}
        onDelete={handleDelete}
      />
    </>
  )
}
