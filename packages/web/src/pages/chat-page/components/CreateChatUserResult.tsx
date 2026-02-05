import { useCallback } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { User } from '@audius/common/models'
import {
  ChatPermissionAction,
  chatActions,
  chatSelectors
} from '@audius/common/store'
import { removeNullable, route } from '@audius/common/utils'
import {
  IconButton,
  IconKebabHorizontal,
  IconMessage,
  IconMessageSlash,
  IconMessageUnblock as IconUnblockMessages,
  IconUser,
  PopupMenu
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { useSelector } from 'common/hooks/useSelector'
import ArtistChip from 'components/artist/ArtistChip'
import { push } from 'utils/navigation'
import zIndex from 'utils/zIndex'

import styles from './CreateChatUserResult.module.css'
import { useComposeChat } from './useComposeChat'

const { profilePage } = route

const messages = {
  moreOptions: 'More options',
  message: 'Message This User',
  visit: "Visit User's Profile",
  block: 'Block Messages',
  unblock: 'Unblock Messages',
  notPermitted: 'Cannot Be Messaged',
  unblockRequired: 'Blocked',
  followRequired: 'Follow to Message'
}

type UserResultComposeProps = {
  user: User
  closeParentModal: () => void
  openInboxUnavailableModal: (user: User) => void
  presetMessage?: string
}

const { blockUser, unblockUser } = chatActions
const { useCanCreateChat } = chatSelectors

const renderTrigger = (
  anchorRef: React.MutableRefObject<any>,
  triggerPopup: () => void
) => (
  <IconButton
    ref={anchorRef}
    aria-label={messages.moreOptions}
    icon={IconKebabHorizontal}
    color='default'
    onClick={triggerPopup}
  />
)

const renderCustomChip = (callToAction: ChatPermissionAction) => {
  switch (callToAction) {
    case ChatPermissionAction.FOLLOW:
      return (
        <div className={styles.notPermitted}>
          <IconMessageSlash size='s' color='default' />
          <span>{messages.followRequired}</span>
        </div>
      )
    case ChatPermissionAction.UNBLOCK:
      return (
        <div className={styles.notPermitted}>
          <IconMessageSlash size='s' color='default' />
          <span>{messages.unblockRequired}</span>
        </div>
      )
    default:
      return (
        <div className={styles.notPermitted}>
          <IconMessageSlash size='s' color='default' />
          <span>{messages.notPermitted}</span>
        </div>
      )
  }
}

export const CreateChatUserResult = (props: UserResultComposeProps) => {
  const dispatch = useDispatch()
  const { user, closeParentModal, openInboxUnavailableModal, presetMessage } =
    props
  const { data: currentUserId } = useCurrentUserId()
  const blockeeList = useSelector(chatSelectors.getBlockees)
  const isBlockee = blockeeList.includes(user.user_id)

  const { canCreateChat, callToAction } = useCanCreateChat(user.user_id)

  const handleComposeClicked = useComposeChat({
    user,
    onOpenChat: closeParentModal,
    onInboxUnavailable: openInboxUnavailableModal,
    presetMessage
  })

  const handleVisitClicked = useCallback(() => {
    dispatch(push(profilePage(user.handle)))
    closeParentModal()
  }, [dispatch, user, closeParentModal])

  const handleBlockClicked = useCallback(() => {
    dispatch(blockUser({ userId: user.user_id }))
  }, [dispatch, user])

  const handleUnblockClicked = useCallback(() => {
    dispatch(unblockUser({ userId: user.user_id }))
  }, [dispatch, user])

  const items = [
    canCreateChat
      ? {
          icon: <IconMessage />,
          text: messages.message,
          onClick: handleComposeClicked
        }
      : null,
    { icon: <IconUser />, text: messages.visit, onClick: handleVisitClicked },
    isBlockee
      ? {
          icon: <IconUnblockMessages />,
          text: messages.unblock,
          onClick: handleUnblockClicked
        }
      : {
          icon: <IconMessageSlash />,
          text: messages.block,
          onClick: handleBlockClicked
        }
  ].filter(removeNullable)

  if (currentUserId === user.user_id) {
    return null
  }

  return (
    <div className={styles.root}>
      <ArtistChip
        className={styles.artistChip}
        userId={user.user_id}
        showPopover={false}
        customChips={canCreateChat ? null : renderCustomChip(callToAction)}
        onClickArtistName={handleComposeClicked}
      />
      <PopupMenu
        renderTrigger={renderTrigger}
        items={items}
        zIndex={zIndex.MODAL_OVERFLOW_MENU_POPUP}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      />
    </div>
  )
}
