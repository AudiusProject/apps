import { MouseEvent as ReactMouseEvent, useCallback, useEffect } from 'react'

import {
  selectIsAccountComplete,
  useAccountStatus,
  useCurrentAccountUser
} from '@audius/common/api'
import { Status } from '@audius/common/models'
import { useDispatch } from 'react-redux'
import { useLocation } from 'react-router-dom'

import {
  openSignOn,
  showRequiresAccountToast,
  updateRouteOnCompletion,
  updateRouteOnExit
} from 'common/store/pages/signon/actions'

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

/**
 * Like useCallback but designed to be used to redirect unauthenticated users
 * to sign in/up in the case they are not logged in.
 */
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
      // Wait for account status to be loaded before proceeding
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
        // Prevent the default event from occurring
        if (args[0]?.preventDefault) {
          args[0].preventDefault()
        }

        // Set up return route before opening sign on
        dispatch(updateRouteOnExit(returnRoute))
        dispatch(updateRouteOnCompletion(returnRoute))
        dispatch(openSignOn(/** signIn */ false))
        dispatch(
          showRequiresAccountToast(
            accountStatus === Status.SUCCESS && !isAccountComplete
          )
        )
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

/**
 * Like useRequiresAccountCallback but designed to be used for click handlers so that
 * clicks are not propagated.
 */
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

/**
 * Creates a callback to verify user authentication.
 *
 * When invoked, this callback checks if the user is signed in.
 * If not, it redirects to the sign-in page and displays a banner
 * informing the user that an account is required for the action.
 *
 * @param returnRouteOverride - Optional route to navigate to after successful sign-up
 * @param restriction - Optional restriction type ('none' | 'guest' | 'account')
 * @returns A function that, when called, performs the authentication check and redirection
 */
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

/**
 * Hook that checks if a user is signed in. If not, it redirects to the sign-up page
 * and displays a banner informing the user that an account is required.
 *
 * This hook automatically triggers the authentication check on mount and
 * whenever its dependencies change.
 *
 * @param returnRouteOverride - Optional route to navigate to after successful sign-up
 * @param restriction - Optional restriction type ('none' | 'guest' | 'account')
 */
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
