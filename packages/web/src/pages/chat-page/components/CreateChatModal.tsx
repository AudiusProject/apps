import { useCallback, useEffect } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { ID, User } from '@audius/common/models'
import {
  chatActions,
  useCreateChatModal,
  createChatModalActions,
  useInboxUnavailableModal,
  userListActions,
  followersUserListActions,
  FOLLOWERS_USER_LIST_TAG
} from '@audius/common/store'
import { IconCompose } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { SearchUsersModal } from 'components/search-users-modal/SearchUsersModal'
import { CreateChatUserResult } from 'pages/chat-page/components/CreateChatUserResult'

import { ChatBlastCTA } from './ChatBlastCTA'
import { CreateChatEmptyResults } from './CreateChatEmptyResults'

const DEBOUNCE_MS = 500
const messages = {
  title: 'New Message'
}

const { fetchBlockers, fetchMoreChats, fetchPermissions } = chatActions

const CreateChatModal = () => {
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()
  const { isOpen, onClose, onClosed, data } = useCreateChatModal()
  const { onOpen: openInboxUnavailableModal } = useInboxUnavailableModal()
  const { onCancelAction, presetMessage, defaultUserList } = data

  const handleCancel = useCallback(() => {
    if (onCancelAction) {
      dispatch(onCancelAction)
    }
  }, [onCancelAction, dispatch])

  const loadMore = useCallback(() => {
    if (currentUserId) {
      if (defaultUserList === 'chats') {
        dispatch(fetchMoreChats())
      } else {
        dispatch(followersUserListActions.setFollowers(currentUserId))
        dispatch(userListActions.loadMore(FOLLOWERS_USER_LIST_TAG))
      }
    }
  }, [dispatch, defaultUserList, currentUserId])

  const handleOpenInboxUnavailableModal = useCallback(
    (user: User) => {
      openInboxUnavailableModal({
        userId: user.user_id,
        presetMessage,
        // Previously dispatched `searchUsersModalActions.searchUsers({ query: '' })`
        // here to clear the search slice. Search query state is now per-component
        // local state inside `SearchUsersModal`, so the explicit reset is no longer
        // necessary — the modal will reset its own input when re-opened.
        onCancelAction: createChatModalActions.open(data)
      })
      onClose()
    },
    [data, presetMessage, openInboxUnavailableModal, onClose]
  )

  useEffect(() => {
    loadMore()
  }, [loadMore])

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchBlockers())
    }
  }, [dispatch, isOpen])

  const onFetchResults = useCallback(
    (userIds: ID[]) => {
      if (userIds.length > 0) {
        dispatch(fetchPermissions({ userIds }))
      }
    },
    [dispatch]
  )

  return (
    <>
      <SearchUsersModal
        titleProps={{ title: messages.title, icon: <IconCompose /> }}
        renderUser={(user, closeParentModal) => (
          <CreateChatUserResult
            key={user.user_id}
            user={user}
            openInboxUnavailableModal={handleOpenInboxUnavailableModal}
            closeParentModal={closeParentModal}
            presetMessage={presetMessage}
          />
        )}
        renderEmpty={() => <CreateChatEmptyResults />}
        isOpen={isOpen}
        onClose={onClose}
        onFetchResults={onFetchResults}
        debounceMs={DEBOUNCE_MS}
        onClosed={onClosed}
        onCancel={handleCancel}
        footer={<ChatBlastCTA onClick={onClose} />}
      />
    </>
  )
}

export default CreateChatModal
