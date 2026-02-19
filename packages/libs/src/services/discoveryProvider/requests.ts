/* eslint-disable @typescript-eslint/restrict-plus-operands */

import type { Genre, Mood } from '@audius/sdk'
import type { ResponseType } from 'axios'

import type { Nullable } from '../../utils'

export const getUsers = (
  limit = 100,
  offset = 0,
  idsArray: Nullable<number[]>,
  walletAddress?: Nullable<string>,
  handle?: Nullable<string>,
  minBlockNumber?: Nullable<number>,
  includeIncomplete?: Nullable<boolean>
) => {
  type QueryParams = {
    limit: number
    offset: number
    handle?: string
    wallet?: string
    min_block_number?: number
    id?: string[]
    include_incomplete?: boolean
  }

  const queryParams: QueryParams = { limit, offset }
  if (handle) {
    queryParams.handle = handle
  }
  if (walletAddress) {
    queryParams.wallet = walletAddress
  }
  if (minBlockNumber) {
    queryParams.min_block_number = minBlockNumber
  }
  if (idsArray != null) {
    if (!Array.isArray(idsArray)) {
      throw new Error('Expected integer array of user ids')
    }
    queryParams.id = idsArray as unknown as string[]
  }
  if (includeIncomplete != null) {
    queryParams.include_incomplete = includeIncomplete
  }

  const req = { endpoint: 'users', queryParams }

  return req
}

export const getTracks = (
  limit = 100,
  offset = 0,
  idsArray: Nullable<string[]>,
  targetUserId: Nullable<string>,
  sort: Nullable<boolean>,
  minBlockNumber: Nullable<number>,
  filterDeleted: Nullable<boolean>,
  withUsers = false
) => {
  type QueryParams = {
    limit: number
    offset: number
    id?: string[]
    min_block_number?: number
    user_id?: string
    sort?: boolean
    filter_deleted?: boolean
    with_users?: boolean
  }

  const queryParams: QueryParams = { limit, offset }

  if (idsArray) {
    if (!Array.isArray(idsArray)) {
      throw new Error('Expected array of track ids')
    }
    queryParams.id = idsArray
  }
  if (minBlockNumber) {
    queryParams.min_block_number = minBlockNumber
  }
  if (targetUserId) {
    queryParams.user_id = targetUserId
  }
  if (sort) {
    queryParams.sort = sort
  }
  if (typeof filterDeleted === 'boolean') {
    queryParams.filter_deleted = filterDeleted
  }
  if (withUsers) {
    queryParams.with_users = true
  }

  const req = { endpoint: 'tracks', queryParams }
  return req
}

export const getTracksByHandleAndSlug = (handle: string, slug: string) => {
  return {
    endpoint: 'v1/tracks',
    method: 'get',
    queryParams: { handle, slug }
  }
}

export const getTracksIncludingUnlisted = (
  identifiers: string[],
  withUsers = false
) => {
  const queryParams: { with_users?: boolean } = {}

  if (withUsers) {
    queryParams.with_users = true
  }

  const req = {
    endpoint: 'tracks_including_unlisted',
    method: 'post',
    data: {
      tracks: identifiers
    },
    queryParams
  }

  return req
}

export const getRandomTracks = (
  genre: string,
  limit: number,
  exclusionList: number[],
  time: string
) => {
  const req = {
    endpoint: 'tracks/random',
    queryParams: {
      genre,
      limit,
      exclusionList,
      time
    }
  }
  return req
}

export const getStemsForTrack = (trackId: number) => {
  const req = {
    endpoint: `stems/${trackId}`,
    queryParams: {
      with_users: true
    }
  }
  return req
}

export const getRemixesOfTrack = (
  trackId: number,
  limit: number | null = null,
  offset: number | null = null
) => {
  const req = {
    endpoint: `remixes/${trackId}/children`,
    queryParams: {
      with_users: true,
      limit,
      offset
    }
  }
  return req
}

export const getRemixTrackParents = (
  trackId: number,
  limit: number | null = null,
  offset: number | null = null
) => {
  const req = {
    endpoint: `remixes/${trackId}/parents`,
    queryParams: {
      with_users: true,
      limit,
      offset
    }
  }
  return req
}

