import { useCallback } from 'react'

import { useDeleteTrack } from '@audius/common/api'
import { registerNiceModalId } from '@audius/common/services'
import { useDeleteTrackConfirmationModal } from '@audius/common/store'
import NiceModal, { useModal } from '@ebay/nice-modal-react'

import { DeleteConfirmationModal } from 'components/delete-confirmation'

const messages = {
  delete: 'Delete Track',
  track: 'Track'
}

export const DeleteTrackConfirmationModal = NiceModal.create(() => {
  const modal = useModal()
  const { data } = useDeleteTrackConfirmationModal()
  const { trackId } = data
  const { mutateAsync: deleteTrack } = useDeleteTrack()

  const handleClose = useCallback(() => {
    modal.hide()
  }, [modal])

  const handleConfirm = useCallback(() => {
    if (!trackId) return
    deleteTrack({ trackId, source: 'delete_track_confirmation_modal' })
    handleClose()
  }, [trackId, deleteTrack, handleClose])

  return (
    <DeleteConfirmationModal
      title={messages.delete}
      entity={messages.track}
      visible={modal.visible}
      onCancel={handleClose}
      onDelete={handleConfirm}
    />
  )
})

NiceModal.register('DeleteTrackConfirmation', DeleteTrackConfirmationModal)
registerNiceModalId('DeleteTrackConfirmation')
