import { usersSocialActions as socialUserActions } from '@audius/common/store'

import { createErrorSagas } from 'utils/errorSagas'

type UserErrors =
  | ReturnType<typeof socialUserActions.followUserFailed>
  | ReturnType<typeof socialUserActions.unfollowUserFailed>

const errorSagas = createErrorSagas<UserErrors>({
  errorTypes: [
    socialUserActions.FOLLOW_USER_FAILED,
    socialUserActions.UNFOLLOW_USER_FAILED,
    socialUserActions.SUBSCRIBE_USER_FAILED,
    socialUserActions.UNSUBSCRIBE_USER_FAILED
  ],
  getShouldRedirect: () => false,
  getShouldReport: () => true,
  getAdditionalInfo: (action: UserErrors) => ({
    error: action.error,
    userId: action.userId
  })
})

export default errorSagas