export const getTrendingTracks = (
  genre: string | null = null,
  timeFrame: string | null = null,
  idsArray: number[] | null = null,
  limit: number | null = null,
  offset: number | null = null,
  withUsers = false
) => {
  let endpoint = '/trending/'

  if (timeFrame != null) {
    switch (timeFrame) {
      case 'day':
      case 'week':
      case 'month':
      case 'year':
        break
      default:
        throw new Error('Invalid timeFrame value provided')
    }
    endpoint += `${endpoint}${timeFrame}`
  }

  const req = {
    endpoint,
    method: 'get',
    queryParams: {
      ...(idsArray !== null ? { id: idsArray } : {}),
      ...(limit !== null ? { limit } : {}),
      ...(offset !== null ? { offset } : {}),
      ...(genre !== null ? { genre } : {}),
      ...(withUsers ? { with_users: withUsers } : {})
    }
  }
  return req
}

export const getPlaylists = (
  limit = 100,
  offset = 0,
  idsArray: Nullable<number[]> = null,
  targetUserId: Nullable<number> = null,
  withUsers = false
) => {
  if (idsArray != null) {
    if (!Array.isArray(idsArray)) {
      throw new Error('Expected integer array of user ids')
    }
  }
  return {
    endpoint: 'playlists',
    queryParams: {
      limit,
      offset,
      ...(idsArray != null ? { playlist_id: idsArray } : {}),
      ...(targetUserId ? { user_id: targetUserId } : {}),
      ...(withUsers ? { with_users: true } : {})
    }
  }
}

export const getFullPlaylist = (
  encodedPlaylistId: string,
  encodedUserId: string
) => {
  return {
    endpoint: 'v1/playlists',
    urlParams: '/' + encodedPlaylistId,
    queryParams: {
      user_id: encodedUserId
    }
  }
}

export const getUserRepostFeed = (
  userId: number,
  limit = 100,
  offset = 0,
  withUsers = false
) => {
  return {
    endpoint: 'feed',
    urlParams: '/reposts/' + userId,
    queryParams: { limit, offset, with_users: withUsers }
  }
}

export const getFollowIntersectionUsers = (
  limit = 100,
  offset = 0,
  followeeUserId: number,
  followerUserId: number
) => {
  return {
    endpoint: 'users',
    urlParams: '/intersection/follow/' + followeeUserId + '/' + followerUserId,
    queryParams: { limit, offset }
  }
}

export const getTrackRepostIntersectionUsers = (
  limit = 100,
  offset = 0,
  repostTrackId: number,
  followerUserId: number
) => {
  return {
    endpoint: 'users',
    urlParams:
      '/intersection/repost/track/' + repostTrackId + '/' + followerUserId,
    queryParams: { limit, offset }
  }
}

export const getPlaylistRepostIntersectionUsers = (
  limit = 100,
  offset = 0,
  repostPlaylistId: number,
  followerUserId: number
) => {
  return {
    endpoint: 'users',
    urlParams:
      '/intersection/repost/playlist/' +
      repostPlaylistId +
      '/' +
      followerUserId,
    queryParams: { limit, offset }
  }
}

export const getFollowersForUser = (
  limit = 100,
  offset = 0,
  followeeUserId: string
) => {
  return {
    endpoint: 'users',
    urlParams: '/followers/' + followeeUserId,
    queryParams: { limit, offset }
  }
}

export const getFolloweesForUser = (
  limit = 100,
  offset = 0,
  followerUserId: string
) => {
  return {
    endpoint: 'users',
    urlParams: '/followees/' + followerUserId,
    queryParams: { limit, offset }
  }
}

export const getRepostersForTrack = (
  limit = 100,
  offset = 0,
  repostTrackId: number
) => {
  return {
    endpoint: 'users',
    urlParams: '/reposts/track/' + repostTrackId,
    queryParams: { limit, offset }
  }
}

export const getRepostersForPlaylist = (
  limit = 100,
  offset = 0,
  repostPlaylistId: number
) => {
  return {
    endpoint: 'users',
    urlParams: '/reposts/playlist/' + repostPlaylistId,
    queryParams: { limit, offset }
  }
}

export const getSaversForTrack = (
  limit = 100,
  offset = 0,
  saveTrackId: number
) => {
  return {
    endpoint: 'users',
    urlParams: '/saves/track/' + saveTrackId,
    queryParams: { limit, offset }
  }
}

export const getSaversForPlaylist = (
  limit = 100,
  offset = 0,
  savePlaylistId: number
) => {
  return {
    endpoint: 'users',
    urlParams: '/saves/playlist/' + savePlaylistId,
    queryParams: { limit, offset }
  }
}

