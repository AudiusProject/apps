import { useCallback } from 'react'

import { useCurrentAccount } from '@audius/common/api'
import { useCurrentCommentSection } from '@audius/common/context'
import { useLocation } from 'react-router'

import { useIsMobile } from 'hooks/useIsMobile'
import { useRequiresAccountFn } from 'hooks/useRequiresAccount'

export const useCommentActionCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
) => {
  const isMobile = useIsMobile()
  const location = useLocation()
  const { currentUserId } = useCurrentCommentSection()
  const { requiresAccount } = useRequiresAccountFn(
    isMobile ? location.pathname : `${location.pathname}?showComments=true`
  )
  const { data: guestEmail } = useCurrentAccount({
    select: (account) => account?.guestEmail
  })
  const wrappedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (!currentUserId || guestEmail) {
        requiresAccount()
      } else {
        // eslint-disable-next-line n/no-callback-literal
        return callback(...args)
      }
    },
    [
      callback,
      guestEmail,
      currentUserId,
      requiresAccount,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ...deps
    ]
  )

  return [wrappedCallback, null] as const
}
