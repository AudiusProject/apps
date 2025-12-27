import { SquareSizes, WidthSizes, type User } from '@audius/common/models'
import {
  accountActions,
  accountSagas,
  getContext,
  getSDK
} from '@audius/common/store'
import { removeNullable } from '@audius/common/utils'
import { updateProfileAsync } from 'common/store/profile/sagas'
import { takeEvery, call } from 'typed-redux-saga'

import { preload } from '@audius/harmony-native'
import { IS_MOBILE_USER } from 'app/constants/storage-keys'
const { signedIn } = accountActions

/**
 * Prefetch and cache the profile and cover photos so they are available offline
 */
function* cacheUserImages(user: User) {
  try {
    const { profile_picture, cover_photo } = user

    const sourcesToPreload = [
      profile_picture[SquareSizes.SIZE_150_BY_150],
      cover_photo[WidthSizes.SIZE_640]
    ]
      .filter(removeNullable)
      .map((uri) => ({ uri }))

    yield* call(preload, sourcesToPreload)
  } catch (e) {
    console.error('Could not cache profile images', e)
  }
}

// When successfully signed in
function* onSignedIn({ payload: { account } }: ReturnType<typeof signedIn>) {
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const localStorage = yield* getContext('localStorage')
  const isMobileUser = yield* call(localStorage.getItem, IS_MOBILE_USER)
  const sdk = yield* getSDK()

  yield* call(cacheUserImages, account)

  if (!isMobileUser || isMobileUser !== 'true') {
    try {
      // Legacy method to update whether a user has signed in on
      // native mobile. Used in identity service for notification indexing
      yield* call(audiusBackendInstance.updateUserEvent, {
        sdk,
        hasSignedInNativeMobile: true
      })
      // Updates the user metadata with an event `is_mobile_user` set to true
      // if the account is being fetched from a mobile context
      yield* call(updateProfileAsync, {
        metadata: { ...account, events: { is_mobile_user: true } }
      })

      yield* call(localStorage.setItem, IS_MOBILE_USER, 'true')
    } catch (e) {
      console.error(e)
      // Do nothing. A retry on the next session will suffice.
    }
  }
}

function* watchSignedIn() {
  yield* takeEvery(signedIn.type, onSignedIn)
}

const sagas = () => {
  return [...accountSagas(), watchSignedIn]
}

export default sagas
