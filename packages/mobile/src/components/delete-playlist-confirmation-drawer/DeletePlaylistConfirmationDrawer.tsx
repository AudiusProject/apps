import { useCallback } from 'react'

import { useCollection, useDeleteCollection } from '@audius/common/api'
import { deletePlaylistConfirmationModalUISelectors } from '@audius/common/store'
import { fillString } from '@audius/common/utils'
import { useSelector } from 'react-redux'

import { useNavigation } from 'app/hooks/useNavigation'

import { useDrawerState } from '../drawer'
import { ConfirmationDrawer } from '../drawers'
const { getPlaylistId } = deletePlaylistConfirmationModalUISelectors

const messages = {
  header: 'Delete Playlist?',
  description: 'Are you sure you want to delete your playlist, %0?',
  confirm: 'Delete',
  confirmLoading: 'Deleting...',
  cancel: 'Cancel'
}

const modalName = 'DeletePlaylistConfirmation'

export const DeletePlaylistConfirmationDrawer = () => {
  const playlistId = useSelector(getPlaylistId)
  const { data: collection } = useCollection(playlistId)
  const playlistName = collection?.playlist_name
  const navigation = useNavigation()
  const { onClose } = useDrawerState(modalName)
  const { mutateAsync: deleteCollection, isPending } = useDeleteCollection()

  const handleConfirm = useCallback(async () => {
    if (playlistId) {
      try {
        await deleteCollection({ collectionId: playlistId })
        onClose()
        navigation.goBack()
      } catch (error) {
        console.error('Failed to delete playlist:', error)
        // Error is handled by the mutation's onError callback
      }
    }
    onClose()
  }, [deleteCollection, playlistId, navigation, onClose])

  if (!playlistId || !playlistName) return null

  const dynamicMessages = {
    ...messages,
    description: fillString(messages.description, playlistName)
  }

  return (
    <ConfirmationDrawer
      modalName={modalName}
      messages={dynamicMessages}
      onConfirm={handleConfirm}
      isConfirming={isPending}
    />
  )
}
