import { ID, User } from '@audius/common/models'
import { AudiusBackend } from '@audius/common/services'
import {
  cacheUsersSelectors,
  UserListSagaFactory,
  mutualsUserListActions,
  mutualsUserListSelectors,
  MUTUALS_USER_LIST_TAG,
  getContext
} from '@audius/common/store'
import { call, put, select } from 'typed-redux-saga'

import { watchMutualsError } from 'common/store/user-list/mutuals/errorSagas'
import { createUserListProvider } from 'common/store/user-list/utils'
const { getMutualsError } = mutualsUserListActions
const { getId, getUserList, getUserIds } = mutualsUserListSelectors
const { getUser } = cacheUsersSelectors

type FetchMutualsConfig = {
  limit: number
  offset: number
  entityId: ID
  currentUserId: ID | null
}

const fetchAllUsersForEntity = function* ({
  limit,
  offset,
  entityId: userId
}: FetchMutualsConfig) {
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')

  const mutuals = yield* call(
    [audiusBackendInstance, audiusBackendInstance.getFolloweeFollows],
    userId,
    limit,
    offset
  )
  return { users: mutuals }
}

const provider = createUserListProvider<User>({
  getExistingEntity: getUser,
  extractUserIDSubsetFromEntity: () => [],
  fetchAllUsersForEntity,
  selectCurrentUserIDsInList: getUserIds,
  canFetchMoreUsers: (user: User, combinedUserIDs: ID[]) =>
    combinedUserIDs.length < user.current_user_followee_follow_count,
  includeCurrentUser: (_) => false
})

function* errorDispatcher(error: Error) {
  const id = yield* select(getId)
  if (id) {
    yield* put(getMutualsError(id, error.message))
  }
}

function* getMutuals(currentPage: number, pageSize: number) {
  const id = yield* select(getId)
  if (!id) return { userIds: [], hasMore: false }
  return yield* provider({ id, currentPage, pageSize })
}

const userListSagas = UserListSagaFactory.createSagas({
  tag: MUTUALS_USER_LIST_TAG,
  fetchUsers: getMutuals,
  stateSelector: getUserList,
  errorDispatcher
})

export default function sagas() {
  return [userListSagas, watchMutualsError]
}
