import { useCallback } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { registerNiceModalId } from '@audius/common/services'
import { tracksSocialActions, useArtistPickModal } from '@audius/common/store'
import {
  Button,
  Modal,
  ModalContent,
  ModalContentText,
  ModalFooter,
  ModalHeader,
  ModalTitle
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { useDispatch } from 'react-redux'

const { setArtistPick, unsetArtistPick } = tracksSocialActions

const messagesMap = {
  add: {
    title: 'Set your Artist Pick',
    description:
      'This track will appear at the top of your profile, above your recent uploads, until you change or remove it.',
    confirm: 'Set Track'
  },
  update: {
    title: 'Change your Artist Pick?',
    description:
      'This track will appear at the top of your profile and replace your previously picked track.',
    confirm: 'Change Track'
  },
  remove: {
    title: 'Unset as Artist Pick',
    description:
      'Are you sure you want to remove your pick? This track will be displayed based on its release date.',
    confirm: 'Unset Track'
  }
}

export const ArtistPickModal = NiceModal.create(() => {
  const modal = useModal()
  const {
    data: { trackId }
  } = useArtistPickModal()
  const dispatch = useDispatch()

  const { data: currentArtistPickId } = useCurrentAccountUser({
    select: (user) => user.artist_pick_track_id
  })

  const action = !currentArtistPickId ? 'add' : trackId ? 'update' : 'remove'

  const messages = messagesMap[action]

  const handleClose = useCallback(() => {
    modal.hide()
  }, [modal])

  const handleSubmit = () => {
    if (trackId) {
      dispatch(setArtistPick(trackId))
    } else {
      dispatch(unsetArtistPick())
    }
    handleClose()
  }

  return (
    <Modal size='small' isOpen={modal.visible} onClose={handleClose}>
      <ModalHeader>
        <ModalTitle title={messages.title} />
      </ModalHeader>
      <ModalContent>
        <ModalContentText css={{ textAlign: 'center' }}>
          {messages.description}
        </ModalContentText>
      </ModalContent>
      <ModalFooter>
        <Button variant='secondary' onClick={handleClose} fullWidth>
          Cancel
        </Button>
        <Button variant='primary' onClick={handleSubmit} fullWidth>
          {messages.confirm}
        </Button>
      </ModalFooter>
    </Modal>
  )
})

NiceModal.register('ArtistPick', ArtistPickModal)
registerNiceModalId('ArtistPick')
