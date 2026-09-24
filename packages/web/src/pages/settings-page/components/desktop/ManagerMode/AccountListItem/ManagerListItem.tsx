import { useCallback, useMemo } from 'react'

import { useCurrentUserId, useRemoveManager } from '@audius/common/api'
import { useIsManagedAccount } from '@audius/common/hooks'
import { UserManagerMetadata } from '@audius/common/models'
import { chatSelectors } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Flex,
  IconButton,
  IconKebabHorizontal,
  IconMessage,
  IconTrash,
  IconUser,
  PopupMenu,
  Text
} from '@audius/harmony'

import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { useComposeChat } from 'pages/chat-page/components/useComposeChat'
import zIndex from 'utils/zIndex'

import { ArtistInfo } from './ArtistInfo'

const { profilePage } = route
const { useCanCreateChat } = chatSelectors

const messages = {
  moreOptions: 'more options',
  removeManager: 'Remove Manager',
  visitProfile: 'Visit Profile',
  sendMessage: 'Send Message',
  invitePending: 'Invite Pending',
  cancelInvite: 'Cancel Invite'
}

type ManagerListItemProps = {
  managerData: UserManagerMetadata
  onRemoveManager: (params: { userId: number; managerUserId: number }) => void
}

export const ManagerListItem = ({
  managerData: { manager, grant },
  onRemoveManager
}: ManagerListItemProps) => {
  const { data: currentUserId } = useCurrentUserId()
  const isManagerMode = useIsManagedAccount()
  const isPending = grant?.is_approved == null

  const navigate = useNavigateToPage()
  const goToProfile = useCallback(() => {
    navigate(profilePage(manager.handle))
  }, [navigate, manager])

  const { mutate: cancelPendingInvite } = useRemoveManager()

  const { canCreateChat } = useCanCreateChat(manager.user_id)

  const composeChat = useComposeChat({
    user: manager
  })

  const handleRemoveManager = useCallback(() => {
    if (!currentUserId) return
    onRemoveManager({
      userId: currentUserId,
      managerUserId: manager.user_id
    })
  }, [currentUserId, manager.user_id, onRemoveManager])

  const handleCancelInvite = useCallback(() => {
    if (!currentUserId) return

    cancelPendingInvite({
      userId: currentUserId,
      managerUserId: manager.user_id
    })
  }, [currentUserId, manager.user_id, cancelPendingInvite])

  const popupMenuItems = useMemo(() => {
    const items = []

    items.push({
      icon: <IconTrash />,
      text: isPending ? messages.cancelInvite : messages.removeManager,
      onClick: isPending ? handleCancelInvite : handleRemoveManager
    })
    items.push({
      icon: <IconUser />,
      text: messages.visitProfile,
      onClick: goToProfile
    })

    // Don't show DM/switch options if we're in manager mode as the
    // logged in user won't have permission to do those things on behalf of a
    // managed account.
    if (canCreateChat && !isManagerMode) {
      items.push({
        icon: <IconMessage />,
        text: messages.sendMessage,
        onClick: composeChat
      })
    }

    return items
  }, [
    isManagerMode,
    isPending,
    handleCancelInvite,
    handleRemoveManager,
    goToProfile,
    composeChat,
    canCreateChat
  ])

  const renderTrigger = (
    anchorRef: React.MutableRefObject<any>,
    triggerPopup: () => void
  ) => (
    <IconButton
      ref={anchorRef}
      aria-label={messages.moreOptions}
      icon={IconKebabHorizontal}
      color='subdued'
      onClick={() => triggerPopup()}
    />
  )

  if (!manager || !currentUserId) return null

  return (
    <Flex
      alignItems='stretch'
      justifyContent='space-between'
      pl='xl'
      pr='l'
      pv='l'
      gap='l'
      border='default'
    >
      <ArtistInfo user={manager} />
      <Flex direction='column' justifyContent='space-between' alignItems='end'>
        <PopupMenu
          renderTrigger={renderTrigger}
          items={popupMenuItems}
          zIndex={zIndex.MODAL_OVERFLOW_MENU_POPUP}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        />
        {isPending ? (
          <Text variant='label' size='s' color='subdued'>
            {messages.invitePending}
          </Text>
        ) : null}
      </Flex>
    </Flex>
  )
}
