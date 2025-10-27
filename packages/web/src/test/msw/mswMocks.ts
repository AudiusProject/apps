import { User } from '@audius/common/models'
import { developmentConfig } from '@audius/sdk'
import { http, HttpResponse } from 'msw'

import { mockArtistCoin } from 'test/mocks/fixtures/artistCoins'
import { testCollection } from 'test/mocks/fixtures/collections'
import { testTrack } from 'test/mocks/fixtures/tracks'
import { artistUser } from 'test/mocks/fixtures/users'

const { apiEndpoint } = developmentConfig.network

/**
 * TODO: Use better types - these types need to match the API, not the SDK outputs
 */

/**
 *  User mocks
 */
export const mockUserByHandle = (user: typeof artistUser) =>
  http.get(`${apiEndpoint}/v1/full/users/handle/${user.handle}`, () =>
    HttpResponse.json({ data: [user] })
  )

export const mockSupportingUsers = (
  user: typeof artistUser,
  supportingUsers?: User[]
) =>
  http.get(`${apiEndpoint}/v1/full/users/${user.id}/supporting`, () =>
    HttpResponse.json({ data: supportingUsers ?? [] })
  )

export const mockSupporterUsers = (
  user: typeof artistUser,
  supporterUsers?: User[]
) =>
  http.get(`${apiEndpoint}/v1/full/users/${user.id}/supporters`, () =>
    HttpResponse.json({ data: supporterUsers ?? [] })
  )

export const mockRelatedUsers = (
  user: typeof artistUser,
  relatedUsers?: User[]
) =>
  http.get(`${apiEndpoint}/v1/full/users/${user.id}/related`, () =>
    HttpResponse.json({ data: relatedUsers ?? [] })
  )

export const mockNfts = () =>
  http.get(
    'https://rinkeby-api.opensea.io/api/v2/chain/ethereum/account/0x123/nfts',
    () => HttpResponse.json({ data: [] })
  )

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
  http.get(`${apiEndpoint}/v1/coins/ticker/${coin.symbol}`, () =>
    HttpResponse.json({ data: coin })
  )

export const mockCoinMembersCount = (mint: string, count: number) =>
  http.get(`${apiEndpoint}/v1/coins/${mint}/members/count`, () =>
    HttpResponse.json({ data: count })
  )

/**
 * Collections
 */
export const mockCollectionById = (collection: typeof testCollection & any) =>
  http.get(`${apiEndpoint}/v1/full/playlists`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (id && id === collection.id.toString()) {
      return HttpResponse.json({ data: [collection] })
    }

    return HttpResponse.json({ data: [] })
  })

/**
 * Tracks
 */
export const mockTrackById = (track: typeof testTrack & any) =>
  http.get(`${apiEndpoint}/v1/full/tracks`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (id && id === track.id.toString()) {
      return HttpResponse.json({ data: [track] })
    }

    return HttpResponse.json({ data: [] })
  })

/**
 * Notifications
 */
export const mockUsers = (users: (typeof artistUser)[]) =>
  http.get(`${apiEndpoint}/v1/full/users`, () =>
    HttpResponse.json({ data: users })
  )

export const mockTracks = (tracks: (typeof testTrack)[]) =>
  http.get(`${apiEndpoint}/v1/full/tracks`, () =>
    HttpResponse.json({ data: tracks })
  )
