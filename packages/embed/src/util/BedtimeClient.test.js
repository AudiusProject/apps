const mockGetBulkPlaylists = jest.fn()
const mockGetPlaylist = jest.fn()
const mockGetBulkTracks = jest.fn()

jest.mock('@audius/sdk', () => ({
  sdk: () => ({
    playlists: {
      getBulkPlaylists: (...args) => mockGetBulkPlaylists(...args),
      getPlaylist: (...args) => mockGetPlaylist(...args)
    },
    tracks: {
      getBulkTracks: (...args) => mockGetBulkTracks(...args)
    },
    events: {}
  })
}))

// Avoid loading amplitude-js (and its browser globals) at import time.
jest.mock('../analytics/analytics', () => ({
  recordListen: jest.fn()
}))

const { getCollectionByPermalink } = require('./BedtimeClient')

describe('getCollectionByPermalink', () => {
  beforeEach(() => {
    mockGetBulkPlaylists.mockReset()
    mockGetPlaylist.mockReset()
  })

  it('re-fetches the full collection by id so the track list is hydrated', async () => {
    // The bulk/permalink endpoint resolves metadata but returns an empty
    // `tracks` array (this is what produced the header-only embed bug).
    mockGetBulkPlaylists.mockResolvedValue({
      data: [{ id: 'vjgoJWp', playlistName: 'Halleluyah', tracks: [] }]
    })
    // Fetching by (hash) id hydrates the full track list.
    mockGetPlaylist.mockResolvedValue({
      data: [
        {
          id: 'vjgoJWp',
          playlistName: 'Halleluyah',
          tracks: [{ id: 't1' }, { id: 't2' }]
        }
      ]
    })

    const collection = await getCollectionByPermalink(
      'AcidRayn',
      'halleluyah',
      'playlist'
    )

    expect(mockGetBulkPlaylists).toHaveBeenCalledWith({
      permalink: ['/AcidRayn/playlist/halleluyah']
    })
    // Must follow up with a by-id fetch using the resolved hash id.
    expect(mockGetPlaylist).toHaveBeenCalledWith({ playlistId: 'vjgoJWp' })
    expect(collection.tracks).toHaveLength(2)
  })

  it('builds the album permalink with the album path segment', async () => {
    mockGetBulkPlaylists.mockResolvedValue({
      data: [{ id: 'vjgoJWp', tracks: [] }]
    })
    mockGetPlaylist.mockResolvedValue({
      data: [{ id: 'vjgoJWp', tracks: [{ id: 't1' }] }]
    })

    await getCollectionByPermalink('AcidRayn', 'iterations', 'album')

    expect(mockGetBulkPlaylists).toHaveBeenCalledWith({
      permalink: ['/AcidRayn/album/iterations']
    })
  })

  it('returns null without a follow-up fetch when the permalink does not resolve', async () => {
    mockGetBulkPlaylists.mockResolvedValue({ data: [] })

    const collection = await getCollectionByPermalink(
      'nobody',
      'nope',
      'playlist'
    )

    expect(collection).toBeNull()
    expect(mockGetPlaylist).not.toHaveBeenCalled()
  })
})
