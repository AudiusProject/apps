import { useContext, useEffect } from 'react'

import {
  useCurrentAccountUser,
  useCurrentUserId,
  useManagedAccounts
} from '@audius/common/api'
import { useIsManagedAccount } from '@audius/common/hooks'
import { route } from '@audius/common/utils'

import { ToastContext } from 'components/toast/ToastContext'

import { useNavigateToPage } from './useNavigateToPage'

const { FEED_PAGE } = route
const messages = {
  unauthorized: 'Unauthorized',
  unauthorizedAsManaged: `You can't do that as a managed user`
}

export const useManagedAccountNotAllowedRedirect = (
  route: string = FEED_PAGE
) => {
  const isManagedAccount = useIsManagedAccount()
  const navigate = useNavigateToPage()
  const { toast } = useContext(ToastContext)

  useEffect(() => {
    if (isManagedAccount) {
      navigate(route)
      toast(messages.unauthorizedAsManaged)
    }
  }, [isManagedAccount, navigate, route, toast])
}

export const useManagedAccountNotAllowedCallback = ({
  trigger,
  callback
}: {
  trigger: boolean
  callback: () => void
}) => {
  const isManagedAccount = useIsManagedAccount()
  const { toast } = useContext(ToastContext)

  useEffect(() => {
    if (isManagedAccount && trigger) {
      callback()
      toast(messages.unauthorizedAsManaged)
    }
  }, [isManagedAccount, callback, toast, trigger])
}

export const useIsUnauthorizedForHandleRedirect = (
  handle: string,
  route: string = FEED_PAGE
) => {
  const { data: accountHandle } = useCurrentAccountUser({
    select: (user: { handle?: string }) => user?.handle
  })
  const { data: accountUserId } = useCurrentUserId()
  const navigate = useNavigateToPage()
  const { toast } = useContext(ToastContext)

  const { data: managedAccounts = [], isPending: isManagedAccountsPending } =
    useManagedAccounts(accountUserId)

  const isLoading = !accountHandle || !accountUserId || isManagedAccountsPending
  const isOwner = accountHandle?.toLowerCase() === handle.toLowerCase()
  const isManaged =
    !!accountHandle &&
    managedAccounts.find(({ user }) => user.handle.toLowerCase() === handle)

  useEffect(() => {
    if (isLoading) {
      return
    }
    if (!isOwner && !isManaged) {
      navigate(route)
      toast(messages.unauthorized)
    }
  }, [isLoading, isOwner, isManaged, navigate, route, toast])
}
