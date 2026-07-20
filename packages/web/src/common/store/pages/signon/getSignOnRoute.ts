import { route } from '@audius/common/utils'

import { Pages } from './types'

const {
  SIGN_IN_PAGE,
  SIGN_UP_FINISH_PROFILE_PAGE,
  SIGN_UP_HANDLE_PAGE,
  SIGN_UP_PAGE,
  SIGN_UP_PASSWORD_PAGE
} = route

type GetSignOnRouteParams = {
  signIn: boolean
  page: string | null
  hasHandle: boolean
}

/**
 * Maps the legacy sign-on page state to the URL-based signup flow.
 * Incomplete Identity-only accounts have no handle yet, so PROFILE resumes at
 * handle selection; accounts with an indexed handle resume at profile details.
 */
export const getSignOnRoute = ({
  signIn,
  page,
  hasHandle
}: GetSignOnRouteParams) => {
  if (signIn) return SIGN_IN_PAGE

  switch (page) {
    case Pages.PASSWORD:
      return SIGN_UP_PASSWORD_PAGE
    case Pages.PROFILE:
      return hasHandle ? SIGN_UP_FINISH_PROFILE_PAGE : SIGN_UP_HANDLE_PAGE
    default:
      return SIGN_UP_PAGE
  }
}
