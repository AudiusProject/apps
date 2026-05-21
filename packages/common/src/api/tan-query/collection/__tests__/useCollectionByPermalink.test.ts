import { Id, OptionalId } from '@audius/sdk'
import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { userCollectionMetadataFromSDK } from '~/adapters/collection'

import { getCollectionByPermalinkQueryFn } from '../useCollectionByPermalink'

vi.mock('~/adapters/collection', () => ({
  userCollectionMetadataFromSDK: vi.fn((c) => c)
}))

const makeCollection = (playlist_id: number, permalink: string) =>
  ({
    playlist_id,
    permalink,
    playlist_contents: { track_ids: [] }
  }) as any

describe('getCollectionByPermalinkQueryFn', () => {
  let queryClient: QueryClient
  let sdk: { playlists: { getBulkPlaylists: ReturnType<typeof vi.fn> } }

  beforeEach(() => {
    queryClient = new QueryClient()
    sdk = { playlists: { getBulkPlaylists: vi.fn() } }
    vi.mocked(userCollectionMetadataFromSDK).mockImplementation((c) => c as any)
  })

  it('returns the playlist id when the permalink lookup succeeds', async () => {
    const permalink = '/dj/playlist/summer-mix-100'
    sdk.playlists.getBulkPlaylists.mockResolvedValueOnce({
      data: [makeCollection(100, permalink)]
    })

    const result = await getCollectionByPermalinkQueryFn(
      permalink,
      null,
      queryClient,
      sdk
    )

    expect(result).toBe(100)
    expect(sdk.playlists.getBulkPlaylists).toHaveBeenCalledTimes(1)
    expect(sdk.playlists.getBulkPlaylists).toHaveBeenCalledWith({
      permalink: [permalink],
      userId: OptionalId.parse(null)
    })
  })

  it('falls back to id lookup when permalink lookup is empty (hidden playlist, logged out)', async () => {
    const permalink = '/dj/playlist/hidden-mix-200'
    sdk.playlists.getBulkPlaylists
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [makeCollection(200, permalink)] })

    const result = await getCollectionByPermalinkQueryFn(
      permalink,
      null,
      queryClient,
      sdk
    )

    expect(result).toBe(200)
    expect(sdk.playlists.getBulkPlaylists).toHaveBeenCalledTimes(2)
    expect(sdk.playlists.getBulkPlaylists).toHaveBeenNthCalledWith(2, {
      id: [Id.parse(200)],
      userId: OptionalId.parse(null)
    })
  })

  it('rejects an id-fallback result whose permalink does not match (collision guard)', async () => {
    const requested = '/dj/playlist/looks-like-300'
    const collidingPermalink = '/other/playlist/different-300'
    sdk.playlists.getBulkPlaylists
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [makeCollection(300, collidingPermalink)]
      })

    const result = await getCollectionByPermalinkQueryFn(
      requested,
      null,
      queryClient,
      sdk
    )

    expect(result).toBeUndefined()
    expect(sdk.playlists.getBulkPlaylists).toHaveBeenCalledTimes(2)
  })

  it('returns undefined without a second call when the slug has no parseable id', async () => {
    const permalink = '/dj/playlist/no-trailing-id'
    sdk.playlists.getBulkPlaylists.mockResolvedValueOnce({ data: [] })

    const result = await getCollectionByPermalinkQueryFn(
      permalink,
      null,
      queryClient,
      sdk
    )

    expect(result).toBeUndefined()
    expect(sdk.playlists.getBulkPlaylists).toHaveBeenCalledTimes(1)
  })
})
