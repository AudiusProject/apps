import { useCallback, useContext } from 'react'

import { useCurrentAccountUser, useCollection } from '@audius/common/api'
import { registerNiceModalId } from '@audius/common/services'
import {
  cacheCollectionsActions,
  duplicateAddConfirmationModalUISelectors
} from '@audius/common/store'
import { fillString, route } from '@audius/common/utils'
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
import { capitalize, pick } from 'lodash'
import { useDispatch } from 'react-redux'

import { useSelector } from 'common/hooks/useSelector'
import { ToastContext } from 'components/toast/ToastContext'
import ToastLinkContent from 'components/toast/mobile/ToastLinkContent'

const { addTrackToPlaylist } = cacheCollectionsActions
const { getPlaylistId, getTrackId } = duplicateAddConfirmationModalUISelectors
const { collectionPage } = route

const messages = {
  title: 'Already Added',
  description: (collectionType: 'album' | 'playlist') =>
    `This is already in your%0 ${collectionType}`,
  cancel: "Don't Add",
  add: 'Add Anyway',
  addedToast: (collectionType: 'album' | 'playlist') =>
    `Added To ${capitalize(collectionType)}!`,
  view: 'View'
}

export const DuplicateAddConfirmationModal = NiceModal.create(() => {
  const dispatch = useDispatch()
  const { toast } = useContext(ToastContext)
  const playlistId = useSelector(getPlaylistId)
  const trackId = useSelector(getTrackId)
  const { data: partialPlaylist } = useCollection(playlistId, {
    select: (collection) =>
      pick(collection, 'is_album', 'playlist_name', 'permalink')
  })
  const { is_album, playlist_name, permalink } = partialPlaylist ?? {}
  const { data: accountHandle } = useCurrentAccountUser({
    select: (data) => data?.handle
  })
  const modal = useModal()
  const collectionType = is_album ? 'album' : 'playlist'

  const onClose = useCallback(() => {
    modal.hide()
  }, [modal])

  const handleAdd = useCallback(() => {
    if (trackId && playlistId) {
      dispatch(addTrackToPlaylist(trackId, playlistId, { silent: true }))
      if (accountHandle) {
        toast(
          <ToastLinkContent
            text={messages.addedToast(collectionType)}
            linkText={messages.view}
            link={collectionPage(
              accountHandle,
              playlist_name,
              playlistId,
              permalink,
              is_album
            )}
          />
        )
      } else {
        toast(messages.addedToast(collectionType))
      }
    }
    onClose()
  }, [
    trackId,
    playlistId,
    onClose,
    dispatch,
    accountHandle,
    toast,
    collectionType,
    playlist_name,
    permalink,
    is_album
  ])

  return (
    <Modal isOpen={modal.visible} onClose={onClose} size='small'>
      <ModalHeader>
        <ModalTitle title={messages.title} />
      </ModalHeader>
      <ModalContent>
        <ModalContentText>
          {fillString(
            messages.description(collectionType),
            playlist_name ? ` "${playlist_name}"` : ''
          )}
        </ModalContentText>
      </ModalContent>
      <ModalFooter>
        <Button variant='secondary' fullWidth onClick={handleAdd}>
          {messages.add}
        </Button>
        <Button fullWidth variant='primary' onClick={onClose}>
          {messages.cancel}
        </Button>
      </ModalFooter>
    </Modal>
  )
})

NiceModal.register('DuplicateAddConfirmation', DuplicateAddConfirmationModal)
registerNiceModalId('DuplicateAddConfirmation')
