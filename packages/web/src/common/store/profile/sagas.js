import { userMetadataListFromSDK } from '@audius/common/adapters'
import { DefaultSizes, Kind, Id } from '@audius/common/models'
import { DoubleKeys } from '@audius/common/services'
import {
  accountSelectors,
  cacheActions,
  processAndCacheUsers,
  profilePageActions as profileActions,
  profilePageSelectors,
  FollowType,
  chatActions,
  reachabilitySelectors,
  tippingActions,
  relatedArtistsUIActions as relatedArtistsActions,
  collectiblesActions,
  confirmerActions,
  confirmTransaction
} from '@audius/common/store'
import {
  squashNewLines,
  makeUid,
  makeKindId,
  waitForAccount,
  dataURLtoFile,
  MAX_PROFILE_TOP_SUPPORTERS,
  MAX_PROFILE_SUPPORTING_TILES,
  SUPPORTING_PAGINATION_SIZE
} from '@audius/common/utils'
import { push as pushRoute } from 'connected-react-router'
import { merge } from 'lodash'
import {
  all,
  call,
  fork,
  getContext,
  put,
  select,
  takeEvery
} from 'redux-saga/effects'

import {
  fetchUsers,
  fetchUserByHandle,
  fetchUserCollections,
  fetchUserSocials
} from 'common/store/cache/users/sagas'
import feedSagas from 'common/store/pages/profile/lineups/feed/sagas.js'
import tracksSagas from 'common/store/pages/profile/lineups/tracks/sagas.js'
import {
  subscribeToUserAsync,
  unsubscribeFromUserAsync
} from 'common/store/social/users/sagas'
import { NOT_FOUND_PAGE } from 'utils/route'
import { waitForRead, waitForWrite } from 'utils/sagaHelpers'

import { watchFetchProfileCollections } from './fetchProfileCollectionsSaga'
import { watchFetchTopTags } from './fetchTopTagsSaga'

const { refreshSupport } = tippingActions
const { getIsReachable } = reachabilitySelectors
const { getProfileUserId, getProfileFollowers, getProfileUser } =
  profilePageSelectors

const { getUserId, getAccountUser } = accountSelectors

const {
  updateUserEthCollectibles,
  updateUserSolCollectibles,
  updateSolCollections,
  setHasUnsupportedCollection
} = collectiblesActions

const { fetchPermissions } = chatActions

function* watchFetchProfile() {
  yield takeEvery(profileActions.FETCH_PROFILE, fetchProfileAsync)
}

function* fetchProfileCustomizedCollectibles(user) {
  const audiusBackendInstance = yield getContext('audiusBackendInstance')
  const cid = user?.metadata_multihash ?? null
  if (cid) {
    const metadata = yield call(
      audiusBackendInstance.fetchCID,
      cid,
      /* asUrl */ false
    )
    if (metadata?.collectibles) {
      yield put(
        cacheActions.update(Kind.USERS, [
          {
            id: user.user_id,
            metadata: {
              collectibles: metadata.collectibles,
              collectiblesOrderUnset: false
            }
          }
        ])
      )
    } else {
      yield put(
        cacheActions.update(Kind.USERS, [
          {
            id: user.user_id,
            metadata: {
              collectiblesOrderUnset: true
            }
          }
        ])
      )
    }
  }
}

export function* fetchEthereumCollectiblesForWallets(wallets) {
  const nftClient = yield getContext('nftClient')
  return yield call([nftClient, nftClient.getEthereumCollectibles], wallets)
}

export function* fetchEthereumCollectiblesWithCollections(collectibles) {
  const nftClient = yield getContext('nftClient')
  return yield call(
    [nftClient, nftClient.getEthereumCollectionMetadatasForCollectibles],
    collectibles
  )
}

export function* fetchEthereumCollectibles(user) {
  const apiClient = yield getContext('apiClient')
  const associatedWallets = yield apiClient.getAssociatedWallets({
    userID: user.user_id
  })
  if (associatedWallets) {
    const { wallets } = associatedWallets
    const collectiblesMap = yield call(fetchEthereumCollectiblesForWallets, [
      user.wallet,
      ...wallets
    ])

    const collectibleList = Object.values(collectiblesMap).flat()
    if (!collectibleList.length) {
      console.info('profile has no assets in OpenSea')
    }

    yield put(
      cacheActions.update(Kind.USERS, [
        {
          id: user.user_id,
          metadata: {
            collectibleList
          }
        }
      ])
    )
    yield put(
      updateUserEthCollectibles({
        userId: user.user_id,
        userCollectibles: collectibleList
      })
    )

    // Fetch collections and update state
    const collectiblesWithCollections = yield call(
      fetchEthereumCollectiblesWithCollections,
      collectibleList
    )
    yield put(
      cacheActions.update(Kind.USERS, [
        {
          id: user.user_id,
          metadata: {
            collectibleList: collectiblesWithCollections
          }
        }
      ])
    )
    yield put(
      updateUserEthCollectibles({
        userId: user.user_id,
        userCollectibles: collectiblesWithCollections
      })
    )
  }
}