export const searchFull = (
  text: string,
  kind: string,
  limit = 100,
  offset = 0
) => {
  return {
    endpoint: 'search/full',
    queryParams: { query: text, kind, limit, offset }
  }
}

export const searchAutocomplete = (text: string, limit = 100, offset = 0) => {
  return {
    endpoint: 'search/autocomplete',
    queryParams: { query: text, limit, offset }
  }
}

export const searchTags = (
  text: string,
  userTagCount = 2,
  kind = 'all',
  limit = 100,
  offset = 0,
  genre?: Genre,
  mood?: Mood,
  bpmMin?: string,
  bpmMax?: string,
  key?: string,
  isVerified?: boolean,
  hasDownloads?: boolean,
  isPurchasable?: boolean,
  sortMethod?: 'recent' | 'relevant' | 'popular'
) => {
  return {
    endpoint: 'search/tags',
    queryParams: {
      query: text,
      user_tag_count: userTagCount,
      kind,
      limit,
      offset,
      genre,
      mood,
      bpm_min: bpmMin,
      bpm_max: bpmMax,
      key,
      is_verified: isVerified,
      has_downloads: hasDownloads,
      is_purchasable: isPurchasable,
      sort_method: sortMethod
    }
  }
}

export const getLibraryPlaylists = (
  limit = 100,
  offset = 0,
  withUsers = false
) => {
  return {
    endpoint: 'saves/playlists',
    queryParams: { limit, offset, with_users: withUsers }
  }
}

export const getLibraryAlbums = (
  limit = 100,
  offset = 0,
  withUsers = false
) => {
  return {
    endpoint: 'saves/albums',
    queryParams: { limit, offset, with_users: withUsers }
  }
}

export const getLibraryTracks = (
  limit = 100,
  offset = 0,
  withUsers = false
) => {
  return {
    endpoint: 'saves/tracks',
    queryParams: { limit, offset, with_users: withUsers }
  }
}

/**
 * Return user collections (saved & uploaded) along w/ users for those collections
 */
export const getUserAccount = (wallet: string) => {
  if (wallet === undefined) {
    throw new Error('Expected wallet to get user account')
  }
  return {
    endpoint: 'users/account',
    queryParams: { wallet }
  }
}

/**
 * @deprecated Migrate to using getTopFullPlaylists
 */
export const getTopPlaylists = (
  type: 'playlist' | 'album',
  limit: number,
  mood: string,
  filter: string,
  withUsers = false
) => {
  return {
    endpoint: `/top/${type}`,
    queryParams: {
      limit,
      mood,
      filter,
      with_users: withUsers
    }
  }
}

export type GetTopFullPlaylistsParams = {
  type: 'playlist' | 'album'
  limit?: number
  mood?: string
  filter?: string
  withUsers?: boolean
  encodedUserId?: string
}

export const getTopFullPlaylists = ({
  type,
  limit,
  mood,
  filter,
  encodedUserId,
  withUsers = false
}: GetTopFullPlaylistsParams) => {
  return {
    endpoint: `/v1/playlists/top`,
    queryParams: {
      type,
      limit,
      mood,
      filter,
      with_users: withUsers,
      user_id: encodedUserId
    }
  }
}

/**
 * @deprecated Migrate to using getBestNewReleases
 */
export const getTopFolloweeWindowed = (
  type: string,
  window: string,
  limit: string,
  withUsers = false
) => {
  return {
    endpoint: `/top_followee_windowed/${type}/${window}`,
    queryParams: {
      limit,
      with_users: withUsers
    }
  }
}

export const getBestNewReleases = (
  window: string,
  limit: string,
  encodedUserId: string,
  withUsers = false
) => {
  return {
    endpoint: `/v1/tracks/best_new_releases`,
    queryParams: {
      window,
      limit,
      user_id: encodedUserId,
      with_users: withUsers
    }
  }
}

export const getMostLovedTracks = (
  encodedUserId: string,
  limit: string,
  withUsers = false
) => {
  return {
    endpoint: `/v1/tracks/most_loved`,
    queryParams: {
      limit,
      user_id: encodedUserId,
      with_users: withUsers
    }
  }
}

export const getFeelingLuckyTracks = (
  encodedUserId: string,
  limit: string,
  withUsers = false
) => {
  return {
    endpoint: `/v1/tracks/feeling_lucky`,
    queryParams: {
      limit,
      user_id: encodedUserId,
      with_users: withUsers
    }
  }
}

export const getTopFolloweeSaves = (
  type: string,
  limit: string,
  withUsers = false
) => {
  return {
    endpoint: `/top_followee_saves/${type}`,
    queryParams: {
      limit,
      with_users: withUsers
    }
  }
}

