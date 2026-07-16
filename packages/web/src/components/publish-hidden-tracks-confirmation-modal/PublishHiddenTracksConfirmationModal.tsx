import { useCallback } from 'react'

import { registerNiceModalId } from '@audius/common/services'
import {
  keepHiddenTracksPrivate,
  publishHiddenTracksConfirmed,
  usePublishHiddenTracksConfirmationModal
} from '@audius/common/store'
import {
  Button,
  Modal,
  ModalContent,
  ModalContentText,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  IconRocket
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { useDispatch } from 'react-redux'

const getMessages = (
  contentType: 'album' | 'playlist',
  hiddenTrackCount: number
) => {
  const tracks = hiddenTrackCount === 1 ? 'track' : 'tracks'
  return {
    title: 'Publish Hidden Tracks?',
    description: `This ${contentType} contains ${hiddenTrackCount} hidden ${tracks}. Making it public will also make ${
      hiddenTrackCount === 1 ? 'that track' : 'those tracks'
    } public and notify your followers.`,
    keepPrivate: 'Keep Tracks Hidden',
    publishAll: `Publish ${contentType === 'album' ? 'Album' : 'Playlist'} & ${
      hiddenTrackCount === 1 ? 'Track' : 'Tracks'
    }`
  }
}

export const PublishHiddenTracksConfirmationModal = NiceModal.create(() => {
  const modal = useModal()
  const dispatch = useDispatch()
  const { data } = usePublishHiddenTracksConfirmationModal()
  const { contentType, hiddenTrackCount } = data

  const messages = getMessages(contentType, hiddenTrackCount)

  // Both paths publish the collection itself; they differ only in whether the
  // hidden tracks come along. Dismissing (esc / overlay / X) takes the
  // conservative path so tracks are never published by accident.
  const handleKeepPrivate = useCallback(() => {
    dispatch(keepHiddenTracksPrivate())
    modal.hide()
  }, [dispatch, modal])

  const handlePublishAll = useCallback(() => {
    dispatch(publishHiddenTracksConfirmed())
    modal.hide()
  }, [dispatch, modal])

  return (
    <Modal isOpen={modal.visible} onClose={handleKeepPrivate} size='small'>
      <ModalHeader>
        <ModalTitle icon={<IconRocket />} title={messages.title} />
      </ModalHeader>
      <ModalContent>
        <ModalContentText css={{ textAlign: 'center' }}>
          {messages.description}
        </ModalContentText>
      </ModalContent>
      <ModalFooter>
        <Button fullWidth variant='secondary' onClick={handleKeepPrivate}>
          {messages.keepPrivate}
        </Button>
        <Button fullWidth variant='primary' onClick={handlePublishAll}>
          {messages.publishAll}
        </Button>
      </ModalFooter>
    </Modal>
  )
})

NiceModal.register(
  'PublishHiddenTracksConfirmation',
  PublishHiddenTracksConfirmationModal
)
registerNiceModalId('PublishHiddenTracksConfirmation')
