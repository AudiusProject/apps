import { createSelector } from 'reselect'

import { AppState } from 'store/types'

// Sign On selectors
export const getSignOn = (state: AppState) => state.signOn
export const getEmailField = (state: AppState) => state.signOn.email
export const getNameField = (state: AppState) => state.signOn.name
export const getPasswordField = (state: AppState) => state.signOn.password
export const getIsGuest = (state: AppState) => state.signOn.isGuest
export const getOtpField = (state: AppState) => state.signOn.otp
export const getRequiresOtp = (state: AppState) => {
  const passwordField = getPasswordField(state)
  const { error } = passwordField
  return error && error.includes('403')
}
export const getFinishedPhase1 = (state: AppState) =>
  state.signOn.finishedPhase1
export const getHandleField = (state: AppState) => state.signOn.handle
export const getIsVerified = (state: AppState) => state.signOn.verified
export const getCoverPhotoField = (state: AppState) => state.signOn.coverPhoto
export const getProfileImageField = (state: AppState) =>
  state.signOn.profileImage
export const getGenres = (state: AppState) => state.signOn.genres
export const getStatus = (state: AppState) => state.signOn.status
export const getPage = (state: AppState) => state.signOn.page
export const getRouteOnCompletion = (state: AppState) =>
  state.signOn.routeOnCompletion
export const getRouteOnExit = (state: AppState) => state.signOn.routeOnExit
export const getLinkedSocialOnFirstPage = (state: AppState) =>
  state.signOn.linkedSocialOnFirstPage
export const getAccountReady = (state: AppState) => state.signOn.accountReady
export const getAccountAlreadyExisted = (state: AppState) =>
  state.signOn.accountAlreadyExisted
export const getStartedSignUpProcess = (state: AppState) =>
  state.signOn.startedSignUpProcess
export const getFinishedSignUpProcess = (state: AppState) =>
  state.signOn.finishedSignUpProcess
export const getReferrer = (state: AppState) => state.signOn.referrer

export const getHidePreviewHint = (state: AppState) =>
  state.signOn.hidePreviewHint
export const getFollowIds = (state: AppState) => state.signOn.selectedUserIds

export const getStartedAndFinishedSignup = createSelector(
  [getStartedSignUpProcess, getFinishedSignUpProcess],
  (startedSignUpProcess, finishedSignUpProcess) => {
    // If a user has started the sign up flow,
    // only return true if they finish the flow
    // (including selecting followees)
    return !startedSignUpProcess || finishedSignUpProcess
  }
)

export const getWelcomeModalShown = (state: AppState) =>
  state.signOn.welcomeModalShown
