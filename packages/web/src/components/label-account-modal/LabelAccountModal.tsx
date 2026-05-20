import { useCallback, useState } from 'react'

import { useCurrentUserId, useUpdateProfile, useUser } from '@audius/common/api'
import {
  Flex,
  Text,
  Modal,
  ModalHeader,
  ModalTitle,
  IconUserList,
  Switch,
  Button
} from '@audius/harmony'

const messages = {
  title: 'Label Account',
  error: 'Something went wrong. Please try again.',
  description: 'Identify as a record label on your Audius profile.',
  identifyAsLabel: 'Identify as a label',
  done: 'Done'
}

type LabelAccountModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const LabelAccountModal = (props: LabelAccountModalProps) => {
  const { isOpen, onClose } = props
  const { data: currentUserId } = useCurrentUserId()
  const { data: user } = useUser(currentUserId)
  const [isLabel, setIsLabel] = useState(user?.profile_type === 'label')
  const updateProfile = useUpdateProfile()

  const handleToggle = useCallback(() => {
    if (!user) return
    const newIsLabel = !isLabel
    setIsLabel(newIsLabel)
    updateProfile.mutate({
      ...user,
      profile_type: newIsLabel ? 'label' : null
    })
  }, [updateProfile, isLabel, user])

  return (
    <Modal onClose={onClose} isOpen={isOpen} size='small'>
      <ModalHeader onClose={onClose}>
        <ModalTitle title={messages.title} icon={<IconUserList />} />
      </ModalHeader>
      <Flex direction='column' p='xl' gap='xl'>
        <Flex>
          <Text>{messages.description}</Text>
        </Flex>

        <Flex alignItems='center' gap='l'>
          <Switch checked={isLabel} onChange={handleToggle} />
          <Text>{messages.identifyAsLabel}</Text>
        </Flex>
        <Button variant='secondary' fullWidth onClick={onClose}>
          {messages.done}
        </Button>
      </Flex>
    </Modal>
  )
}
