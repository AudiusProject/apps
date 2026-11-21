import { useCallback, useEffect } from 'react'

import { useIsManagedAccount } from '@audius/common/hooks'

import { useToast } from 'app/hooks/useToast'

export const managedAccountNotAllowedMessage =
  "You can't do that as a managed user"

export const useManagedAccountNotAllowedCallback = ({
  trigger,
  callback
}: {
  trigger: boolean
  callback: () => void
}) => {
  const isManagedAccount = useIsManagedAccount()
  const { toast } = useToast()

  useEffect(() => {
    if (isManagedAccount && trigger) {
      callback()
      toast({ content: managedAccountNotAllowedMessage })
    }
  }, [isManagedAccount, callback, toast, trigger])
}

export const useManagedAccountGuard = () => {
  const isManagedAccount = useIsManagedAccount()
  const { toast } = useToast()

  return useCallback(
    <Args extends unknown[]>(action: (...args: Args) => void) =>
      (...args: Args) => {
        if (isManagedAccount) {
          toast({ content: managedAccountNotAllowedMessage })
          return
        }
        action(...args)
      },
    [isManagedAccount, toast]
  )
}
