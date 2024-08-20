import { useCallback, useMemo } from 'react'

import { useAppContext } from '@audius/common/context'
import { useIsManagedAccount } from '@audius/common/hooks'
import { Name, UserManagerMetadata } from '@audius/common/models'
import { useRemoveManager } from '@audius/common/src/api/account'
import { accountSelectors, chatSelectors } from '@audius/common/store'
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
import { useSelector } from 'utils/reducer'
import zIndex from 'utils/zIndex'

import { ArtistInfo } from './ArtistInfo'

const { profilePage } = route
const { getUserId } = accountSelectors
const { getCanCreateChat } = chatSelectors

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
  const currentUserId = useSelector(getUserId)
  const isManagerMode = useIsManagedAccount()
  const isPending = grant?.is_approved == null

  const navigate = useNavigateToPage()
  const goToProfile = useCallback(() => {
    navigate(profilePage(manager.handle))
  }, [navigate, manager])

  const {
    analytics: { track, make }
  } = useAppContext()

  const [cancelPendingInvite] = useRemoveManager()

  const { canCreateChat } = useSelector((state) =>
    getCanCreateChat(state, { userId: manager.user_id })
  )

  const composeChat = useComposeChat({
    // @ts-expect-error - This wants a User, but works with UserMetadata
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

    track(
      make({
        eventName: Name.MANAGER_MODE_CANCEL_INVITE,
        managerId: currentUserId
      })
    )
    cancelPendingInvite({
      userId: currentUserId,
      managerUserId: manager.user_id
    })
  }, [currentUserId, manager.user_id, make, track, cancelPendingInvite])

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
