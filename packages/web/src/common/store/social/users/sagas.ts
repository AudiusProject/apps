import {
  queryAccountUser,
  queryUsers,
  selectIsGuestAccount,
  queryUser,
  getUserQueryKey,
  queryCurrentUserId
} from '@audius/common/api'
import { Name, Kind, ID, UserMetadata } from '@audius/common/models'
import {
  usersSocialActions as socialActions,
  getContext,
  confirmerActions,
  confirmTransaction
} from '@audius/common/store'
import { makeKindId, route } from '@audius/common/utils'
import { Id } from '@audius/sdk'
import { Action } from '@reduxjs/toolkit'
import { call, takeEvery, put } from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'
import * as signOnActions from 'common/store/pages/signon/actions'
import { waitForWrite } from 'utils/sagaHelpers'

import errorSagas from './errorSagas'

const { profilePage } = route

/* FOLLOW */

function* watchFollowUser() {
  yield* takeEvery(socialActions.FOLLOW_USER, followUser)
}

function* followUser(action: ReturnType<typeof socialActions.followUser>) {
  yield* call(waitForWrite)
  const queryClient = yield* getContext('queryClient')
  const accountUser = yield* queryAccountUser()
  const { user_id: accountId } = accountUser ?? {}
  const isGuest = yield* call(selectIsGuestAccount, accountUser)
  if (!accountId || isGuest) {
    yield* put(signOnActions.openSignOn(false))
    yield* put(signOnActions.showRequiresAccountToast())
    yield* put(make(Name.CREATE_ACCOUNT_OPEN, { source: 'social action' }))
    return
  }
  if (accountId === action.userId) {
    return
  }

  const users = yield* queryUsers([action.userId, accountId])
  let followedUser: UserMetadata = users[action.userId]
  const currentUser = users[accountId]

  if (!followedUser) {
    try {
      // If we haven't cached the followed user, need to fetch and cache it first to ensure that we have the correct `does_current_user_follow` on the user value before the follow gets indexed.
      const user = yield* call(queryUser, action.userId)
      if (user) {
        followedUser = user
      } else {
        throw new Error()
      }
    } catch (e) {
      console.error('Failed to fetch the followed user', action.userId)
    }
  }

  if (followedUser) {
    // Increment the followed user's follower count
    queryClient.setQueryData(getUserQueryKey(action.userId), (prevUser) =>
      !prevUser
        ? undefined
        : {
            ...prevUser,
            does_current_user_follow: true,
            follower_count: prevUser.follower_count + 1,
            does_current_user_subscribe: true
          }
    )
  }
  // Increment the signed in user's followee count
  queryClient.setQueryData(getUserQueryKey(currentUser.user_id), (prevUser) =>
    !prevUser
      ? undefined
      : {
          ...prevUser,
          followee_count: prevUser.followee_count + 1
        }
  )

  const event = make(Name.FOLLOW, { id: action.userId, source: action.source })
  yield* put(event)

  yield* call(
    confirmFollowUser,
    action.userId,
    accountId,
    action.onSuccessActions
  )
}

function* confirmFollowUser(
  userId: ID,
  accountId: ID,
  onSuccessActions?: Action[]
) {
  const audiusSdk = yield* getContext('audiusSdk')
  const queryClient = yield* getContext('queryClient')

  const sdk = yield* call(audiusSdk)
  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.USERS, userId),
      function* () {
        const { blockHash, blockNumber } = yield* call(
          [sdk.users, sdk.users.followUser],
          {
            userId: Id.parse(accountId),
            followeeUserId: Id.parse(userId)
          }
        )
        const confirmed = yield* call(
          confirmTransaction,
          blockHash,
          blockNumber
        )
        if (!confirmed) {
          throw new Error(
            `Could not confirm follow user for user id ${userId} and account id ${accountId}`
          )
        }
        return accountId
      },
      function* () {
        yield* put(socialActions.followUserSucceeded(userId, onSuccessActions))
      },
      function* ({ timeout, message }: { timeout: boolean; message: string }) {
        yield* put(
          socialActions.followUserFailed(userId, timeout ? 'Timeout' : message)
        )
        const followedUser = yield* queryUser(userId)
        const currentUser = yield* queryUser(accountId)
        if (followedUser) {
          // Revert the incremented follower count on the followed user
          queryClient.setQueryData(getUserQueryKey(userId), (prevUser) =>
            !prevUser
              ? undefined
              : {
                  ...prevUser,
                  does_current_user_follow: false,
                  follower_count: prevUser.follower_count - 1
                }
          )
        }

        if (currentUser) {
          // Revert the incremented followee count on the current user
          queryClient.setQueryData(
            getUserQueryKey(currentUser.user_id),
            (prevUser) =>
              !prevUser
                ? undefined
                : {
                    ...prevUser,
                    followee_count: prevUser.followee_count - 1
                  }
          )
        }
      }
    )
  )
}

