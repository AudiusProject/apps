import { full, GetBulkTracksRequest, HashId, Id, OptionalId } from '@audius/sdk'
import { QueryClient } from '@tanstack/react-query'
import { omit } from 'lodash'
import { describe, it, expect, beforeEach, vi, MockInstance } from 'vitest'

import { userTrackMetadataFromSDK } from '~/adapters/track'

import { getTracksBatcher } from '../getTracksBatcher'
import type { BatchContext } from '../types'

describe('getTracksBatcher', () => {
  const createMockSdkTrack = (id: number): full.TrackFull => ({
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
      _1000x1000: '',
      mirrors: []
    },
    releaseDate: '',
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
        _2000x: '',
        mirrors: []
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
      donation: '',
      location: '',
      name: 'Test User',
      playlistCount: 0,
      profilePicture: {
        _150x150: '',
        _480x480: '',
        _1000x1000: '',
        mirrors: []
      },
      repostCount: 0,
      trackCount: 0,
      isDeactivated: false,
      isAvailable: true,
      ercWallet: '',
      splWallet: '',
      supporterCount: 0,
      supportingCount: 0,
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
      allowAiAttribution: false
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
    full: {
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

    expect(mockSdk.full.tracks.getBulkTracks).toHaveBeenCalledWith({
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

    // Make concurrent requests
    const results = await Promise.all(ids.map((id) => batcher.fetch(id)))

    // Verify single bulk request was made
    expect(mockSdk.full.tracks.getBulkTracks).toHaveBeenCalledTimes(1)
    expect(mockSdk.full.tracks.getBulkTracks).toHaveBeenCalledWith({
      id: ids.map((id) => Id.parse(id)),
      userId: OptionalId.parse(null)
    })

    // Verify each caller got their correct track data
    results.forEach((result, index) => {
      expect(result).toMatchObject(
        omit(userTrackMetadataFromSDK(createMockSdkTrack(ids[index])), 'user')
      )
    })
  })

  it('creates separate batches when requests are not concurrent', async () => {
    const batcher = getTracksBatcher(mockContext)

    // First batch of requests
    const firstBatchIds = [1, 2]
    const firstBatchResults = await Promise.all(
      firstBatchIds.map((id) => batcher.fetch(id))
    )

    // Wait longer than the batch window
    await new Promise((resolve) => setTimeout(resolve, 20))

    // Second batch of requests
    const secondBatchIds = [3, 4]
    const secondBatchResults = await Promise.all(
      secondBatchIds.map((id) => batcher.fetch(id))
    )

    // Verify two separate bulk requests were made
    expect(mockSdk.full.tracks.getBulkTracks).toHaveBeenCalledTimes(2)
    expect(mockSdk.full.tracks.getBulkTracks).toHaveBeenNthCalledWith(1, {
      id: firstBatchIds.map((id) => Id.parse(id)),
      userId: OptionalId.parse(null)
    })
    expect(mockSdk.full.tracks.getBulkTracks).toHaveBeenNthCalledWith(2, {
      id: secondBatchIds.map((id) => Id.parse(id)),
      userId: OptionalId.parse(null)
    })

    // Verify results for first batch
    firstBatchResults.forEach((result, index) => {
      expect(result).toMatchObject(
        omit(
          userTrackMetadataFromSDK(createMockSdkTrack(firstBatchIds[index])),
          'user'
        )
      )
    })

    // Verify results for second batch
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

    // Mock API to only return data for existingId
    const mockBulkTracks = mockSdk.full.tracks
      .getBulkTracks as unknown as MockInstance<
      [GetBulkTracksRequest],
      Promise<{ data: full.TrackFull[] }>
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

    // Verify existing track is returned correctly
    expect(existingResult).toMatchObject(
      omit(userTrackMetadataFromSDK(createMockSdkTrack(existingId)), 'user')
    )

    // Verify missing track returns null
    expect(missingResult).toBeNull()

    // Verify single batch request was made with both IDs
    expect(mockSdk.full.tracks.getBulkTracks).toHaveBeenCalledTimes(1)
    expect(mockSdk.full.tracks.getBulkTracks).toHaveBeenCalledWith({
      id: [missingId, existingId].map((id) => Id.parse(id)),
      userId: OptionalId.parse(null)
    })
  })
})
