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
import { useDispatch } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import { make, useRecord } from 'common/store/analytics/actions'
import FolderForm from 'components/create-playlist/FolderForm'
import { DeleteFolderConfirmationModal } from 'components/nav/desktop/PlaylistLibrary/DeleteFolderConfirmationModal'
import { getFolderId } from 'store/application/ui/editFolderModal/selectors'
import { setFolderId } from 'store/application/ui/editFolderModal/slice'
import { useSelector } from 'utils/reducer'
import { zIndex } from 'utils/zIndex'

import styles from './EditFolderModal.module.css'
const { renamePlaylistFolderInLibrary } = playlistLibraryHelpers

const messages = {
  editFolderModalTitle: 'Edit Folder',
  folderEntity: 'Folder'
}

const EditFolderModal = () => {
  const record = useRecord()
  const folderId = useSelector(getFolderId)
  const { data: playlistLibrary } = useCurrentAccount({
    select: (account) => account?.playlistLibrary
  })
  const [isOpen, setIsOpen] = useModalState('EditFolder')
  const folder =
    playlistLibrary == null || folderId == null
      ? null
      : (playlistLibrary.contents.find(
          (item) => item.type === 'folder' && item.id === folderId
        ) as PlaylistLibraryFolder | undefined)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const onCloseDeleteConfirmation = () => setShowDeleteConfirmation(false)

  const dispatch = useDispatch()
  const { mutate: updatePlaylistLibrary } = useUpdatePlaylistLibrary()

  const handleClose = useCallback(() => {
    dispatch(setFolderId(null))
    setIsOpen(false)
  }, [dispatch, setIsOpen])

  const handleCancel = useCallback(() => {
    record(make(Name.FOLDER_CANCEL_EDIT, {}))
    handleClose()
  }, [handleClose, record])

  const handleSubmit = useCallback(
    (newName: string) => {
      if (
        !(playlistLibrary == null || folderId == null || folder == null) &&
        newName !== folder.name
      ) {
        const newLibrary = renamePlaylistFolderInLibrary(
          playlistLibrary,
          folderId,
          newName
        )
        updatePlaylistLibrary(newLibrary)
      }
      record(make(Name.FOLDER_SUBMIT_EDIT, {}))
      handleClose()
    },
    [
      folder,
      folderId,
      handleClose,
      playlistLibrary,
      record,
      updatePlaylistLibrary
    ]
  )

  const handleConfirmDelete = useCallback(() => {
    setShowDeleteConfirmation(true)
  }, [])

  const handleDelete = useCallback(() => {
    setShowDeleteConfirmation(false)
    handleClose()
  }, [handleClose])

  return (
    <>
      <Modal
        modalKey='editfolder'
        isOpen={isOpen}
        onClose={handleClose}
        zIndex={zIndex.EDIT_PLAYLIST_MODAL}
        bodyClassName={styles.modalBody}
      >
        <ModalHeader onClose={handleClose}>
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
            initialFolderName={folder?.name}
          />
        </ModalContent>
      </Modal>
      {folder ? (
        <DeleteFolderConfirmationModal
          folderId={folder.id}
          visible={showDeleteConfirmation}
          onCancel={onCloseDeleteConfirmation}
          onDelete={handleDelete}
        />
      ) : null}
    </>
  )
}

export default EditFolderModal
