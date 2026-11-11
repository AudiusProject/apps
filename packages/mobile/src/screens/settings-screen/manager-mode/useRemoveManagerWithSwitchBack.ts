import { useCallback } from 'react'

import {
  useCurrentUserId,
  useCurrentWeb3Account,
  useRemoveManager
} from '@audius/common/api'
import { useAccountSwitcher } from '@audius/common/hooks'

import { useToast } from 'app/hooks/useToast'

import { managerModeMessages } from './messages'

/**
 * Removes a manager grant. If the signed-in user just stopped managing the
 * account they're using, switches back to their own account.
 */
export const useRemoveManagerWithSwitchBack = () => {
  const { mutate: removeManager, isPending } = useRemoveManager()
  const { data: currentWeb3User } = useCurrentWeb3Account()
  const { data: currentUserId } = useCurrentUserId()
  const { switchToWeb3User } = useAccountSwitcher()
  const { toast } = useToast()

  const remove = useCallback(
    (
      params: { userId: number; managerUserId: number },
      onSuccess?: () => void
    ) => {
      removeManager(params, {
        onSuccess: () => {
          onSuccess?.()
          if (
            currentUserId === params.userId &&
            currentWeb3User?.user_id === params.managerUserId
          ) {
            switchToWeb3User()
          }
        },
        onError: () => {
          toast({
            content: managerModeMessages.somethingWentWrong,
            type: 'error'
          })
        }
      })
    },
    [currentUserId, currentWeb3User, removeManager, switchToWeb3User, toast]
  )

  return { remove, isPending }
}
