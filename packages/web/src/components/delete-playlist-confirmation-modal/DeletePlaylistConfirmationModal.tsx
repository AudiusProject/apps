import { useCallback, useContext, useMemo } from 'react'

import { useDeleteCollection } from '@audius/common/api'
import { registerNiceModalId } from '@audius/common/services'
import { deletePlaylistConfirmationModalUISelectors } from '@audius/common/store'
import { route } from '@audius/common/utils'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { useDispatch, useSelector } from 'react-redux'

import ActionSheetModal from 'components/action-drawer/ActionDrawer'
import { RouterContext } from 'components/animated-switch/RouterContextProvider'
import { push } from 'utils/navigation'

const { TRENDING_PAGE } = route
const { getPlaylistId } = deletePlaylistConfirmationModalUISelectors

const messages = {
  delete: 'Delete',
  cancel: 'Cancel'
}

const actions = [
  { text: messages.delete, isDestructive: true },
  { text: messages.cancel }
]

const DeletePlaylistConfirmationModal = NiceModal.create(() => {
  const modal = useModal()
  const playlistId = useSelector(getPlaylistId) ?? -1
  const { mutateAsync: deleteCollection } = useDeleteCollection()
  const dispatch = useDispatch()
  const { setStackReset } = useContext(RouterContext)

  const handleClose = useCallback(() => {
    modal.hide()
  }, [modal])

  const handleDelete = useCallback(async () => {
    try {
      await deleteCollection({ collectionId: playlistId })
      setStackReset(true)
      // Navigate to trending page after successful deletion
      dispatch(push(TRENDING_PAGE))
      handleClose()
    } catch (error) {
      console.error('Failed to delete playlist:', error)
      // Error is handled by the mutation's onError callback
    }
  }, [deleteCollection, dispatch, setStackReset, playlistId, handleClose])

  const actionCallbacks = useMemo(
    () => [handleDelete, handleClose],
    [handleDelete, handleClose]
  )

  const didSelectRow = (row: number) => {
    actionCallbacks[row]()
  }

  return (
    <ActionSheetModal
      isOpen={modal.visible}
      onClose={handleClose}
      actions={actions}
      didSelectRow={didSelectRow}
    />
  )
})

NiceModal.register(
  'DeletePlaylistConfirmation',
  DeletePlaylistConfirmationModal
)
registerNiceModalId('DeletePlaylistConfirmation')

export default DeletePlaylistConfirmationModal
