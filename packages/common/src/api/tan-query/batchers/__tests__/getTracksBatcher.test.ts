import {
  type Track,
  GetBulkTracksRequest,
  HashId,
  Id,
  OptionalId
} from '@audius/sdk'
import { QueryClient } from '@tanstack/react-query'
import { omit } from 'lodash'
import { describe, it, expect, beforeEach, vi, MockInstance } from 'vitest'

import { userTrackMetadataFromSDK } from '~/adapters/track'

import { getTracksBatcher } from '../getTracksBatcher'
import type { BatchContext } from '../types'

describe('getTracksBatcher', () => {
  const createMockSdkTrack = (id: number): Track => ({
    id: Id.parse(id),
    title: `Test Track ${id}`,
    userId: Id.parse(1),
    duration: 180,
    genre: 'Electronic',
    mood: 'Excited',
    tags: '',
    description: '',
    artwork: {
      _150x150: '',
      _480x480: '',
      _1000x1000: ''
    },
    releaseDate: new Date(),
    isrc: undefined,
    iswc: undefined,
    license: '',
    fieldVisibility: {
      mood: true,
      tags: true,
      genre: true,
      share: true,
      playCount: true,
      remixes: true
    },
    stemOf: {
      category: '',
      parentTrackId: 0
    },
    download: {
      url: '',
      mirrors: []
    },
    stream: {
      url: '',
      mirrors: []
    },
    preview: {
      url: '',
      mirrors: []
    },
    isUnlisted: false,
    isDelete: false,
    isAvailable: true,
    isStreamable: true,
    isDownloadable: false,
    isOriginalAvailable: true,
    isScheduledRelease: false,
    isDownloadGated: false,
    isOwnedByUser: false,
    followeeReposts: [],
    followeeFavorites: [],
    repostCount: 0,
    favoriteCount: 0,
    playCount: 0,
    permalink: '',
    routeId: '',
    blocknumber: 0,
    createdAt: '',
    updatedAt: '',
    coverArtSizes: '',
    remixOf: {
      tracks: []
    },
    hasCurrentUserReposted: false,
    hasCurrentUserSaved: false,
    trackSegments: [],
    access: {
      stream: true,
      download: true
    },
    user: {
      albumCount: 0,
      artistPickTrackId: undefined,
      bio: '',
      coverPhoto: {
        _640x: '',
        _2000x: ''
      },
      followeeCount: 0,
      followerCount: 0,
      handle: 'test',
      id: Id.parse(1),
      isVerified: false,
      twitterHandle: '',
      instagramHandle: '',
      tiktokHandle: '',
      verifiedWithTwitter: false,
      verifiedWithInstagram: false,
      verifiedWithTiktok: false,
      website: '',
      location: '',
      name: 'Test User',
      playlistCount: 0,
      profilePicture: {
        _150x150: '',
        _480x480: '',
        _1000x1000: ''
      },
      repostCount: 0,
      trackCount: 0,
      isDeactivated: false,
      isAvailable: true,
      ercWallet: '',
      splWallet: '',
      totalAudioBalance: 0,
      wallet: '',
      balance: '0',
      associatedWalletsBalance: '0',
      totalBalance: '0',
      waudioBalance: '0',
      associatedSolWalletsBalance: '0',
      blocknumber: 0,
      createdAt: '',
      isStorageV2: false,
      currentUserFolloweeFollowCount: 0,
      doesCurrentUserFollow: false,
      doesCurrentUserSubscribe: false,
      doesFollowCurrentUser: false,
      handleLc: 'test',
      updatedAt: '',
      coverPhotoSizes: '',
      coverPhotoCids: undefined,
      coverPhotoLegacy: undefined,
      profilePictureSizes: '',
      profilePictureCids: undefined,
      profilePictureLegacy: undefined,
      playlistLibrary: undefined,
      allowAiAttribution: false,
      artistCoinBadge: {},
      splUsdcWallet: '',
      supporterCount: 0,
      supportingCount: 0,
      hasCollectibles: false
    },
    origFileCid: undefined,
    origFilename: undefined,
    commentCount: 0,
    playlistsContainingTrack: [],
    pinnedCommentId: undefined,
    albumBacklink: undefined,
    createDate: undefined,
    coverArtCids: undefined,
    isStreamGated: false,
    streamConditions: undefined,
    downloadConditions: undefined
  })

  const mockSdk = {
    tracks: {
      getBulkTracks: vi
        .fn()
        .mockImplementation((params: GetBulkTracksRequest) => {
          const tracks = params.id?.map((trackId) =>
            createMockSdkTrack(HashId.parse(trackId))
          )
          return Promise.resolve({ data: tracks })
        })
    }
  } as unknown as BatchContext['sdk']

  const mockContext: BatchContext = {
    sdk: mockSdk,
    currentUserId: null,
    queryClient: new QueryClient(),
    dispatch: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches a single track correctly', async () => {
    const batcher = getTracksBatcher(mockContext)
    const id = 1
    const result = await batcher.fetch(id)

    expect(mockSdk.tracks.getBulkTracks).toHaveBeenCalledWith({
      id: [Id.parse(id)],
      userId: OptionalId.parse(null)
    })
    expect(result).toMatchObject(
      omit(userTrackMetadataFromSDK(createMockSdkTrack(id)), 'user')
    )
  })

  it('batches multiple track requests and returns correct results to each caller', async () => {
    const batcher = getTracksBatcher(mockContext)
    const ids = [1, 2, 3]

    const results = await Promise.all(ids.map((id) => batcher.fetch(id)))

    expect(mockSdk.tracks.getBulkTracks).toHaveBeenCalledTimes(1)
    expect(mockSdk.tracks.getBulkTracks).toHaveBeenCalledWith({
      id: ids.map((id) => Id.parse(id)),
      userId: OptionalId.parse(null)
    })

    results.forEach((result, index) => {
      expect(result).toMatchObject(
        omit(userTrackMetadataFromSDK(createMockSdkTrack(ids[index])), 'user')
      )
    })
  })

  it('creates separate batches when requests are not concurrent', async () => {
    const batcher = getTracksBatcher(mockContext)

    const firstBatchIds = [1, 2]
    const firstBatchResults = await Promise.all(
      firstBatchIds.map((id) => batcher.fetch(id))
    )

    await new Promise((resolve) => setTimeout(resolve, 20))

    const secondBatchIds = [3, 4]
    const secondBatchResults = await Promise.all(
      secondBatchIds.map((id) => batcher.fetch(id))
    )

    expect(mockSdk.tracks.getBulkTracks).toHaveBeenCalledTimes(2)
    expect(mockSdk.tracks.getBulkTracks).toHaveBeenNthCalledWith(1, {
      id: firstBatchIds.map((id) => Id.parse(id)),
      userId: OptionalId.parse(null)
    })
    expect(mockSdk.tracks.getBulkTracks).toHaveBeenNthCalledWith(2, {
      id: secondBatchIds.map((id) => Id.parse(id)),
      userId: OptionalId.parse(null)
    })

    firstBatchResults.forEach((result, index) => {
      expect(result).toMatchObject(
        omit(
          userTrackMetadataFromSDK(createMockSdkTrack(firstBatchIds[index])),
          'user'
        )
      )
    })

    secondBatchResults.forEach((result, index) => {
      expect(result).toMatchObject(
        omit(
          userTrackMetadataFromSDK(createMockSdkTrack(secondBatchIds[index])),
          'user'
        )
      )
    })
  })

  it('handles missing tracks in batch response', async () => {
    const existingId = 1
    const missingId = 999

    const mockBulkTracks = mockSdk.tracks
      .getBulkTracks as unknown as MockInstance<
      [GetBulkTracksRequest],
      Promise<{ data: Track[] }>
    >
    mockBulkTracks.mockImplementationOnce((params: GetBulkTracksRequest) => {
      const tracks =
        params.id
          ?.filter((id) => HashId.parse(id) === existingId)
          .map((id) => createMockSdkTrack(HashId.parse(id))) ?? []
      return Promise.resolve({ data: tracks })
    })

    const batcher = getTracksBatcher(mockContext)
    const [missingResult, existingResult] = await Promise.all([
      batcher.fetch(missingId),
      batcher.fetch(existingId)
    ])

    expect(existingResult).toMatchObject(
      omit(userTrackMetadataFromSDK(createMockSdkTrack(existingId)), 'user')
    )

    expect(missingResult).toBeNull()

    expect(mockSdk.tracks.getBulkTracks).toHaveBeenCalledTimes(1)
    expect(mockSdk.tracks.getBulkTracks).toHaveBeenCalledWith({
      id: [missingId, existingId].map((id) => Id.parse(id)),
      userId: OptionalId.parse(null)
    })
  })
})
