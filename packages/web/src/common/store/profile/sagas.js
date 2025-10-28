import { userMetadataListFromSDK } from '@audius/common/adapters'
import {
  getUserQueryKey,
  queryCurrentUserId,
  queryUser,
  queryUserByHandle
} from '@audius/common/api'
import { Kind } from '@audius/common/models'
import {
  profilePageActions as profileActions,
  chatActions,
  reachabilitySelectors,
  confirmerActions,
  confirmTransaction,
  getSDK
} from '@audius/common/store'
import {
  squashNewLines,
  makeKindId,
  waitForAccount,
  dataURLtoFile,
  isResponseError,
  route
} from '@audius/common/utils'
import { Id } from '@audius/sdk'
import { call, getContext, put, select, takeEvery } from 'redux-saga/effects'

import feedSagas from 'common/store/pages/profile/lineups/feed/sagas.js'
import tracksSagas from 'common/store/pages/profile/lineups/tracks/sagas.js'
import { push as pushRoute } from 'utils/navigation'
import { waitForWrite } from 'utils/sagaHelpers'

const { NOT_FOUND_PAGE } = route
const { getIsReachable } = reachabilitySelectors

const { fetchPermissions } = chatActions

function* watchFetchProfile() {
  yield takeEvery(profileActions.FETCH_PROFILE, fetchProfileAsync)
}

function* fetchProfileAsync(action) {
  try {
    let user
    const queryOptions = action.forceUpdate
      ? { force: true, staleTime: 0 }
      : undefined

    if (action.userId) {
      user = yield call(queryUser, action.userId, queryOptions)
    } else if (action.handle) {
      user = yield call(
        queryUserByHandle,
        action.handle?.replace('/', ''),
        queryOptions
      )
    }
    if (!user) {
      const isReachable = yield select(getIsReachable)
      if (isReachable) {
        yield put(profileActions.fetchProfileFailed())
        yield put(pushRoute(NOT_FOUND_PAGE))
      }
      return
    }
    yield put(
      profileActions.fetchProfileSucceeded(
        user.handle,
        user.user_id,
        action.fetchOnly
      )
    )

    // Get chat permissions
    yield put(fetchPermissions({ userIds: [user.user_id] }))
  } catch (err) {
    console.error(`Fetch users error: ${err}`)
    const isReachable = yield select(getIsReachable)
    if (isReachable && isResponseError(err) && err.response.status === 404) {
      yield put(pushRoute(NOT_FOUND_PAGE))
      return
    }
    if (!isReachable) return
    throw err
  }
}

function* watchUpdateProfile() {
  yield takeEvery(profileActions.UPDATE_PROFILE, updateProfileAsync)
}

export function* updateProfileAsync(action) {
  yield waitForWrite()
  const queryClient = yield getContext('queryClient')
  const metadata = { ...action.metadata }
  metadata.bio = squashNewLines(metadata.bio)

  const accountUserId = yield call(queryCurrentUserId)

  queryClient.setQueryData(getUserQueryKey(accountUserId), (prevUser) =>
    !prevUser
      ? undefined
      : {
          ...prevUser,
          name: metadata.name
        }
  )

  // For base64 images (coming from native), convert to a blob
  if (metadata.updatedCoverPhoto?.type === 'base64') {
    metadata.updatedCoverPhoto.file = dataURLtoFile(
      metadata.updatedCoverPhoto.file
    )
  }

  if (metadata.updatedProfilePicture?.type === 'base64') {
    metadata.updatedProfilePicture.file = dataURLtoFile(
      metadata.updatedProfilePicture.file
    )
  }

  yield call(confirmUpdateProfile, metadata.user_id, metadata)

  queryClient.setQueryData(getUserQueryKey(metadata.user_id), (prevUser) =>
    !prevUser
      ? undefined
      : {
          ...prevUser,
          ...metadata
        }
  )
}

function* confirmUpdateProfile(userId, metadata) {
  yield waitForWrite()
  const sdk = yield* getSDK()
  const audiusBackendInstance = yield getContext('audiusBackendInstance')
  const queryClient = yield getContext('queryClient')
  yield put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.USERS, userId),
      function* () {
        const response = yield call(audiusBackendInstance.updateCreator, {
          metadata,
          sdk
        })
        const { blockHash, blockNumber } = response

        const confirmed = yield call(confirmTransaction, blockHash, blockNumber)
        if (!confirmed) {
          throw new Error(
            `Could not confirm update profile for user id ${userId}`
          )
        }
        yield waitForAccount()
        const currentUserId = yield call(queryCurrentUserId)
        const { data = [] } = yield call(
          [sdk.full.users, sdk.full.users.getUser],
          {
            id: Id.parse(userId),
            userId: Id.parse(currentUserId)
          }
        )
        return userMetadataListFromSDK(data)[0]
      },
      function* (confirmedUser) {
        // Invalidate the user query to refetch fresh data from the server
        // This ensures we get the canonical data including:
        // - Processed image sizes (cover photo, profile picture)
        // - Computed artist_coin_badge (based on coin_flair_mint and user's coins)
        queryClient.invalidateQueries({
          queryKey: getUserQueryKey(confirmedUser.user_id)
        })
        yield put(profileActions.updateProfileSucceeded(metadata.user_id))
      },
      function* () {
        yield put(profileActions.updateProfileFailed())
      },
      undefined,
      undefined,
      { operationId: 'OVERWRITE', squashable: true }
    )
  )
}

export default function sagas() {
  return [
    ...feedSagas(),
    ...tracksSagas(),
    watchFetchProfile,
    watchUpdateProfile
  ]
}
