import { useCallback } from 'react'

import { useCurrentAccount } from '@audius/common/api'
import { useCurrentCommentSection } from '@audius/common/context'
import { Name } from '@audius/common/models'
import { useLocation } from 'react-router'
import { useToggle } from 'react-use'

import { DownloadMobileAppDrawer } from 'components/download-mobile-app-drawer/DownloadMobileAppDrawer'
import { useIsMobile } from 'hooks/useIsMobile'
import { useRequiresAccountFn } from 'hooks/useRequiresAccount'
import { make, track } from 'services/analytics'

export const useCommentActionCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
) => {
  const isMobile = useIsMobile()
  const location = useLocation()
  const { currentUserId, entityId } = useCurrentCommentSection()
  const [isMobileAppDrawerOpen, toggleIsMobileAppDrawer] = useToggle(false)
  const { requiresAccount } = useRequiresAccountFn(
    isMobile ? location.pathname : `${location.pathname}?showComments=true`
  )
  const { data: guestEmail } = useCurrentAccount({
    select: (account) => account?.guestEmail
  })
  const wrappedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (isMobile) {
        toggleIsMobileAppDrawer()
        track(
          make({
            eventName: Name.COMMENTS_OPEN_INSTALL_APP_MODAL,
            trackId: entityId
          })
        )
      } else {
        if (!currentUserId || guestEmail) {
          requiresAccount()
          track(
            make({
              eventName: Name.COMMENTS_OPEN_AUTH_MODAL,
              trackId: entityId
            })
          )
        } else {
          // eslint-disable-next-line n/no-callback-literal
          return callback(...args)
        }
      }
    },
    [
      callback,
      isMobile,
      toggleIsMobileAppDrawer,
      guestEmail,
      entityId,
      currentUserId,
      requiresAccount,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ...deps
    ]
  )

  const downloadMobileAppDrawer = isMobile ? (
    <DownloadMobileAppDrawer
      isOpen={isMobileAppDrawerOpen}
      onClose={toggleIsMobileAppDrawer}
    />
  ) : null

  return [wrappedCallback, downloadMobileAppDrawer] as const
}
