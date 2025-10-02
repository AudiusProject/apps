import { FetchNFTClient } from '@audius/fetch-nft'
import { sdk } from '@audius/sdk'

import { recordListen as recordAnalyticsListen } from '../analytics/analytics'

import { getHash } from './collectibleHelpers'
import { getIdentityEndpoint } from './getEnv'
import { encodeHashId, decodeHashId } from './hashIds'
import { logError } from './logError'

const IDENTITY_SERVICE_ENDPOINT = getIdentityEndpoint()

const env = process.env.VITE_ENVIRONMENT
const openSeaApiUrl = process.env.VITE_OPEN_SEA_API_URL
const heliusDasApiUrl = process.env.VITE_HELIUS_DAS_API_URL
const solanaRpcEndpoint = process.env.VITE_SOLANA_RPC_ENDPOINT
const appName = process.env.VITE_APP_NAME
const apiKey = process.env.VITE_API_KEY

export const RequestedEntity = Object.seal({
  TRACKS: 'tracks',
  COLLECTIONS: 'collections',
  COLLECTIBLES: 'collectibles'
})

const audiusSdk = sdk({
  appName,
  apiKey,
  environment: env
})

const apiEndpoint =
  env === 'production'
    ? 'https://api.audius.co'
    : env === 'staging'
      ? 'https://api.staging.audius.co'
      : 'http://audius-discovery-provider-1'

const fetchNFTClient = new FetchNFTClient({
  openSeaConfig: { apiEndpoint: openSeaApiUrl },
  heliusConfig: { apiEndpoint: heliusDasApiUrl },
  solanaConfig: { rpcEndpoint: solanaRpcEndpoint }
})

export const getTrackStreamEndpoint = (trackId, isPurchaseable) =>
  `${apiEndpoint}/v1/tracks/${trackId}/stream?app_name=${appName}&api_key=${apiKey}${isPurchaseable ? '&preview=true' : ''
  }`

export const getCollectiblesJson = async (hashId) => {
  const { data: collectibles } = await audiusSdk.users.getUserCollectibles({
    id: hashId
  })
  return collectibles.data
}

window.audiusSdk = audiusSdk

export const uuid = () => {
  // https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript/873856#873856
  const s = []
  const hexDigits = '0123456789abcdef'
  for (let i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
  }
  s[14] = '4' // bits 12-15 of the time_hi_and_version field to 0010
  s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1) // bits 6-7 of the clock_seq_hi_and_reserved to 01
  s[8] = s[13] = s[18] = s[23] = '-'

  const uuid = s.join('')
  return uuid
}

/** param trackId is the encoded track id (i.e. hash id) */
export const recordListen = async (trackId) => {
  const numericHashId = decodeHashId(trackId)
  const url = `${IDENTITY_SERVICE_ENDPOINT}/tracks/${numericHashId}/listen`
  const method = 'POST'
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }

  const body = JSON.stringify({
    userId: uuid()
  })

  try {
    await fetch(url, { method, headers, body })
    recordAnalyticsListen(numericHashId)
  } catch (e) {
    logError(`Got error storing playcount: [${e.message}]`)
  }
}

const getFormattedCollectionResponse = (collection) => {
  const item = collection?.[0]
  return item
}

export const getTrack = async (id) => {
  const res = await audiusSdk.full.tracks.getTrack({
    trackId: encodeHashId(id)
  })
  return res.data
}

export const getTrackWithHashId = async (hashId) => {
  const res = await audiusSdk.full.tracks.getTrack({ trackId: hashId })
  return res.data
}

export const getCollection = async (id) => {
  const res = await audiusSdk.full.playlists.getPlaylist({
    playlistId: encodeHashId(id)
  })
  return getFormattedCollectionResponse(res.data)
}

export const getCollectionWithHashId = async (hashId) => {
  const res = await audiusSdk.full.playlists.getPlaylist({ playlistId: hashId })
  return getFormattedCollectionResponse(res.data)
}

export const getCollectible = async (handle, collectibleId) => {
  const { user, ethCollectibles, solCollectibles } =
    await getCollectibles(handle)
  const collectibles = [
    ...Object.values(ethCollectibles).reduce(
      (acc, vals) => [...acc, ...vals],
      []
    ),
    ...Object.values(solCollectibles).reduce(
      (acc, vals) => [...acc, ...vals],
      []
    )
  ]

  const foundCol = collectibles.find((col) => getHash(col.id) === collectibleId)
  return {
    user,
    collectible: foundCol ?? null,
    type: 'detail'
  }
}

export const getCollectibles = async (handle) => {
  const user = await audiusSdk.full.users.getUserByHandle({ handle })
  const connectedWallets = await audiusSdk.users.getConnectedWallets({
    id: user.data[0].id
  })

  const userEthWallet = user.data[0].ercWallet
  const userSplWallet = user.data[0].splWallet
  const ethWallets = [userEthWallet, ...connectedWallets.data.ercWallets]
  const solWallets = [userSplWallet, ...connectedWallets.data.splWallets]
  const { ethCollectibles, solCollectibles } =
    await fetchNFTClient.getCollectibles({
      ethWallets,
      solWallets
    })
  return {
    ethCollectibles,
    solCollectibles,
    type: 'gallery',
    user: user.data[0]
  }
}

export const getEntityEvents = async (entityId, entityType) => {
  const res = await audiusSdk.events.getEntityEvents({
    entityId: [entityId],
    entityType
  })
  return res.data
}
