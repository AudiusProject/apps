import { ID } from '@audius/common/models'
import { toastActions } from '@audius/common/store'
import { createCustomAction } from 'typesafe-actions'

import { UiErrorCode } from 'store/errors/actions'

import { Pages } from './types'

export const SET_FIELD = 'SIGN_ON/SET_FIELD'
export const SET_VALUE_FIELD = 'SIGN_ON/SET_VALUE_FIELD'
export const RESET_SIGN_ON = 'SIGN_ON/RESET_SIGN_ON'

export const VALIDATE_EMAIL = 'SIGN_ON/VALIDATE_EMAIL'
export const VALIDATE_EMAIL_IN_USE = 'SIGN_ON/VALIDATE_EMAIL_IN_USE'
export const VALIDATE_EMAIL_SUCCEEDED = 'SIGN_ON/VALIDATE_EMAIL_SUCCEEDED'
export const VALIDATE_EMAIL_FAILED = 'SIGN_ON/VALIDATE_EMAIL_FAILED'

export const VALIDATE_HANDLE = 'SIGN_ON/VALIDATE_HANDLE'
export const VALIDATE_HANDLE_SUCCEEDED = 'SIGN_ON/VALIDATE_HANDLE_SUCCEEDED'
export const VALIDATE_HANDLE_FAILED = 'SIGN_ON/VALIDATE_HANDLE_FAILED'

export const HIDE_PREVIEW_HINT = 'SIGN_ON/HIDE_PREVIEW_HINT'
export const FOLLOW_ARTISTS = 'SIGN_ON/FOLLOW_ARTISTS'
export const SET_ACCOUNT_READY = 'SIGN_ON/SET_ACCOUNT_READY'
export const SET_IDENTITY_ACCOUNT_READY = 'SIGN_ON/SET_IDENTITY_ACCOUNT_READY'

export const CHECK_EMAIL = 'SIGN_ON/CHECK_EMAIL'

export const SIGN_IN = 'SIGN_ON/SIGN_IN'
export const SIGN_IN_SUCCEEDED = 'SIGN_ON/SIGN_IN_SUCCEEDED'
export const SIGN_IN_FAILED = 'SIGN_ON/SIGN_IN_FAILED'

export const SIGN_UP = 'SIGN_ON/SIGN_UP'
export const CREATE_GUEST_ACCOUNT = 'SIGN_ON/CREATE_GUEST_ACCOUNT'
export const START_SIGN_UP = 'SIGN_ON/START_SIGN_UP'

export const FINISH_SIGN_UP = 'SIGN_ON/FINISH_SIGN_UP'

export const SIGN_UP_SUCCEEDED = 'SIGN_ON/SIGN_UP_SUCCEEDED'
export const SIGN_UP_SUCCEEDED_WITH_ID = 'SIGN_ON/SIGN_UP_SUCCEEDED_WITH_ID'
export const SIGN_UP_FAILED = 'SIGN_ON/SIGN_UP_FAILED'
export const SIGN_UP_TIMEOUT = 'SIGN_ON/SIGN_UP_TIMEOUT'

export const SET_FINISHED_PHASE_1 = 'SIGN_ON/SET_FINISHED_PHASE_1'
export const SET_LINKED_SOCIAL_ON_FIRST_PAGE =
  'SIGN_ON/SET_LINKED_SOCIAL_ON_FIRST_PAGE'

export const SET_STATUS = 'SIGN_ON/SET_STATUS'
export const USING_EXTERNAL_WALLET = 'SIGN_ON/USING_EXTERNAL_WALLET'

export const OPEN_SIGN_ON = 'SIGN_ON/OPEN_SIGN_ON'

export const NEXT_PAGE = 'SIGN_ON/NEXT_PAGE'
export const PREVIOUS_PAGE = 'SIGN_ON/PREVIOUS_PAGE'
export const GO_TO_PAGE = 'SIGN_ON/GO_TO_PAGE'

export const UPDATE_ROUTE_ON_COMPLETION = 'SIGN_ON/UPDATE_ROUTE_ON_COMPLETION'
export const UPDATE_ROUTE_ON_EXIT = 'SIGN_ON/UPDATE_ROUTE_ON_EXIT'

export const ADD_FOLLOW_ARTISTS = 'SIGN_ON/ADD_FOLLOW_ARTISTS'
export const REMOVE_FOLLOW_ARTISTS = 'SIGN_ON/REMOVE_FOLLOW_ARTISTS'
export const COMPLETE_FOLLOW_ARTISTS = 'SIGN_ON/COMPLETE_FOLLOW_ARTISTS'

export const SEND_WELCOME_EMAIL = 'SIGN_ON/SEND_WELCOME_EMAIL'

export const FETCH_REFERRER = 'SIGN_ON/FETCH_REFERRER'
export const SET_REFERRER = 'SIGN_ON/SET_REFERRER'
export const SET_WELCOME_MODAL_SHOWN = 'SIGN_ON/SET_WELCOME_MODAL_SHOWN'

export function setValueField(field: string, value: string | string[]) {
  return { type: SET_VALUE_FIELD, field, value }
}

export function setField(field: string, value: unknown) {
  return { type: SET_FIELD, field, value }
}

export function resetSignOn() {
  return { type: RESET_SIGN_ON }
}

export function checkEmail(
  email: string,
  onAvailable?: () => void,
  onUnavailable?: () => void,
  onError?: () => void
) {
  return { type: CHECK_EMAIL, email, onAvailable, onUnavailable, onError }
}

