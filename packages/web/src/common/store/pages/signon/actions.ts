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

export const CHECK_EMAIL = 'SIGN_ON/CHECK_EMAIL'

export const SIGN_IN = 'SIGN_ON/SIGN_IN'
export const SIGN_IN_SUCCEEDED = 'SIGN_ON/SIGN_IN_SUCCEEDED'
export const SIGN_IN_FAILED = 'SIGN_ON/SIGN_IN_FAILED'

export const SIGN_UP = 'SIGN_ON/SIGN_UP'
export const CREATE_GUEST_ACCOUNT = 'SIGN_ON/CREATE_GUEST_ACCOUNT'
export const START_SIGN_UP = 'SIGN_ON/START_SIGN_UP'

/** @deprecated */
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

/**
 * Sets the value for a field in the sign on state
 * @param field the field to be set
 * @param value the value to be set
 */
export function setValueField(field: string, value: string | string[]) {
  return { type: SET_VALUE_FIELD, field, value }
}

/**
 * Sets the value for a field in the sign on state
 * @param field the field to be set
 * @param value the value to be set
 */
export function setField(field: string, value: unknown) {
  return { type: SET_FIELD, field, value }
}

/**
 * Resets a field in the signin flow
 */
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

/**
 * Requests the backend to check if email is valid
 * @param email the email to check
 */
export function validateEmail(email: string) {
  return { type: VALIDATE_EMAIL, email }
}

export function validateEmailInUse(email: string) {
  return { type: VALIDATE_EMAIL_IN_USE, email }
}

export function validateEmailSucceeded(available?: boolean) {
  return { type: VALIDATE_EMAIL_SUCCEEDED, available }
}

/**
 * Email is not valid
 * @param error The reason the email is not vallid
 */
export function validateEmailFailed(error: string) {
  return { type: VALIDATE_EMAIL_FAILED, error }
}

/**
 * Requests the backend to check if handle is valid
 * @param handle the handle to check
 * @param isOauthVerified whether or not the user is verified via oauth
 * @param onValidate
 *  callback to fire on successful validation
 */
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

/**
 * handle is not valid
 * @param error The reason the handle is not valid
 */
export function validateHandleFailed(error: string) {
  return { type: VALIDATE_HANDLE_FAILED, error }
}

/**
 * sign up
 * takes params from store signon state
 */
export function signUp() {
  return { type: SIGN_UP }
}

/**
 * create guest account
 */
export function createGuestAccount(guestEmail: string) {
  return { type: CREATE_GUEST_ACCOUNT, guestEmail }
}

/**
 * When the user starts the sign up flow
 */
export function startSignUp() {
  return { type: START_SIGN_UP }
}

/**
 * When the user finishes the sign up flow
 */
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
  shouldReport: boolean
  shouldToast: boolean
  message?: string
  uiErrorCode?: UiErrorCode
}

export const signUpFailed = ({
  error,
  phase,
  redirectRoute,
  shouldReport,
  shouldToast,
  message,
  uiErrorCode
}: SignUpFailedParams) => ({
  type: SIGN_UP_FAILED,
  error,
  phase,
  redirectRoute,
  shouldReport,
  shouldToast,
  message,
  uiErrorCode
})

/**
 * Attemp sign-in to the account
 * @param email account email
 * @param password account password
 * @param? visitorId fingerprint ID
 * @param? otp account otp
 */
export function signIn(
  email: string,
  password: string,
  visitorId?: string,
  otp?: string
) {
  return { type: SIGN_IN, email, password, visitorId, otp }
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

/**
 * Follows users in signup flow after user is created
 * @param userIds array of userIds to follow
 */
export function followArtists(skipDefaultFollows: boolean = false) {
  return { type: FOLLOW_ARTISTS, skipDefaultFollows }
}

/**
 * Sets the status of the signon flow 'loading' or 'editing'
 * @param status Status: 'loading' or 'editing'
 */
export function setStatus(status: 'loading' | 'editing') {
  return { type: SET_STATUS, status }
}

export function usingExternalWallet() {
  return { type: USING_EXTERNAL_WALLET }
}

/**
 * Sets the accout status as ready, when the account is created and the followers are confirmed
 */
export function setAccountReady() {
  return { type: SET_ACCOUNT_READY }
}

/**
 * Adds the user ids to be followed on account completion
 * @param userIds The user ids to add as selected and follow
 */
export function addFollowArtists(userIds: ID[]) {
  return { type: ADD_FOLLOW_ARTISTS, userIds }
}

/**
 * Removes the user ids from the selected userIds array
 * @param userIds The user ids to remove from selected
 */
export function removeFollowArtists(userIds: ID[]) {
  return { type: REMOVE_FOLLOW_ARTISTS, userIds }
}

export const showRequiresAccountToast = (isAccountIncomplete?: boolean) =>
  toastActions.toast({
    content: isAccountIncomplete
      ? 'Finish setting up your account to continue'
      : 'Oops, it looks like you need an account to do that!'
  })

/**
 * Opens the signin/up modal in mobile and routes to the page on desktop
 * @param signIn Determines if the SignIn or SignUp flow is displayed
 * @param page optional page to open sign on to
 * @param fields optional fields to set in the sign in state when opening
 */
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

export const signUpTimeout = () => ({ type: SIGN_UP_TIMEOUT })
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

/**
 * Fetches the referring user given their handle
 * @param handle the handle captured by the ?ref=<handle> search param
 */
export const fetchReferrer = (handle: string) => ({
  type: FETCH_REFERRER,
  handle
})

/**
 * Sets the user id of the referrer who invited this user signing up
 */
export const setReferrer = (userId: ID) => ({
  type: SET_REFERRER,
  userId
})

export const setWelcomeModalShown = (newValue: boolean) => ({
  type: SET_WELCOME_MODAL_SHOWN,
  value: newValue
})

/*
 * Triggers completeFollowArtists saga that determines the best way to follow artists based on
 * the potentially ongoing account creation logic
 */
export const completeFollowArtists = createCustomAction(COMPLETE_FOLLOW_ARTISTS)
