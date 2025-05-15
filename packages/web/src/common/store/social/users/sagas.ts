import { queryUser, queryUsers } from '@audius/common/api'
import { Name, Kind, ID, UserMetadata } from '@audius/common/models'
import {
  accountSelectors,
  cacheActions,
  profilePageActions,
  usersSocialActions as socialActions,
  getContext,
  confirmerActions,
  confirmTransaction,
  cacheUsersSelectors
} from '@audius/common/store'
import { makeKindId, route } from '@audius/common/utils'
import { Id } from '@audius/sdk'
import { Action } from '@reduxjs/toolkit'
import { call, select, takeEvery, put } from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'
import { adjustUserField } from 'common/store/cache/users/sagas'
import * as signOnActions from 'common/store/pages/signon/actions'
import { waitForWrite } from 'utils/sagaHelpers'

import errorSagas from './errorSagas'

const { profilePage } = route
const { setNotificationSubscription } = profilePageActions
const { getUserId, getIsGuestAccount } = accountSelectors
const { getUsers } = cacheUsersSelectors

/* FOLLOW */

export function* watchFollowUser() {
  yield* takeEvery(socialActions.FOLLOW_USER, followUser)
}

export function* followUser(
  action: ReturnType<typeof socialActions.followUser>
) {
  yield* call(waitForWrite)
  const accountId = yield* select(getUserId)
  const isGuest = yield* select(getIsGuestAccount)
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
    yield* put(
      cacheActions.update(Kind.USERS, [
        {
          id: action.userId,
          metadata: {
            does_current_user_follow: true,
            follower_count: followedUser.follower_count + 1
          }
        }
      ])
    )
  }
  // Increment the signed in user's followee count
  yield* call(adjustUserField, {
    user: currentUser,
    fieldName: 'followee_count',
    delta: 1
  })

  const event = make(Name.FOLLOW, { id: action.userId, source: action.source })
  yield* put(event)

  yield* call(
    confirmFollowUser,
    action.userId,
    accountId,
    action.onSuccessActions
  )
  yield* put(
    setNotificationSubscription(
      action.userId,
      /* isSubscribed */ true,
      /* update */ false
    )
  )
}

export function* confirmFollowUser(
  userId: ID,
  accountId: ID,
  onSuccessActions?: Action[]
) {
  const audiusSdk = yield* getContext('audiusSdk')
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
          yield* put(
            cacheActions.update(Kind.USERS, [
              {
                id: userId,
                metadata: {
                  does_current_user_follow: false,
                  follower_count: followedUser.follower_count - 1
                }
              }
            ])
          )
        }

        if (currentUser) {
          // Revert the incremented followee count on the current user
          yield* call(adjustUserField, {
            user: currentUser,
            fieldName: 'followee_count',
            delta: -1
          })
        }
      }
    )
  )
}

export function* watchFollowUserSucceeded() {
  yield* takeEvery(socialActions.FOLLOW_USER_SUCCEEDED, followUserSucceeded)
}

export function* followUserSucceeded(
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
}

export function* watchUnfollowUser() {
  yield* takeEvery(socialActions.UNFOLLOW_USER, unfollowUser)
}

export function* unfollowUser(
  action: ReturnType<typeof socialActions.unfollowUser>
) {
  /* Make Async Backend Call */
  yield* call(waitForWrite)
  const accountId = yield* select(getUserId)
  const isGuest = yield* select(getIsGuestAccount)
  if (!accountId || isGuest) {
    yield* put(signOnActions.openSignOn(false))
    yield* put(signOnActions.showRequiresAccountToast())
    yield* put(make(Name.CREATE_ACCOUNT_OPEN, { source: 'social action' }))
    return
  }
  if (accountId === action.userId) {
    return
  }

  const users = yield* select(getUsers, { ids: [action.userId, accountId] })
  const unfollowedUser = users[action.userId].metadata
  const currentUser = users[accountId].metadata

  // Decrement the follower count on the unfollowed user
  yield* put(
    cacheActions.update(Kind.USERS, [
      {
        id: action.userId,
        metadata: {
          does_current_user_follow: false,
          follower_count: unfollowedUser.follower_count - 1
        }
      }
    ])
  )

  // Decrement the followee count on the current user
  yield* call(adjustUserField, {
    user: currentUser,
    fieldName: 'followee_count',
    delta: -1
  })

  const event = make(Name.UNFOLLOW, {
    id: action.userId,
    source: action.source
  })
  yield* put(event)

  yield* call(confirmUnfollowUser, action.userId, accountId)
  yield* put(
    setNotificationSubscription(
      action.userId,
      /* isSubscribed */ false,
      /* update */ false
    )
  )
}

export function* confirmUnfollowUser(userId: ID, accountId: ID) {
  const audiusSdk = yield* getContext('audiusSdk')
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
        const users = yield* select(getUsers, { ids: [userId, accountId] })
        const unfollowedUser = users[userId].metadata
        const currentUser = users[accountId].metadata

        // Revert decremented follower count on unfollowed user
        yield* put(
          cacheActions.update(Kind.USERS, [
            {
              id: userId,
              metadata: {
                does_current_user_follow: true,
                follower_count: unfollowedUser.follower_count + 1
              }
            }
          ])
        )

        // Revert decremented followee count on current user
        yield* call(adjustUserField, {
          user: currentUser,
          fieldName: 'followee_count',
          delta: 1
        })
      }
    )
  )
}

/* SUBSCRIBE */

export function* subscribeToUserAsync(userId: ID) {
  yield* call(waitForWrite)

  const accountId = yield* select(getUserId)
  if (!accountId) {
    return
  }

  yield* put(
    cacheActions.update(Kind.USERS, [
      {
        id: userId,
        metadata: {
          does_current_user_subscribe: true
        }
      }
    ])
  )

  yield* call(confirmSubscribeToUser, userId, accountId)
}

export function* confirmSubscribeToUser(userId: ID, accountId: ID) {
  const audiusSdk = yield* getContext('audiusSdk')
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
        yield* put(
          cacheActions.update(Kind.USERS, [
            {
              id: userId,
              metadata: {
                does_current_user_subscribe: false
              }
            }
          ])
        )
      }
    )
  )
}

export function* unsubscribeFromUserAsync(userId: ID) {
  yield* call(waitForWrite)

  const accountId = yield* select(getUserId)
  if (!accountId) {
    return
  }

  yield* put(
    cacheActions.update(Kind.USERS, [
      {
        id: userId,
        metadata: {
          does_current_user_subscribe: false
        }
      }
    ])
  )
  yield* call(confirmUnsubscribeFromUser, userId, accountId)
}

export function* confirmUnsubscribeFromUser(userId: ID, accountId: ID) {
  const audiusSdk = yield* getContext('audiusSdk')
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
        yield* put(
          cacheActions.update(Kind.USERS, [
            {
              id: userId,
              metadata: {
                does_current_user_subscribe: true
              }
            }
          ])
        )
      }
    )
  )
}

/* SHARE */

export function* watchShareUser() {
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
    watchShareUser,
    errorSagas
  ]
}

export default sagas
