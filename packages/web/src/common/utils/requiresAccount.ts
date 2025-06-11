import { selectIsGuestAccount, queryAccountUser } from '@audius/common/api'
import { getContext } from '@audius/common/store'
import { route, waitForAccount } from '@audius/common/utils'
import { call, put } from 'typed-redux-saga'

import {
  updateRouteOnExit,
  showRequiresAccountToast
} from 'common/store/pages/signon/actions'
import { push as pushRoute } from 'utils/navigation'

const { SIGN_UP_PAGE } = route

/**
 * Checks if the user is signed in with an account.
 * If they are signed in, `fn` is invoked, otherwise, the
 * user is directed to the sign-up page.
 */
export function requiresAccount<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  // optional route to go to on closing the sign up page/modal
  route?: string
) {
  return function* (...args: TArgs) {
    const isNativeMobile = yield* getContext('isNativeMobile')
    yield* waitForAccount()
    const accountUser = yield* queryAccountUser()
    const isGuest = yield* call(selectIsGuestAccount, accountUser)
    const hasAccount = Boolean(accountUser?.handle && accountUser?.name)
    if (!hasAccount || isGuest) {
      if (!isNativeMobile) {
        if (route) {
          yield* put(updateRouteOnExit(route))
        }
        yield* put(pushRoute(SIGN_UP_PAGE))
        yield* put(showRequiresAccountToast())
      }
    } else {
      return yield* call(fn, ...args)
    }
  }
}
