import { useCallback, useContext, useEffect } from 'react'

import {
  useCurrentUserId,
  useCurrentWeb3Account,
  useRemoveManager
} from '@audius/common/api'
import { useAccountSwitcher } from '@audius/common/hooks'
import { Button, Flex, Text } from '@audius/harmony'

import { ToastContext } from 'components/toast/ToastContext'

import { sharedMessages } from './sharedMessages'

const messages = {
  cancel: 'Cancel',
  remove: 'Remove',
  errorGeneral: 'Something went wrong.'
}

type RemoveManagerConfirmationContentProps = {
  confirmationMessage: string
  onSuccess: () => void
  onCancel: () => void
  userId: number
  managerUserId: number
}

export const RemoveManagerConfirmationContent = ({
  confirmationMessage,
  userId,
  managerUserId,
  onSuccess,
  onCancel
}: RemoveManagerConfirmationContentProps) => {
  const {
    mutate: removeManager,
    isPending,
    isSuccess,
    isError
  } = useRemoveManager()
  const { data: currentWeb3User } = useCurrentWeb3Account()
  const { data: currentUserId } = useCurrentUserId()
  const managerIsCurrentWeb3User = currentWeb3User?.user_id === managerUserId
  const { switchToWeb3User } = useAccountSwitcher()
  const { toast } = useContext(ToastContext)

  const handleDelete = useCallback(() => {
    if (!userId || !managerUserId) return
    removeManager({ userId, managerUserId })
  }, [userId, managerUserId, removeManager])

  useEffect(() => {
    if (isSuccess) {
      onSuccess()
      // If we are currently switched into this user and removing ourselves
      // as manager, switch back to primary account
      if (currentUserId === userId && managerIsCurrentWeb3User)
        switchToWeb3User()
    }
  }, [
    currentUserId,
    managerIsCurrentWeb3User,
    switchToWeb3User,
    userId,
    isSuccess,
    onSuccess
  ])

  // error handling
  useEffect(() => {
    if (isError) {
      toast(sharedMessages.somethingWentWrong)
    }
  }, [isError, toast])

  if (!managerUserId) return null

  return (
    <Flex direction='column' gap='xl'>
      <Text variant='body' size='l'>
        {confirmationMessage}
      </Text>
      <Flex gap='s'>
        <Button
          variant='secondary'
          onClick={onCancel}
          disabled={isPending}
          fullWidth
        >
          {messages.cancel}
        </Button>
        <Button
          variant='destructive'
          fullWidth
          onClick={handleDelete}
          isLoading={isPending}
        >
          {messages.remove}
        </Button>
      </Flex>
      {isError ? (
        <Text textAlign='center' color='danger' variant='body'>
          {messages.errorGeneral}
        </Text>
      ) : null}
    </Flex>
  )
}
