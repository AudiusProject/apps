import { call } from 'typed-redux-saga'

import { primeUserDataSaga } from '~/api/tan-query/utils/primeUserData'
import { UserMetadata } from '~/models/User'
import { waitForRead } from '~/utils/sagaHelpers'

export function* processAndCacheUsers(users: UserMetadata[]) {
  yield* waitForRead()
  const reformattedUsers = users.map((user) => {
    return reformatUser(user)
  })

  yield* call(primeUserDataSaga, reformattedUsers)

  return reformattedUsers
}

const setDisplayNameToHandleIfUnset = <T extends UserMetadata>(user: T) => {
  if (user.name) return user
  return {
    ...user,
    name: user.handle
  }
}

export const reformatUser = (user: UserMetadata) => {
  const withNames = setDisplayNameToHandleIfUnset(user)

  return withNames
}
