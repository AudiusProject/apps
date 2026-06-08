import { useCallback } from 'react'

import { registerNiceModalId } from '@audius/common/services'
import {
  useAlbumTrackRemoveConfirmationModal,
  cacheCollectionsActions
} from '@audius/common/store'
import {
  Button,
  Modal,
  ModalContent,
  ModalContentText,
  ModalHeader,
  ModalTitle,
  ModalFooter
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { useDispatch } from 'react-redux'

const messages = {
  title: 'Remove Track',
  description1: 'Are you sure you want to remove this track from your album?',
  description2:
    'By default, fans who have purchased your album will still have access to your track.',
  cancel: 'Cancel',
  release: 'Remove Track From Album'
}

export const AlbumTrackRemoveConfirmationModal = NiceModal.create(() => {
  const modal = useModal()
  const {
    data: { trackId, playlistId, timestamp }
  } = useAlbumTrackRemoveConfirmationModal()

  const dispatch = useDispatch()

  const handleClose = useCallback(() => {
    modal.hide()
  }, [modal])

  const handleConfirm = useCallback(() => {
    if (trackId && playlistId && timestamp) {
      dispatch(
        cacheCollectionsActions.removeTrackFromPlaylist(
          trackId,
          playlistId,
          timestamp
        )
      )
    }
    handleClose()
  }, [dispatch, handleClose, playlistId, timestamp, trackId])

  return (
    <Modal isOpen={modal.visible} onClose={handleClose} size='medium'>
      <ModalHeader>
        <ModalTitle title={messages.title} />
      </ModalHeader>
      <ModalContent css={{ textAlign: 'center' }}>
        <ModalContentText>{messages.description1}</ModalContentText>
        <ModalContentText>{messages.description2}</ModalContentText>
      </ModalContent>
      <ModalFooter>
        <Button fullWidth variant='secondary' onClick={handleClose}>
          {messages.cancel}
        </Button>
        <Button variant='destructive' fullWidth onClick={handleConfirm}>
          {messages.release}
        </Button>
      </ModalFooter>
    </Modal>
  )
})

NiceModal.register(
  'AlbumTrackRemoveConfirmation',
  AlbumTrackRemoveConfirmationModal
)
registerNiceModalId('AlbumTrackRemoveConfirmation')
