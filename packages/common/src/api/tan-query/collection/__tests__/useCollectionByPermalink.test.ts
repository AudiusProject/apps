import { Id, OptionalId } from '@audius/sdk'
import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { userCollectionMetadataFromSDK } from '~/adapters/collection'

import { getCollectionQueryKey } from '../useCollection'
import {
  getCollectionByPermalinkQueryFn,
  getCollectionByPermalinkQueryKey
} from '../useCollectionByPermalink'

vi.mock('~/adapters/collection', () => ({
  userCollectionMetadataFromSDK: vi.fn((collection) => collection)
}))

describe('getCollectionByPermalinkQueryFn', () => {
  const currentUserId = null
  let queryClient: QueryClient
  let sdk: {
    playlists: {
      getBulkPlaylists: ReturnType<typeof vi.fn>
    }
  }

  const createCollection = (playlistId: number, permalink: string) =>
    ({
      playlist_id: playlistId,
      permalink,
      playlist_contents: { track_ids: [] }
    }) as any

  beforeEach(() => {
    queryClient = new QueryClient()
    sdk = {
      playlists: {
        getBulkPlaylists: vi.fn()
      }
    }
    vi.mocked(userCollectionMetadataFromSDK).mockImplementation(
      (collection) => collection as any
    )
  })

  it('returns and primes a collection id from the permalink response', async () => {
    const permalink = '/artist/playlist/test-playlist-123'
    const collection = createCollection(123, permalink)
    sdk.playlists.getBulkPlaylists.mockResolvedValueOnce({
      data: [collection]
    })

    const result = await getCollectionByPermalinkQueryFn(
      permalink,
      currentUserId,
      queryClient,
      sdk
    )

    expect(result).toBe(123)
    expect(sdk.playlists.getBulkPlaylists).toHaveBeenCalledTimes(1)
    expect(sdk.playlists.getBulkPlaylists).toHaveBeenCalledWith({
      permalink: [permalink],
      userId: OptionalId.parse(currentUserId)
    })
    expect(queryClient.getQueryData(getCollectionQueryKey(123))).toMatchObject({
      playlist_id: 123
    })
    expect(
      queryClient.getQueryData(getCollectionByPermalinkQueryKey(permalink))
    ).toBe(123)
  })

  it('falls back to the id in the permalink when the route lookup is empty', async () => {
    const permalink = '/artist/album/hidden-album-456'
    const collection = createCollection(456, permalink)
    sdk.playlists.getBulkPlaylists
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [collection] })

    const result = await getCollectionByPermalinkQueryFn(
      permalink,
      currentUserId,
      queryClient,
      sdk
    )

    expect(result).toBe(456)
    expect(sdk.playlists.getBulkPlaylists).toHaveBeenNthCalledWith(1, {
      permalink: [permalink],
      userId: OptionalId.parse(currentUserId)
    })
    expect(sdk.playlists.getBulkPlaylists).toHaveBeenNthCalledWith(2, {
      id: [Id.parse(456)],
      userId: OptionalId.parse(currentUserId)
    })
    expect(queryClient.getQueryData(getCollectionQueryKey(456))).toMatchObject({
      playlist_id: 456
    })
  })

  it('ignores fallback id results that do not match the requested permalink', async () => {
    const permalink = '/artist/playlist/hidden-playlist-789'
    const collection = createCollection(
      789,
      '/another-artist/playlist/hidden-playlist-789'
    )
    sdk.playlists.getBulkPlaylists
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [collection] })

    const result = await getCollectionByPermalinkQueryFn(
      permalink,
      currentUserId,
      queryClient,
      sdk
    )

    expect(result).toBeUndefined()
    expect(queryClient.getQueryData(getCollectionQueryKey(789))).toBeUndefined()
  })
})