export function* fetchSolanaCollectiblesForWallets(wallets) {
  const { waitForRemoteConfig } = yield getContext('remoteConfigInstance')
  const nftClient = yield getContext('nftClient')
  yield call(waitForRemoteConfig)
  return yield call([nftClient, nftClient.getSolanaCollectibles], wallets)
}

export function* fetchSolanaCollectibles(user) {
  const apiClient = yield getContext('apiClient')
  const nftClient = yield getContext('nftClient')
  const { waitForRemoteConfig } = yield getContext('remoteConfigInstance')
  yield call(waitForRemoteConfig)
  const { sol_wallets: solWallets } = yield apiClient.getAssociatedWallets({
    userID: user.user_id
  })
  const collectiblesMap = yield call(
    fetchSolanaCollectiblesForWallets,
    solWallets
  )

  const solanaCollectibleList = Object.values(collectiblesMap).flat()
  if (!solanaCollectibleList.length) {
    console.info('profile has no Solana NFTs')
  }

  yield put(
    cacheActions.update(Kind.USERS, [
      {
        id: user.user_id,
        metadata: { solanaCollectibleList }
      }
    ])
  )
  yield put(
    updateUserSolCollectibles({
      userId: user.user_id,
      userCollectibles: solanaCollectibleList
    })
  )

  const heliusCollectionMetadatasMap = solanaCollectibleList.reduce(
    (result, collectible) => {
      const collection = collectible.heliusCollection
      if (collection && !result[collection.address]) {
        result[collection.address] = {
          data: collection,
          imageUrl: collection.imageUrl
        }
      }
      return result
    },
    {}
  )

  // Get verified sol collections from the sol collectibles without helius collections
  // and save their metadata in the redux store.
  // Also keep track of whether the user has unsupported
  // sol collections, which is the case if one of the following is true:
  // - there is a sol nft which has no helius collection and no verified collection chain metadata
  // - there a verified sol nft collection for which we could not fetch the metadata (this is an edge case e.g. we cannot fetch the metadata this collection mint address B3LDTPm6qoQmSEgar2FHUHLt6KEHEGu9eSGejoMMv5eb)
  let hasUnsupportedCollection = false
  const collectiblesWithoutHeliusCollections = solanaCollectibleList.filter(
    (collectible) => !collectible.heliusCollection
  )
  const validNonHeliusCollectionMints = [
    ...new Set(
      collectiblesWithoutHeliusCollections
        .filter((collectible) => {
          const isFromVerifiedCollection =
            !!collectible.solanaChainMetadata?.collection?.verified
          if (!hasUnsupportedCollection && !isFromVerifiedCollection) {
            hasUnsupportedCollection = true
          }
          return isFromVerifiedCollection
        })
        .map((collectible) => {
          const key = collectible.solanaChainMetadata.collection.key
          return typeof key === 'string' ? key : key.toBase58()
        })
    )
  ]
  const nonHeliusCollectionMetadatas = yield all(
    validNonHeliusCollectionMints.map((mint) =>
      call([nftClient, nftClient.getSolanaMetadataFromChain], mint)
    )
  )
  const nonHeliusCollectionMetadatasMap = {}
  nonHeliusCollectionMetadatas.forEach((cm, i) => {
    if (!cm) {
      if (!hasUnsupportedCollection) {
        hasUnsupportedCollection = true
      }
      return
    }
    const { metadata, imageUrl } = cm
    nonHeliusCollectionMetadatasMap[validNonHeliusCollectionMints[i]] = {
      ...metadata.pretty(),
      imageUrl
    }
  })
  yield put(
    updateSolCollections({
      metadatas: {
        ...heliusCollectionMetadatasMap,
        ...nonHeliusCollectionMetadatasMap
      }
    })
  )
  if (hasUnsupportedCollection) {
    yield put(setHasUnsupportedCollection(true))
  }
}

function* fetchSupportersAndSupporting(userId) {
  const { waitForRemoteConfig } = yield getContext('remoteConfigInstance')
  yield call(waitForRemoteConfig)
  yield waitForAccount()

  /**
   * If the profile is that of the logged in user, then
   * get all its supporting data so that when the logged in
   * user is trying to tip an artist, we'll know whether or
   * not that artist is already being supported by the logged in
   * user and thus correctly calculate how much more audio to tip
   * to become the top supporter.
   */
  const account = yield select(getAccountUser)
  const supportingLimit =
    account?.user_id === userId
      ? account.supporting_count
      : Math.max(MAX_PROFILE_SUPPORTING_TILES, SUPPORTING_PAGINATION_SIZE) + 1
  yield put(
    refreshSupport({
      senderUserId: userId,
      receiverUserId: userId,
      supportingLimit,
      supportersLimit: MAX_PROFILE_TOP_SUPPORTERS + 1
    })
  )
}

