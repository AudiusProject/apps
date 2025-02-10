import { useCallback } from 'react'

import { Name } from '@audius/common/models'
import { signOutActions } from '@audius/common/store'
import {
  Button,
  Modal,
  ModalContent,
  ModalContentText,
  ModalFooter,
  ModalHeader,
  ModalProps,
  ModalTitle
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'

const { signOut } = signOutActions

const messages = {
  title: 'Hold Up!',
  nevermind: 'Nevermind',
  signOut: 'Sign Out',
  signOutButton: 'Sign Out',
  confirmSignOut: 'Are you sure you want to sign out?',
  warning:
    'Double check that you have an account recovery email just in case (resend from your settings).'
}

type SignOutModalProps = Omit<ModalProps, 'children'>

const SignOutModal = (props: SignOutModalProps) => {
  const { onClose } = props
  const record = useRecord()
  const dispatch = useDispatch()

  const handleSignOut = useCallback(() => {
    record(
      make(Name.SETTINGS_LOG_OUT, {
        callback: () => dispatch(signOut({}))
      })
    )
  }, [record, dispatch])

  return (
    <Modal {...props}>
      <ModalHeader>
        <ModalTitle title={messages.title} />
      </ModalHeader>
      <ModalContent>
        <ModalContentText>{messages.confirmSignOut}</ModalContentText>

        <ModalContentText>{messages.warning}</ModalContentText>
      </ModalContent>
      <ModalFooter>
        <Button variant='primary' onClick={onClose} fullWidth>
          {messages.nevermind}
        </Button>
        <Button variant='secondary' onClick={handleSignOut} fullWidth>
          {messages.signOutButton}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default SignOutModal