function* watchFollowUserSucceeded() {
  yield* takeEvery(socialActions.FOLLOW_USER_SUCCEEDED, followUserSucceeded)
}

function* followUserSucceeded(
  action: ReturnType<typeof socialActions.followUserSucceeded>
) {
  const { onSuccessActions } = action
  // Do any callbacks
  if (onSuccessActions) {
    // Spread here to unfreeze the action
    // Redux sagas can't "put" frozen actions
    for (const onSuccessAction of onSuccessActions) {
      yield* put({ ...onSuccessAction })
    }
  }

  // Auto-subscribe when following a user
  const { userId } = action

  // Call the subscribe saga (it handles the optimistic update)
  yield* call(subscribeToUserAsync, userId)
}

function* watchUnfollowUser() {
  yield* takeEvery(socialActions.UNFOLLOW_USER, unfollowUser)
}

function* unfollowUser(action: ReturnType<typeof socialActions.unfollowUser>) {
  /* Make Async Backend Call */
  yield* call(waitForWrite)
  const queryClient = yield* getContext('queryClient')
  const accountUser = yield* queryAccountUser()
  const { user_id: accountId } = accountUser ?? {}
  const isGuest = yield* call(selectIsGuestAccount, accountUser)
  if (!accountId || isGuest) {
    yield* put(signOnActions.openSignOn(false))
    yield* put(signOnActions.showRequiresAccountToast())
    yield* put(make(Name.CREATE_ACCOUNT_OPEN, { source: 'social action' }))
    return
  }
  if (accountId === action.userId) {
    return
  }

  const currentUserId = yield* call(queryCurrentUserId)

  // Decrement the follower count on the unfollowed user
  queryClient.setQueryData(getUserQueryKey(action.userId), (prevUser) =>
    !prevUser
      ? undefined
      : {
          ...prevUser,
          does_current_user_follow: false,
          follower_count: prevUser.follower_count - 1,
          does_current_user_subscribe: false
        }
  )

  // Decrement the followee count on the current user
  queryClient.setQueryData(getUserQueryKey(currentUserId), (prevUser) =>
    !prevUser
      ? undefined
      : {
          ...prevUser,
          followee_count: prevUser.followee_count - 1
        }
  )

  const event = make(Name.UNFOLLOW, {
    id: action.userId,
    source: action.source
  })
  yield* put(event)

  yield* call(confirmUnfollowUser, action.userId, accountId)

  // Auto-unsubscribe when unfollowing a user
  yield* call(unsubscribeFromUserAsync, action.userId)
}

function* confirmUnfollowUser(userId: ID, accountId: ID) {
  const audiusSdk = yield* getContext('audiusSdk')
  const queryClient = yield* getContext('queryClient')
  const sdk = yield* call(audiusSdk)
  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.USERS, userId),
      function* () {
        const { blockHash, blockNumber } = yield* call(
          [sdk.users, sdk.users.unfollowUser],
          {
            userId: Id.parse(accountId),
            followeeUserId: Id.parse(userId)
          }
        )
        const confirmed = yield* call(
          confirmTransaction,
          blockHash,
          blockNumber
        )
        if (!confirmed) {
          throw new Error(
            `Could not confirm unfollow user for user id ${userId} and account id ${accountId}`
          )
        }
        return accountId
      },
      function* () {
        yield* put(socialActions.unfollowUserSucceeded(userId))
      },
      function* ({ timeout, message }: { timeout: boolean; message: string }) {
        yield* put(
          socialActions.unfollowUserFailed(
            userId,
            timeout ? 'Timeout' : message
          )
        )
        const currentUserId = yield* call(queryCurrentUserId)

        // Revert decremented follower count on unfollowed user
        queryClient.setQueryData(getUserQueryKey(userId), (prevUser) =>
          !prevUser
            ? undefined
            : {
                ...prevUser,
                does_current_user_follow: true,
                follower_count: prevUser.follower_count + 1
              }
        )

        // Revert decremented followee count on current user
        queryClient.setQueryData(getUserQueryKey(currentUserId), (prevUser) =>
          !prevUser
            ? undefined
            : {
                ...prevUser,
                followee_count: prevUser.followee_count + 1
              }
        )
      }
    )
  )
}

/* SUBSCRIBE */

function* watchSubscribeUser() {
  yield* takeEvery(
    socialActions.SUBSCRIBE_USER,
    function* (action: ReturnType<typeof socialActions.subscribeUser>) {
      yield* call(subscribeToUserAsync, action.userId)
    }
  )
}

