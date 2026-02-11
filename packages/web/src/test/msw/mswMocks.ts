import { userMetadataFromSDK } from '@audius/common/adapters'
import {
  getCurrentAccountQueryKey,
  getUserQueryKey,
  getWalletAddressesQueryKey
} from '@audius/common/api'
import { Status } from '@audius/common/models'
import { developmentConfig, HashId } from '@audius/sdk'
import { http, HttpResponse } from 'msw'

import { queryClient } from 'services/query-client'
import {
  mockArtistCoin,
  mockUserCoinHasBalance,
  mockCoinMembers
} from 'test/mocks/fixtures/artistCoins'
import { testCollection } from 'test/mocks/fixtures/collections'
import { testTrack } from 'test/mocks/fixtures/tracks'
import { artistUser, nonArtistUser } from 'test/mocks/fixtures/users'

const { apiEndpoint } = developmentConfig.network

/**
 * TODO: Use better types - these types need to match the API, not the SDK outputs
 */

type TestUser = typeof artistUser | typeof nonArtistUser

/**
 *  User mocks (v1/full for legacy; v1 for default API used by useUserByHandle)
 */
export const mockUserByHandle = (user: typeof artistUser) => [
  http.get(`${apiEndpoint}/v1/full/users/handle/${user.handle}`, () =>
    HttpResponse.json({ data: [user] })
  ),
  http.get(`${apiEndpoint}/v1/users/handle/${user.handle}`, () =>
    HttpResponse.json({ data: user })
  )
]

export const mockRelatedUsers = (
  user: typeof artistUser,
  relatedUsers?: TestUser[]
) =>
  http.get(`${apiEndpoint}/v1/full/users/${user.id}/related`, () =>
    HttpResponse.json({ data: relatedUsers ?? [] })
  )

export const mockNfts = () =>
  http.get(
    'https://rinkeby-api.opensea.io/api/v2/chain/ethereum/account/0x123/nfts',
    () => HttpResponse.json({ data: [] })
  )

export const mockCurrentAccount = (
  user: typeof artistUser | typeof nonArtistUser
) => {
  // Set wallet addresses first - this is required for useCurrentAccount to be enabled
  queryClient.setQueryData(getWalletAddressesQueryKey(), {
    currentUser: user.wallet,
    web3User: user.wallet
  })

  const account = {
    collections: {},
    userId: HashId.parse(user.id),
    hasTracks: false,
    status: Status.SUCCESS,
    reason: null,
    connectivityFailure: false,
    needsAccountRecovery: false,
    walletAddresses: {
      currentUser: user.wallet,
      web3User: user.wallet
    },
    playlistLibrary: null,
    trackSaveCount: 0,
    guestEmail: null
  }

  queryClient.setQueryData(getCurrentAccountQueryKey(), account)
  queryClient.setQueryData(
    getUserQueryKey(HashId.parse(user.id)),
    // @ts-ignore - user is a TestUser, not matching full user type spec (yet)
    userMetadataFromSDK(user)
  )
  // Set current account data
  return http.get(`${apiEndpoint}/v1/full/users/account/${user.wallet}`, () =>
    HttpResponse.json({ data: account })
  )
}

/**
 * Wallets
 */
export const mockUserConnectedWallets = (user: typeof artistUser) =>
  http.get(`${apiEndpoint}/v1/users/${user.id}/connected_wallets`, () =>
    HttpResponse.json({
      data: { erc_wallets: [], spl_wallets: [] }
    })
  )

/**
 * Events
 */
export const mockEvents = (/* todo: */) =>
  http.get(`${apiEndpoint}/v1/events/entity`, () =>
    HttpResponse.json({ data: [] })
  )

/**
 * Artist Coins
 */
export const mockCoinByMint = (coin: typeof mockArtistCoin) =>
  http.get(`${apiEndpoint}/v1/coins/${coin.mint}`, () =>
    HttpResponse.json({ data: coin })
  )

export const mockCoinByTicker = (coin: typeof mockArtistCoin) =>
  http.get(`${apiEndpoint}/v1/coins/ticker/${coin.ticker}`, () =>
    HttpResponse.json({ data: coin })
  )

export const mockCoinMembersCount = (mint: string, count: number) =>
  http.get(`${apiEndpoint}/v1/coins/${mint}/members/count`, () =>
    HttpResponse.json({ data: count })
  )

export const mockUserCoinsByMint = (
  userId: string,
  mint: string,
  holdings: typeof mockUserCoinHasBalance
) =>
  http.get(`${apiEndpoint}/v1/users/${userId}/coins/${mint}`, () =>
    HttpResponse.json({ data: holdings })
  )

export const mockCoinMembersList = (
  mint: string,
  members: typeof mockCoinMembers
) =>
  http.get(`${apiEndpoint}/v1/coins/${mint}/members`, () =>
    HttpResponse.json({ data: members })
  )
