import type { CommonState } from '~/store/commonStore'
import { createDeepEqualSelector } from '~/utils/selectorHelpers'

import { Status } from '../../../models'

const getProfile = (state: CommonState, handle?: string) => {
  const profileHandle = handle?.toLowerCase() ?? state.pages.profile.currentUser
  if (!profileHandle) return null
  return state.pages.profile.entries[profileHandle]
}

// Profile selectors
export const getProfileStatus = (state: CommonState, handle?: string) =>
  getProfile(state, handle)?.status ?? Status.IDLE
export const getProfileEditStatus = (state: CommonState, handle?: string) => {
  const profile = getProfile(state, handle)
  if (!profile) return Status.IDLE
  const { updating, updateError, updateSuccess } = profile
  if (!updating && !updateError && !updateSuccess) return Status.IDLE
  if (updating) return Status.LOADING
  if (!updating && updateSuccess) return Status.SUCCESS
  if (!updating && updateError) return Status.ERROR
  return Status.IDLE
}
export const getProfileError = (state: CommonState, handle?: string) =>
  getProfile(state, handle)?.error
export const getProfileUserId = (state: CommonState, handle?: string) =>
  getProfile(state, handle)?.userId
export const getProfileUserHandle = (state: CommonState) =>
  state.pages.profile.currentUser
export const getProfileCollectionSortMode = (
  state: CommonState,
  handle: string
) => getProfile(state, handle)?.collectionSortMode

export const makeGetProfile = () => {
  return createDeepEqualSelector(
    [getProfileStatus, getProfileError, getProfileUserId],
    (status, error, userId) => {
      const emptyState = {
        userId: null,
        status
      }
      if (error) return { ...emptyState, error: true }
      if (!userId) return emptyState

      return {
        userId,
        status
      }
    }
  )
}