function* watchUnsubscribeUser() {
  yield* takeEvery(
    socialActions.UNSUBSCRIBE_USER,
    function* (action: ReturnType<typeof socialActions.unsubscribeUser>) {
      yield* call(unsubscribeFromUserAsync, action.userId)
    }
  )
}

function* subscribeToUserAsync(userId: ID) {
  yield* call(waitForWrite)
  const queryClient = yield* getContext('queryClient')
  const accountUser = yield* queryAccountUser()
  const { user_id: accountId } = accountUser ?? {}
  if (!accountId) {
    return
  }

  queryClient.setQueryData(getUserQueryKey(userId), (prevUser) =>
    !prevUser
      ? undefined
      : {
          ...prevUser,
          does_current_user_subscribe: true
        }
  )

  yield* call(confirmSubscribeToUser, userId, accountId)
}

function* confirmSubscribeToUser(userId: ID, accountId: ID) {
  const audiusSdk = yield* getContext('audiusSdk')
  const queryClient = yield* getContext('queryClient')
  const sdk = yield* call(audiusSdk)
  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.USERS, userId),
      function* () {
        const { blockHash, blockNumber } = yield* call(
          [sdk.users, sdk.users.subscribeToUser],
          {
            subscribeeUserId: Id.parse(userId),
            userId: Id.parse(accountId)
          }
        )
        const confirmed = yield* call(
          confirmTransaction,
          blockHash,
          blockNumber
        )
        if (!confirmed) {
          throw new Error(
            `Could not confirm subscribe to user for user id ${userId} and account id ${accountId}`
          )
        }
        return accountId
      },
      function* () {},
      function* ({ timeout, message }: { timeout: boolean; message: string }) {
        yield* put(
          socialActions.subscribeUserFailed(
            userId,
            timeout ? 'Timeout' : message
          )
        )
        queryClient.setQueryData(getUserQueryKey(userId), (prevUser) =>
          !prevUser
            ? undefined
            : {
                ...prevUser,
                does_current_user_subscribe: false
              }
        )
      }
    )
  )
}

function* unsubscribeFromUserAsync(userId: ID) {
  yield* call(waitForWrite)
  const queryClient = yield* getContext('queryClient')
  const accountUser = yield* queryAccountUser()
  const { user_id: accountId } = accountUser ?? {}
  if (!accountId) {
    return
  }

  queryClient.setQueryData(getUserQueryKey(userId), (prevUser) =>
    !prevUser
      ? undefined
      : {
          ...prevUser,
          does_current_user_subscribe: false
        }
  )
  yield* call(confirmUnsubscribeFromUser, userId, accountId)
}

function* confirmUnsubscribeFromUser(userId: ID, accountId: ID) {
  const audiusSdk = yield* getContext('audiusSdk')
  const queryClient = yield* getContext('queryClient')
  const sdk = yield* call(audiusSdk)
  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.USERS, userId),
      function* () {
        const { blockHash, blockNumber } = yield* call(
          [sdk.users, sdk.users.unsubscribeFromUser],
          {
            subscribeeUserId: Id.parse(userId),
            userId: Id.parse(accountId)
          }
        )
        const confirmed = yield* call(
          confirmTransaction,
          blockHash,
          blockNumber
        )
        if (!confirmed) {
          throw new Error(
            `Could not confirm unsubscribe from user for user id ${userId} and account id ${accountId}`
          )
        }
        return accountId
      },
      function* () {},
      function* ({ timeout, message }: { timeout: boolean; message: string }) {
        yield* put(
          socialActions.unsubscribeUserFailed(
            userId,
            timeout ? 'Timeout' : message
          )
        )
        queryClient.setQueryData(getUserQueryKey(userId), (prevUser) =>
          !prevUser
            ? undefined
            : {
                ...prevUser,
                does_current_user_subscribe: true
              }
        )
      }
    )
  )
}

/* SHARE */

function* watchShareUser() {
  yield* takeEvery(
    socialActions.SHARE_USER,
    function* (action: ReturnType<typeof socialActions.shareUser>) {
      const { userId, source } = action

      const user = yield* queryUser(userId)
      if (!user) return

      const link = profilePage(user.handle)
      const share = yield* getContext('share')
      share(link, user.name)

      const event = make(Name.SHARE, {
        kind: 'profile',
        id: userId,
        url: link,
        source
      })
      yield* put(event)
    }
  )
}

const sagas = () => {
  return [
    watchFollowUser,
    watchUnfollowUser,
    watchFollowUserSucceeded,
    watchSubscribeUser,
    watchUnsubscribeUser,
    watchShareUser,
    errorSagas
  ]
}

export default sagas