export const mockUserCreatedCoin = (
  userId: string,
  coin: typeof mockArtistCoin
) => {
  return http.get(`${apiEndpoint}/v1/coins`, ({ request }) => {
    const url = new URL(request.url)
    const ownerId = url.searchParams.get('owner_id')

    if (ownerId && ownerId === userId) {
      return HttpResponse.json({ data: [coin] })
    }

    return HttpResponse.json({ data: [] })
  })
}

/**
 * Collections
 */
export const mockCollectionById = (collection: typeof testCollection & any) =>
  http.get(`${apiEndpoint}/v1/playlists`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (id && id === collection.id.toString()) {
      return HttpResponse.json({ data: [collection] })
    }

    return HttpResponse.json({ data: [] })
  })

const tracksByIdHandler =
  (track: typeof testTrack & any) =>
  ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    const idParam = url.searchParams.get('id')
    const idArrayParams = url.searchParams.getAll('id[]')
    const ids =
      idArrayParams.length > 0 ? idArrayParams : idParam ? [idParam] : []

    const trackIdStr = track.id?.toString()
    const trackTrackIdStr = track.track_id?.toString()
    const trackIdNum = track.id
    const trackTrackIdNum = track.track_id

    const matches = ids.some((id) => {
      const idNum = Number(id)
      return (
        id === trackIdStr ||
        id === trackTrackIdStr ||
        (!isNaN(idNum) &&
          (idNum === Number(trackIdNum) || idNum === Number(trackTrackIdNum)))
      )
    })

    if (ids.length === 0 || matches) {
      return HttpResponse.json({ data: [track] })
    }
    return HttpResponse.json({ data: [] })
  }

/**
 * Tracks (matches both v1/full/tracks and v1/tracks for migration)
 */
export const mockTrackById = (track: typeof testTrack & any) => [
  http.get(`${apiEndpoint}/v1/full/tracks`, tracksByIdHandler(track)),
  http.get(`${apiEndpoint}/v1/tracks`, tracksByIdHandler(track))
]

/**
 * Notifications
 */
export const mockUsers = (users: (typeof artistUser)[]) =>
  http.get(`${apiEndpoint}/v1/full/users`, () =>
    HttpResponse.json({ data: users })
  )

/**
 * v1/users (default API) - bulk get users by id, used by getUsersBatcher
 */
export const mockUsersById = (users: (typeof artistUser)[]) =>
  http.get(`${apiEndpoint}/v1/users`, ({ request }) => {
    const url = new URL(request.url)
    const idParam = url.searchParams.get('id')
    const idArrayParams = url.searchParams.getAll('id[]')
    const ids =
      idArrayParams.length > 0 ? idArrayParams : idParam ? [idParam] : []

    if (ids.length === 0) {
      return HttpResponse.json({ data: users })
    }
    const filtered = users.filter((u) => ids.includes(u.id?.toString()))
    return HttpResponse.json({ data: filtered })
  })

const escapedApi = apiEndpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Match path with optional query string (?...)
const v1UserTracksPath = new RegExp(
  `^${escapedApi}/v1/users/[^/]+/tracks(\\?|$)`
)
const v1UserTracksCountPath = new RegExp(
  `^${escapedApi}/v1/users/[^/]+/tracks/count(\\?|$)`
)

/**
 * v1/users/:id/tracks (default API) - user's tracks, used by getTracksByUser.
 * Call with no args to match any user and return [].
 */
export const mockUserTracks = (
  userIdOrTracks?: string | (typeof testTrack)[],
  tracks?: (typeof testTrack)[]
): ReturnType<typeof http.get> => {
  if (userIdOrTracks === undefined) {
    return http.get(v1UserTracksPath, () => HttpResponse.json({ data: [] }))
  }
  if (Array.isArray(userIdOrTracks)) {
    return http.get(v1UserTracksPath, () =>
      HttpResponse.json({ data: userIdOrTracks })
    )
  }
  return http.get(`${apiEndpoint}/v1/users/${userIdOrTracks}/tracks`, () =>
    HttpResponse.json({ data: tracks ?? [] })
  )
}

/**
 * v1/users/:id/tracks/count (default API) - user's track count, used by getTracksCountByUser.
 * Call with no args to match any user and return 0.
 */
export const mockUserTracksCount = (
  userIdOrCount?: string | number,
  count?: number
): ReturnType<typeof http.get> => {
  if (userIdOrCount === undefined) {
    return http.get(v1UserTracksCountPath, () => HttpResponse.json({ data: 0 }))
  }
  if (typeof userIdOrCount === 'number') {
    return http.get(v1UserTracksCountPath, () =>
      HttpResponse.json({ data: userIdOrCount })
    )
  }
  return http.get(`${apiEndpoint}/v1/users/${userIdOrCount}/tracks/count`, () =>
    HttpResponse.json({ data: count ?? 0 })
  )
}

export const mockTracks = (tracks: (typeof testTrack)[]) =>
  http.get(`${apiEndpoint}/v1/full/tracks`, () =>
    HttpResponse.json({ data: tracks })
  )
