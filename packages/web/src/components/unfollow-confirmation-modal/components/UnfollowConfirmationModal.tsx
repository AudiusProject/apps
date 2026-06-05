import { ID } from '@audius/common/models'

import BottomSheetActionDrawer from 'components/action-drawer/BottomSheetActionDrawer'

type UnfollowConfirmationModalProps = {
  isOpen: boolean
  onClose: () => void
  unfollowUser: (userId: ID) => void
  userId: ID
}

const messages = {
  unfollow: 'Unfollow',
  cancel: 'Cancel'
}

const actions = [
  { text: messages.unfollow, isDestructive: true },
  { text: messages.cancel }
]

const UnfollowConfirmationModal = ({
  isOpen,
  onClose,
  userId,
  unfollowUser
}: UnfollowConfirmationModalProps) => {
  const actionCallbacks = [
    () => {
      unfollowUser(userId)
      onClose()
    },
    () => {
      onClose()
    }
  ]

  const didSelectRow = (row: number) => {
    actionCallbacks[row]()
  }

  return (
    <BottomSheetActionDrawer
      isOpen={isOpen}
      onClose={onClose}
      actions={actions}
      didSelectRow={didSelectRow}
      ariaLabel={messages.unfollow}
    />
  )
}

export default UnfollowConfirmationModal
