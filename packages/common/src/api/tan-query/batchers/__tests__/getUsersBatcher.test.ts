import { full, GetBulkUsersRequest, HashId, Id, OptionalId } from '@audius/sdk'
import { QueryClient } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi, MockInstance } from 'vitest'

import { userMetadataFromSDK } from '~/adapters/user'

import { getUsersBatcher } from '../getUsersBatcher'
import type { BatchContext } from '../types'

describe('getUsersBatcher', () => {
  const createMockSdkUser = (id: number): full.UserFull => ({
    id: Id.parse(id),
    handle: `test-user-${id}`,
    name: `Test User ${id}`,
    profilePicture: {},
    profilePictureSizes: undefined,
    coverPhoto: {},
    coverPhotoSizes: undefined,
    bio: undefined,
    location: undefined,
    isVerified: false,
    creatorNodeEndpoint: undefined,
    isDeactivated: false,
    handleLc: `test-user-${id}`,
    followeeCount: 0,
    followerCount: 0,
    playlistCount: 0,
    albumCount: 0,
    trackCount: 0,
    repostCount: 0,
    doesFollowCurrentUser: false,
    doesCurrentUserFollow: false,
    currentUserFolloweeFollowCount: 0,
    ercWallet: '',
    supporterCount: 0,
    supportingCount: 0,
    coverPhotoLegacy: undefined,
    profilePictureLegacy: undefined,
    coverPhotoCids: undefined,
    profilePictureCids: undefined,
    verifiedWithTwitter: false,
    verifiedWithInstagram: false,
    verifiedWithTiktok: false,
    isAvailable: true,
    twitterHandle: undefined,
    instagramHandle: undefined,
    tiktokHandle: undefined,
    website: undefined,
    createdAt: '',
    updatedAt: '',
    splWallet: '',
    totalAudioBalance: 0,
    wallet: '',
    balance: '0',
    associatedWalletsBalance: '0',
    totalBalance: '0',
    waudioBalance: '0',
    associatedSolWalletsBalance: '0',
    blocknumber: 0,
    isStorageV2: false,
    doesCurrentUserSubscribe: false,
    allowAiAttribution: false
  })

  const mockSdk = {
    full: {
      users: {
        getBulkUsers: vi
          .fn()
          .mockImplementation((params: GetBulkUsersRequest) => {
            const users = params.id?.map((userId) =>
              createMockSdkUser(HashId.parse(userId))
            )
            return Promise.resolve({ data: users })
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

  it('fetches a single user correctly', async () => {
    const batcher = getUsersBatcher(mockContext)
    const id = 1
    const result = await batcher.fetch(id)

    expect(mockSdk.full.users.getBulkUsers).toHaveBeenCalledWith({
      id: [Id.parse(id)],
      userId: OptionalId.parse(null)
    })
    expect(result).toMatchObject(
      userMetadataFromSDK(createMockSdkUser(id)) ?? {}
    )
  })

  it('batches multiple user requests and returns correct results to each caller', async () => {
    const batcher = getUsersBatcher(mockContext)
    const ids = [1, 2, 3]

    // Make concurrent requests
    const results = await Promise.all(ids.map((id) => batcher.fetch(id)))

    // Verify single bulk request was made
    expect(mockSdk.full.users.getBulkUsers).toHaveBeenCalledTimes(1)
    expect(mockSdk.full.users.getBulkUsers).toHaveBeenCalledWith({
      id: ids.map((id) => Id.parse(id)),
      userId: OptionalId.parse(null)
    })

    // Verify each caller got their correct user data
    results.forEach((result, index) => {
      expect(result).toMatchObject(
        userMetadataFromSDK(createMockSdkUser(ids[index])) ?? {}
      )
    })
  })

  it('creates separate batches when requests are not concurrent', async () => {
    const batcher = getUsersBatcher(mockContext)

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
    expect(mockSdk.full.users.getBulkUsers).toHaveBeenCalledTimes(2)
    expect(mockSdk.full.users.getBulkUsers).toHaveBeenNthCalledWith(1, {
      id: firstBatchIds.map((id) => Id.parse(id)),
      userId: OptionalId.parse(null)
    })
    expect(mockSdk.full.users.getBulkUsers).toHaveBeenNthCalledWith(2, {
      id: secondBatchIds.map((id) => Id.parse(id)),
      userId: OptionalId.parse(null)
    })

    // Verify results for first batch
    firstBatchResults.forEach((result, index) => {
      expect(result).toMatchObject(
        userMetadataFromSDK(createMockSdkUser(firstBatchIds[index])) ?? {}
      )
    })

    // Verify results for second batch
    secondBatchResults.forEach((result, index) => {
      expect(result).toMatchObject(
        userMetadataFromSDK(createMockSdkUser(secondBatchIds[index])) ?? {}
      )
    })
  })

  it('handles missing users in batch response', async () => {
    const existingId = 1
    const missingId = 999

    // Mock API to only return data for existingId
    const mockBulkUsers = mockSdk.full.users
      .getBulkUsers as unknown as MockInstance<
      [GetBulkUsersRequest],
      Promise<{ data: full.UserFull[] }>
    >
    mockBulkUsers.mockImplementationOnce((params: GetBulkUsersRequest) => {
      const users =
        params.id
          ?.filter((id) => HashId.parse(id) === existingId)
          .map((id) => createMockSdkUser(HashId.parse(id))) ?? []
      return Promise.resolve({ data: users })
    })

    const batcher = getUsersBatcher(mockContext)
    const [missingResult, existingResult] = await Promise.all([
      batcher.fetch(missingId),
      batcher.fetch(existingId)
    ])

    // Verify existing user is returned correctly
    expect(existingResult).toMatchObject(
      userMetadataFromSDK(createMockSdkUser(existingId)) ?? {}
    )

    // Verify missing user returns null
    expect(missingResult).toBeNull()

    // Verify single batch request was made with both IDs
    expect(mockSdk.full.users.getBulkUsers).toHaveBeenCalledTimes(1)
    expect(mockSdk.full.users.getBulkUsers).toHaveBeenCalledWith({
      id: [missingId, existingId].map((id) => Id.parse(id)),
      userId: OptionalId.parse(null)
    })
  })
})
