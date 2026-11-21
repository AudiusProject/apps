import { MouseEvent as ReactMouseEvent, useCallback, useEffect } from 'react'

import {
  selectIsAccountComplete,
  useAccountStatus,
  useCurrentAccountUser
} from '@audius/common/api'
import { Status } from '@audius/common/models'
import { useDispatch } from 'react-redux'
import { useLocation } from 'react-router'

import {
  openSignOn,
  showRequiresAccountToast,
  updateRouteOnCompletion,
  updateRouteOnExit
} from 'common/store/pages/signon/actions'

let hasShownRequiresAccountToastThisSession = false

export type RestrictionType = 'none' | 'guest' | 'account'

const canAccess = (
  restriction: RestrictionType,
  hasAccount: boolean,
  isAccountComplete: boolean
): boolean => {
  if (restriction === 'none') return true
  if (restriction === 'guest') return hasAccount
  return isAccountComplete
}

export const useRequiresAccountCallback = <T extends (...args: any) => any>(
  callback: T,
  deps: any[],
  onOpenAuthModal?: () => void,
  returnRouteOverride?: string,
  restriction: RestrictionType = 'account'
) => {
  const { data: isAccountComplete = false } = useCurrentAccountUser({
    select: selectIsAccountComplete
  })
  const { data: accountStatus } = useAccountStatus()
  const dispatch = useDispatch()
  const location = useLocation()
  const returnRoute = returnRouteOverride ?? location.pathname

  return useCallback(
    (...args: Parameters<T>) => {
      if (accountStatus === Status.LOADING || accountStatus === Status.IDLE) {
        if (args[0]?.preventDefault) {
          args[0].preventDefault()
        }
        return
      }

      const canAccessRoute = canAccess(
        restriction,
        accountStatus === Status.SUCCESS,
        isAccountComplete
      )
      if (!canAccessRoute) {
        if (args[0]?.preventDefault) {
          args[0].preventDefault()
        }

        dispatch(updateRouteOnExit(returnRoute))
        dispatch(updateRouteOnCompletion(returnRoute))
        dispatch(openSignOn(/** signIn */ false))
        if (!hasShownRequiresAccountToastThisSession) {
          hasShownRequiresAccountToastThisSession = true
          dispatch(
            showRequiresAccountToast(
              accountStatus === Status.SUCCESS && !isAccountComplete
            )
          )
        }
        onOpenAuthModal?.()
        return
      }

      // eslint-disable-next-line n/no-callback-literal
      return callback(...args)
    },
    [
      accountStatus,
      restriction,
      isAccountComplete,
      callback,
      dispatch,
      returnRoute,
      onOpenAuthModal,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ...deps
    ]
  )
}

export const useRequiresAccountOnClick = <
  T extends (e: ReactMouseEvent<Element, MouseEvent>) => any
>(
  callback: T,
  deps: any[],
  onOpenAuthModal?: () => void,
  returnRouteOverride?: string,
  restriction: RestrictionType = 'account'
) => {
  return useRequiresAccountCallback(
    (e: ReactMouseEvent<Element, MouseEvent>) => {
      e.stopPropagation()
      return callback(e)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
    onOpenAuthModal,
    returnRouteOverride,
    restriction
  )
}

export const useRequiresAccountFn = (
  returnRouteOverride?: string,
  restriction: RestrictionType = 'account'
) => {
  const requiresAccount = useRequiresAccountCallback(
    () => {},
    [],
    undefined,
    returnRouteOverride,
    restriction
  )
  return { requiresAccount }
}

export const useRequiresAccount = (
  returnRouteOverride?: string,
  restriction: RestrictionType = 'account'
) => {
  const { requiresAccount } = useRequiresAccountFn(
    returnRouteOverride,
    restriction
  )

  useEffect(() => {
    requiresAccount()
  }, [requiresAccount])
}