export function validateEmail(email: string) {
  return { type: VALIDATE_EMAIL, email }
}

export function validateEmailInUse(email: string) {
  return { type: VALIDATE_EMAIL_IN_USE, email }
}

export function validateEmailSucceeded(available?: boolean) {
  return { type: VALIDATE_EMAIL_SUCCEEDED, available }
}

export function validateEmailFailed(error: string) {
  return { type: VALIDATE_EMAIL_FAILED, error }
}

export function validateHandle(
  handle: string,
  isOauthVerified: boolean,
  onValidate?: (error: boolean) => void
) {
  return { type: VALIDATE_HANDLE, handle, isOauthVerified, onValidate }
}

export function validateHandleSucceeded() {
  return { type: VALIDATE_HANDLE_SUCCEEDED }
}

export function validateHandleFailed(error: string) {
  return { type: VALIDATE_HANDLE_FAILED, error }
}

export function signUp() {
  return { type: SIGN_UP }
}

export function createGuestAccount(guestEmail: string) {
  return { type: CREATE_GUEST_ACCOUNT, guestEmail }
}

export function startSignUp() {
  return { type: START_SIGN_UP }
}

export function finishSignUp() {
  return { type: FINISH_SIGN_UP }
}

export const signUpSucceeded = () => ({ type: SIGN_UP_SUCCEEDED })

export function signUpSucceededWithId(userId: ID) {
  return { type: SIGN_UP_SUCCEEDED_WITH_ID, userId }
}

export type SignUpFailedParams = {
  error: string
  phase: string
  redirectRoute?: string
  shouldRedirect?: boolean
  shouldReport: boolean
  shouldToast: boolean
  message?: string
  uiErrorCode?: UiErrorCode
}

export const signUpFailed = ({
  error,
  phase,
  redirectRoute,
  shouldRedirect,
  shouldReport,
  shouldToast,
  message,
  uiErrorCode
}: SignUpFailedParams) => ({
  type: SIGN_UP_FAILED,
  error,
  phase,
  redirectRoute,
  shouldRedirect,
  shouldReport,
  shouldToast,
  message,
  uiErrorCode
})

export function signIn(email: string, password: string, otp?: string) {
  return { type: SIGN_IN, email, password, otp }
}

export const signInSucceeded = () => ({ type: SIGN_IN_SUCCEEDED })
export const signInFailed = (
  error: string,
  phase?: string,
  shouldReport = true,
  uiErrorCode?: UiErrorCode
) => ({
  type: SIGN_IN_FAILED,
  error,
  phase,
  shouldReport,
  uiErrorCode
})

export function setLinkedSocialOnFirstPage(linkedSocialOnFirstPage: boolean) {
  return {
    type: SET_LINKED_SOCIAL_ON_FIRST_PAGE,
    linkedSocialOnFirstPage
  }
}

export function setFinishedPhase1(finished: boolean) {
  return {
    type: SET_FINISHED_PHASE_1,
    finishedPhase1: finished
  }
}

export function setHidePreviewHint() {
  return { type: HIDE_PREVIEW_HINT }
}

export function followArtists(skipDefaultFollows: boolean = false) {
  return { type: FOLLOW_ARTISTS, skipDefaultFollows }
}

export function setStatus(status: 'loading' | 'editing') {
  return { type: SET_STATUS, status }
}

export function usingExternalWallet() {
  return { type: USING_EXTERNAL_WALLET }
}

export function setAccountReady() {
  return { type: SET_ACCOUNT_READY }
}

export function setIdentityAccountReady() {
  return { type: SET_IDENTITY_ACCOUNT_READY }
}

export function addFollowArtists(userIds: ID[]) {
  return { type: ADD_FOLLOW_ARTISTS, userIds }
}

export function removeFollowArtists(userIds: ID[]) {
  return { type: REMOVE_FOLLOW_ARTISTS, userIds }
}

export const showRequiresAccountToast = (isAccountIncomplete?: boolean) =>
  toastActions.toast({
    content: isAccountIncomplete
      ? 'Finish setting up your account to continue'
      : 'You need an account to do that!'
  })

export const openSignOn = (
  signIn = false,
  page: string | null = null,
  fields: Record<string, unknown> = {}
) => {
  return { type: OPEN_SIGN_ON, signIn, page, fields }
}

export const nextPage = (isMobile: boolean) => ({ type: NEXT_PAGE, isMobile })
export const previousPage = () => ({ type: PREVIOUS_PAGE })
export const goToPage = (page: Pages) => ({ type: GO_TO_PAGE, page })

export const signUpTimeout = () => ({
  type: SIGN_UP_TIMEOUT,
  shouldRedirect: false
})
export const updateRouteOnCompletion = (route: string) => ({
  type: UPDATE_ROUTE_ON_COMPLETION,
  route
})
export const updateRouteOnExit = (route: string) => ({
  type: UPDATE_ROUTE_ON_EXIT,
  route
})

export const sendWelcomeEmail = (name: string) => ({
  type: SEND_WELCOME_EMAIL,
  name
})

export const fetchReferrer = (handle: string) => ({
  type: FETCH_REFERRER,
  handle
})

export const setReferrer = (userId: ID) => ({
  type: SET_REFERRER,
  userId
})

export const setWelcomeModalShown = (newValue: boolean) => ({
  type: SET_WELCOME_MODAL_SHOWN,
  value: newValue
})

export const completeFollowArtists = createCustomAction(COMPLETE_FOLLOW_ARTISTS)
