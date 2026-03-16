import { OptionalId } from '@audius/sdk/services'
import { call, put, select, takeLatest } from 'typed-redux-saga'

import { transformAndCleanList, userMetadataFromSDK } from '~/adapters'
import { queryCurrentUserId } from '~/api'
import { processAndCacheUsers } from '~/store/cache/users/utils'
import { SearchKind } from '~/store/pages/search-results/types'
import { getSDK } from '~/store/sdkUtils'
import * as searchUsersModalSelectors from '~/store/ui/search-users-modal/selectors'
import { actions as searchUsersModalActions } from '~/store/ui/search-users-modal/slice'

const { searchUsers, searchUsersSucceeded } = searchUsersModalActions
const { getUserList } = searchUsersModalSelectors

function* doSearchUsers(action: ReturnType<typeof searchUsers>) {
  const { query, limit = 15 } = action.payload
  const sdk = yield* getSDK()
  const userList = yield* select(getUserList)
  try {
    const currentUserId = yield* call(queryCurrentUserId)
    const { data } = yield* call([sdk.search, sdk.search.search], {
      query,
      limit,
      kind: SearchKind.USERS,
      offset: userList.userIds.length,
      userId: OptionalId.parse(currentUserId)
    })
    const users = transformAndCleanList(data?.users ?? [], userMetadataFromSDK)
    yield* call(processAndCacheUsers, users)
    yield* put(
      searchUsersSucceeded({ userIds: users.map((u) => u.user_id), limit })
    )
  } catch (e) {
    console.error(e)
  }
}

function* watchSearchUsers() {
  yield* takeLatest(searchUsers, doSearchUsers)
}

export default function sagas() {
  return [watchSearchUsers]
}