function* fetchProfileAsync(action) {
  const audiusBackendInstance = yield getContext('audiusBackendInstance')
  const isNativeMobile = yield getContext('isNativeMobile')
  const { getRemoteVar } = yield getContext('remoteConfigInstance')

  try {
    let user
    if (action.handle) {
      user = yield call(
        fetchUserByHandle,
        action.handle,
        new Set(),
        action.forceUpdate,
        action.shouldSetLoading,
        action.deleteExistingEntry
      )
    } else if (action.userId) {
      const users = yield call(
        fetchUsers,
        [action.userId],
        new Set(),
        action.forceUpdate,
        action.shouldSetLoading
      )
      user = users.entries[action.userId]
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

    if (!isNativeMobile) {
      // Fetch user socials and collections after fetching the user itself
      yield fork(fetchUserSocials, action)
      yield fork(fetchUserCollections, user.user_id)
      yield fork(fetchSupportersAndSupporting, user.user_id)
    }

    // Get chat permissions
    yield put(fetchPermissions({ userIds: [user.user_id] }))

    yield fork(fetchProfileCustomizedCollectibles, user)
    yield fork(fetchEthereumCollectibles, user)
    yield fork(fetchSolanaCollectibles, user)

    // Get current user notification & subscription status
    // TODO(michelle) simply use user.does_current_user_subscribe after all DNs
    // are running >v0.4.6
    const isSubscribed =
      'does_current_user_subscribe' in user
        ? user.does_current_user_subscribe
        : yield call(audiusBackendInstance.getUserSubscribed, user.user_id)

    yield put(
      profileActions.setNotificationSubscription(
        user.user_id,
        isSubscribed,
        false,
        user.handle
      )
    )

    if (!isNativeMobile) {
      const showArtistRecommendationsPercent =
        getRemoteVar(DoubleKeys.SHOW_ARTIST_RECOMMENDATIONS_PERCENT) || 0
      if (Math.random() < showArtistRecommendationsPercent) {
        yield put(
          relatedArtistsActions.fetchRelatedArtists({
            artistId: user.user_id
          })
        )
      }
    }

    if (!isNativeMobile) {
      yield put(
        profileActions.fetchFollowUsers(
          FollowType.FOLLOWEE_FOLLOWS,
          undefined,
          undefined,
          action.handle
        )
      )
    }
  } catch (err) {
    console.error(`Fetch users error: ${err}`)
    const isReachable = yield select(getIsReachable)
    if (!isReachable) return
    throw err
  }
}

function* watchFetchFollowUsers(action) {
  yield takeEvery(profileActions.FETCH_FOLLOW_USERS, function* (action) {
    yield call(waitForRead)
    switch (action.followerGroup) {
      case FollowType.FOLLOWEE_FOLLOWS:
        yield call(fetchFolloweeFollows, action)
        break
      default:
    }
  })
}

function* fetchFolloweeFollows(action) {
  const { handle } = action
  if (!handle) return
  const audiusBackendInstance = yield getContext('audiusBackendInstance')
  const profileUserId = yield select((state) => getProfileUserId(state, handle))
  if (!profileUserId) return
  const followeeFollows = yield call(
    audiusBackendInstance.getFolloweeFollows,
    profileUserId,
    action.limit,
    action.offset
  )

  const followerIds = yield call(cacheUsers, followeeFollows)

  yield put(
    profileActions.fetchFollowUsersSucceeded(
      FollowType.FOLLOWEE_FOLLOWS,
      followerIds,
      action.limit,
      action.offset,
      handle
    )
  )
}

function* cacheUsers(users) {
  yield waitForAccount()
  const currentUserId = yield select(getUserId)
  // Filter out the current user from the list to cache
  yield processAndCacheUsers(
    users.filter((user) => user.user_id !== currentUserId)
  )
  return users.map((f) => ({ id: f.user_id }))
}

function* watchUpdateProfile() {
  yield takeEvery(profileActions.UPDATE_PROFILE, updateProfileAsync)
}

export function* updateProfileAsync(action) {
  yield waitForWrite()
  const audiusBackendInstance = yield getContext('audiusBackendInstance')
  let metadata = { ...action.metadata }
  metadata.bio = squashNewLines(metadata.bio)

  const accountUserId = yield select(getUserId)
  yield put(
    cacheActions.update(Kind.USERS, [
      { id: accountUserId, metadata: { name: metadata.name } }
    ])
  )

  // Get existing metadata and combine with it
  const cid = metadata.metadata_multihash ?? null
  if (cid) {
    try {
      const metadataFromIPFS = yield call(
        audiusBackendInstance.fetchCID,
        cid,
        /* asUrl */ false
      )
      const collectibles = metadata.collectibles
      const playlist_library = metadata.playlist_library
      metadata = merge(metadataFromIPFS, metadata)
      metadata.collectibles = collectibles
      metadata.playlist_library = playlist_library
    } catch (e) {
      // Although we failed to fetch the existing user metadata, this should only
      // happen if the user's account data is unavailable across the whole network.
      // In favor of availability, we write anyway.
      console.error(e)
    }
  }

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

  const creator = metadata
  if (metadata.updatedCoverPhoto) {
    metadata._cover_photo_sizes[DefaultSizes.OVERRIDE] =
      metadata.updatedCoverPhoto.url
  }
  if (creator.updatedProfilePicture) {
    metadata._profile_picture_sizes[DefaultSizes.OVERRIDE] =
      metadata.updatedProfilePicture.url
  }

  yield put(
    cacheActions.update(Kind.USERS, [
      {
        id: creator.user_id,
        metadata
      }
    ])
  )
}

function* confirmUpdateProfile(userId, metadata) {
  yield waitForWrite()
  const getSDK = yield getContext('audiusSdk')
  const sdk = yield getSDK()
  const audiusBackendInstance = yield getContext('audiusBackendInstance')
  yield put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.USERS, userId),
      function* () {
        const response = yield call(
          audiusBackendInstance.updateCreator,
          metadata,
          userId
        )
        const { blockHash, blockNumber } = response

        const confirmed = yield call(confirmTransaction, blockHash, blockNumber)
        if (!confirmed) {
          throw new Error(
            `Could not confirm update profile for user id ${userId}`
          )
        }
        yield waitForAccount()
        const currentUserId = yield select(getUserId)
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
        // Update the cached user so it no longer contains image upload artifacts
        // and contains updated profile picture / cover photo sizes if any
        const newMetadata = {
          updatedProfilePicture: null,
          updatedCoverPhoto: null
        }
        if (metadata.updatedCoverPhoto) {
          newMetadata.cover_photo_sizes = confirmedUser.cover_photo_sizes
          newMetadata.cover_photo_cids = confirmedUser.cover_photo_cids
        }
        if (metadata.updatedProfilePicture) {
          newMetadata.profile_picture_sizes =
            confirmedUser.profile_picture_sizes
          newMetadata.profile_picture_cids = confirmedUser.profile_picture_cids
        }
        yield put(
          cacheActions.update(Kind.USERS, [
            {
              id: confirmedUser.user_id,
              metadata: newMetadata
            }
          ])
        )
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

function* watchUpdateCurrentUserFollows() {
  yield takeEvery(
    profileActions.UPDATE_CURRENT_USER_FOLLOWS,
    updateCurrentUserFollows
  )
}

function* updateCurrentUserFollows(action) {
  yield waitForAccount()
  const { handle } = action
  const userId = yield select(getUserId)
  const stuff = yield select((state) => getProfileFollowers(state, handle))
  const { userIds, status } = stuff
  let updatedUserIds = userIds
  if (action.follow) {
    const uid = makeUid(Kind.USERS, userId)
    const profileUser = yield select((state) =>
      getProfileUser(state, { handle })
    )
    if (profileUser.follower_count - 1 === userIds.length) {
      updatedUserIds = userIds.concat({ id: userId, uid })
    }
  } else {
    updatedUserIds = userIds.filter((f) => f.id !== userId)
  }
  yield put(
    profileActions.setProfileField(
      FollowType.FOLLOWERS,
      { status, userIds: updatedUserIds },
      handle
    )
  )
}

function* watchSetNotificationSubscription() {
  yield takeEvery(
    profileActions.SET_NOTIFICATION_SUBSCRIPTION,
    function* (action) {
      // Discovery automatically subscribes on follow so only update if not a subscribe
      // on follow.
      if (action.update) {
        try {
          if (action.isSubscribed) {
            yield fork(subscribeToUserAsync, action.userId)
          } else {
            yield fork(unsubscribeFromUserAsync, action.userId)
          }
        } catch (err) {
          const isReachable = yield select(getIsReachable)
          if (!isReachable) return
          throw err
        }
      }
    }
  )
}

export default function sagas() {
  return [
    ...feedSagas(),
    ...tracksSagas(),
    watchFetchFollowUsers,
    watchFetchProfile,
    watchUpdateProfile,
    watchUpdateCurrentUserFollows,
    watchSetNotificationSubscription,
    watchFetchProfileCollections,
    watchFetchTopTags
  ]
}
