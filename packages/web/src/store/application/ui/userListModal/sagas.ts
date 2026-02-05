import { FavoriteType } from '@audius/common/models'
import {
  coinLeaderboardUserListActions,
  repostsUserListActions as repostActions,
  notificationsUserListActions as notificationActions,
  mutualsUserListActions,
  followingUserListActions as followingActions,
  followersUserListActions as followerActions,
  favoritesUserListActions as favoritesActions,
  relatedArtistsUserListActions,
  RepostType,
  remixersUserListActions,
  purchasersUserListActions,
  PurchaseableContentType
} from '@audius/common/store'
import { takeEvery, put } from 'redux-saga/effects'

import { setUsers } from './slice'
import { UserListType, UserListEntityType } from './types'
const { setMutuals } = mutualsUserListActions
const { setRelatedArtists } = relatedArtistsUserListActions

function* watchSetUsers() {
  yield takeEvery(
    setUsers.type,
    function* (action: ReturnType<typeof setUsers>) {
      const { payload } = action
      const { userListType, entityType } = payload
      if (userListType === UserListType.NOTIFICATION && 'entity' in payload) {
        yield put(notificationActions.setNotification(payload.entity))
        return
      }

      if (
        userListType === UserListType.COIN_LEADERBOARD &&
        'entity' in payload
      ) {
        yield put(
          coinLeaderboardUserListActions.setCoinLeaderboard(
            payload.entity as string
          )
        )
        return
      }

      if ('id' in payload) {
        const { id } = payload
        switch (userListType) {
          case UserListType.FAVORITE:
            yield put(
              favoritesActions.setFavorite(
                id,
                entityType === UserListEntityType.TRACK
                  ? FavoriteType.TRACK
                  : FavoriteType.PLAYLIST
              )
            )
            break
          case UserListType.REPOST:
            yield put(
              repostActions.setRepost(
                id,
                entityType === UserListEntityType.TRACK
                  ? RepostType.TRACK
                  : RepostType.COLLECTION
              )
            )
            break
          case UserListType.FOLLOWER:
            yield put(followerActions.setFollowers(id))
            break
          case UserListType.FOLLOWING:
            yield put(followingActions.setFollowing(id))
            break
          case UserListType.MUTUAL_FOLLOWER:
            yield put(setMutuals(id))
            break
          case UserListType.RELATED_ARTISTS:
            yield put(setRelatedArtists(id))
            break
          case UserListType.REMIXER:
            yield put(remixersUserListActions.setRemixers(id))
            break
          case UserListType.PURCHASER:
            yield put(
              purchasersUserListActions.setPurchasers(
                entityType === UserListEntityType.USER ? undefined : id,
                entityType === UserListEntityType.TRACK
                  ? PurchaseableContentType.TRACK
                  : entityType === UserListEntityType.COLLECTION
                    ? PurchaseableContentType.ALBUM
                    : undefined
              )
            )
            break
          default:
            break
        }
      }
    }
  )
}

export default function sagas() {
  return [watchSetUsers]
}
