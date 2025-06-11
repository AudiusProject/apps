import { useSelector } from 'react-redux'

import { useOtherChatUsers } from '~/api'
import { User } from '~/models/User'
import { ChatPermissionAction, CommonState } from '~/store/index'
import {
  getBlockees,
  getBlockers,
  getRecheckPermissions,
  useCanCreateChat
} from '~/store/pages/chat/selectors'

/**
 * Returns whether or not the current user can send messages to the current chat
 */
export const useCanSendMessage = (
  currentChatId?: string
): {
  canSendMessage: boolean
  callToAction: ChatPermissionAction
  // Explicitly define type as undefinable since users could be empty
  firstOtherUser: User | undefined
} => {
  const users = useOtherChatUsers(currentChatId)

  const firstOtherUser = users[0]
  const userId = firstOtherUser?.user_id

  const { canCreateChat, callToAction: createChatCallToAction } =
    useCanCreateChat(userId)
  const blockees = useSelector(getBlockees)
  const blockers = useSelector(getBlockers)
  const recheckPermissions = useSelector((state: CommonState) =>
    getRecheckPermissions(state, currentChatId)
  )

  if (!userId) {
    return {
      canSendMessage: true,
      callToAction: ChatPermissionAction.NOT_APPLICABLE,
      firstOtherUser
    }
  }
  const isBlockee = blockees.includes(userId)
  const isBlocker = blockers.includes(userId)
  if (isBlocker) {
    return {
      canSendMessage: false,
      callToAction: ChatPermissionAction.NONE,
      firstOtherUser
    }
  }
  if (isBlockee) {
    return {
      canSendMessage: false,
      callToAction: ChatPermissionAction.UNBLOCK,
      firstOtherUser
    }
  }
  if (recheckPermissions && !canCreateChat) {
    return {
      canSendMessage: false,
      callToAction: createChatCallToAction,
      firstOtherUser
    }
  }
  return {
    canSendMessage: true,
    callToAction: ChatPermissionAction.NOT_APPLICABLE,
    firstOtherUser
  }
}