export const getLatest = (type: string, limit = 1, offset = 0) => {
  return {
    endpoint: `/latest/${type}`,
    queryParams: { limit, offset }
  }
}

export const getTopCreatorsByGenres = (
  genres: string[],
  limit = 30,
  offset = 0,
  withUsers = false
) => {
  return {
    endpoint: 'users/genre/top',
    queryParams: { genre: genres, limit, offset, with_users: withUsers }
  }
}

export const getURSMContentNodes = (ownerWallet: string | null) => {
  return {
    endpoint: 'ursm_content_nodes',
    queryParams: {
      owner_wallet: ownerWallet
    }
  }
}

export const getNotifications = (
  minBlockNumber: string,
  trackIds: string[],
  timeout: number
) => {
  return {
    endpoint: 'notifications',
    queryParams: {
      min_block_number: minBlockNumber,
      track_id: trackIds
    },
    timeout
  }
}

export type GetUserNotificationsParams = {
  encodedUserId: string
  timestamp: number
  groupId?: string
  limit?: number
  validTypes?: string[]
}

export const getUserNotifications = ({
  encodedUserId,
  timestamp,
  groupId,
  limit,
  validTypes
}: GetUserNotificationsParams) => {
  return {
    endpoint: `v1/notifications/${encodedUserId}`,
    queryParams: {
      timestamp,
      group_id: groupId,
      limit,
      valid_types: validTypes
    }
  }
}

export const getUserSubscribers = (encodedUserId: string, timeout: number) => {
  return {
    endpoint: `v1/users/${encodedUserId}/subscribers`,
    method: 'get',
    timeout
  }
}

export const bulkGetUserSubscribers = (
  encodedUserIds: string,
  timeout: number
) => {
  return {
    endpoint: 'v1/users/subscribers',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      ids: encodedUserIds
    },
    timeout
  }
}

export const getCIDData = (
  cid: string,
  responseType: ResponseType = 'json',
  timeout: number
) => {
  return {
    endpoint: `v1/cid_data/${cid}`,
    method: 'get',
    responseType,
    timeout
  }
}

export const getSolanaNotifications = (
  minSlotNumber: number,
  timeout: number
) => {
  return {
    endpoint: 'solana_notifications',
    queryParams: {
      min_slot_number: minSlotNumber
    },
    timeout
  }
}

export const getTrackListenMilestones = (timeout: number) => {
  return {
    endpoint: 'track_listen_milestones',
    timeout
  }
}

export const getChallengeAttestation = (
  challengeId: string,
  encodedUserId: string,
  specifier: string,
  oracleAddress: string
) => {
  return {
    endpoint: `/v1/challenges/${challengeId}/attest`,
    queryParams: {
      user_id: encodedUserId,
      specifier,
      oracle: oracleAddress
    }
  }
}

export const getCreateSenderAttestation = (senderEthAddress: string) => {
  return {
    endpoint: '/v1/challenges/attest_sender',
    queryParams: {
      sender_eth_address: senderEthAddress
    }
  }
}

export const getUndisbursedChallenges = (
  limit: number | null,
  offset: number | null,
  completedBlockNumber: string | null,
  encodedUserId: number | null
) => {
  return {
    endpoint: '/v1/challenges/undisbursed',
    queryParams: {
      limit,
      offset,
      completed_blocknumber: completedBlockNumber,
      user_id: encodedUserId
    }
  }
}

export const verifyToken = (token: string) => {
  return {
    endpoint: '/v1/users/verify_token',
    queryParams: {
      token
    }
  }
}

export const getUserReplicaSet = (encodedUserId: string) => {
  return {
    endpoint: `/v1/users/${encodedUserId}/replica_set`,
    timeout: 5000
  }
}

export const getUnclaimedId = (
  type: 'users' | 'playlists' | 'tracks' | 'comments'
) => {
  return {
    endpoint: `/v1/${type}/unclaimed_id`,
    timeout: 5000,
    queryParams: {
      noCache: Math.floor(Math.random() * 1000).toString()
    }
  }
}

export const getUserListenCountsMonthly = (
  encodedUserId: string,
  startTime: string,
  endTime: string
) => {
  return {
    endpoint: `/v1/users/${encodedUserId}/listen_counts_monthly`,
    timeout: 10000,
    queryParams: {
      start_time: startTime,
      end_time: endTime
    }
  }
}
