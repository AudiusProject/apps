import { Nullable } from '~/utils'

import { ID, UserMetadata } from '../../../models'

import { CollectionSortMode } from './types'

export const FETCH_PROFILE = 'PROFILE/FETCH_PROFILE'
export const FETCH_PROFILE_SUCCEEDED = 'PROFILE/FETCH_PROFILE_SUCCEEDED'
export const FETCH_PROFILE_FAILED = 'PROFILE/FETCH_PROFILE_FAILED'

export const SET_CURRENT_USER = 'PROFILE/SET_CURRENT_USER'

export const UPDATE_PROFILE = 'PROFILE/UPDATE_PROFILE'
export const UPDATE_PROFILE_SUCCEEDED = 'PROFILE/UPDATE_PROFILE_SUCCEEDED'
export const UPDATE_PROFILE_FAILED = 'PROFILE/UPDATE_PROFILE_FAILED'

export const UPDATE_COLLECTION_SORT_MODE = 'PROFILE/UPDATE_COLLECTION_SORT_MODE'
export const SET_PROFILE_FIELD = 'PROFILE/SET_PROFILE_FIELD'

export const DISMISS_PROFILE_METER = 'PROFILE/DISMISS_PROFILE_METER'

export type FetchProfileAction = {
  type: typeof FETCH_PROFILE
  handle: string | null
  userId: ID | null | undefined
  forceUpdate: boolean
  shouldSetLoading: boolean
  deleteExistingEntry: boolean
  fetchOnly?: boolean
}

export type FetchProfileSucceededAction = {
  type: typeof FETCH_PROFILE_SUCCEEDED
  handle: string
  userId: ID
  fetchOnly: boolean
}

export type FetchProfileFailedAction = {
  type: typeof FETCH_PROFILE_FAILED
  handle: string
}

export type SetCurrentUserAction = {
  type: typeof SET_CURRENT_USER
  handle: string | null
}

export type UpdateProfileAction = {
  type: typeof UPDATE_PROFILE
  metadata: UserMetadata
}

export type UpdateProfileSucceededAction = {
  type: typeof UPDATE_PROFILE_SUCCEEDED
  userId: ID
}

export type UpdateProfileFailedAction = {
  type: typeof UPDATE_PROFILE_FAILED
}

export type UpdateCollectionSortModeAction = {
  type: typeof UPDATE_COLLECTION_SORT_MODE
  mode: CollectionSortMode
  handle: string
}

export type SetProfileFieldAction = {
  type: typeof SET_PROFILE_FIELD
  field: string
  value: string
  handle: string
}

export type DismissProfileMeterAction = {
  type: typeof DISMISS_PROFILE_METER
}

export type ProfilePageAction =
  | FetchProfileAction
  | FetchProfileSucceededAction
  | FetchProfileFailedAction
  | SetCurrentUserAction
  | UpdateProfileAction
  | UpdateProfileSucceededAction
  | UpdateProfileFailedAction
  | UpdateCollectionSortModeAction
  | SetProfileFieldAction
  | DismissProfileMeterAction

export function fetchProfile(
  handle: Nullable<string>,
  userId: Nullable<ID> | undefined,
  forceUpdate: boolean,
  shouldSetLoading: boolean,
  deleteExistingEntry: boolean,
  fetchOnly = false
): FetchProfileAction {
  return {
    type: FETCH_PROFILE,
    handle,
    userId,
    forceUpdate,
    shouldSetLoading,
    deleteExistingEntry,
    fetchOnly
  }
}

export function fetchProfileSucceeded(
  handle: string,
  userId: ID,
  fetchOnly: boolean
): FetchProfileSucceededAction {
  return { type: FETCH_PROFILE_SUCCEEDED, handle, userId, fetchOnly }
}

export function fetchProfileFailed(handle: string): FetchProfileFailedAction {
  return { type: FETCH_PROFILE_FAILED, handle }
}

export function setCurrentUser(handle: string | null): SetCurrentUserAction {
  return { type: SET_CURRENT_USER, handle }
}

export function updateProfile(metadata: UserMetadata): UpdateProfileAction {
  return { type: UPDATE_PROFILE, metadata }
}

export function updateProfileSucceeded(
  userId: ID
): UpdateProfileSucceededAction {
  return { type: UPDATE_PROFILE_SUCCEEDED, userId }
}

export function updateProfileFailed(): UpdateProfileFailedAction {
  return { type: UPDATE_PROFILE_FAILED }
}

export function updateCollectionSortMode(
  mode: CollectionSortMode,
  handle: string
): UpdateCollectionSortModeAction {
  return { type: UPDATE_COLLECTION_SORT_MODE, mode, handle }
}

export function setProfileField(
  field: string,
  value: string,
  handle: string
): SetProfileFieldAction {
  return { type: SET_PROFILE_FIELD, field, value, handle }
}

export function profileMeterDismissed(): DismissProfileMeterAction {
  return { type: DISMISS_PROFILE_METER }
}
