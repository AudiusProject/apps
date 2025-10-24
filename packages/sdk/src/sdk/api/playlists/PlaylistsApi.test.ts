import fs from 'fs'
import path from 'path'

import { describe, it, beforeAll, expect, vitest } from 'vitest'

import { createAppWalletClient } from '../../services'
import { EntityManagerClient } from '../../services/EntityManager'
import { Logger } from '../../services/Logger'
import { Storage } from '../../services/Storage'
import { StorageNodeSelector } from '../../services/StorageNodeSelector'
import { Genre } from '../../types/Genre'
import { Mood } from '../../types/Mood'
import { Configuration } from '../generated/default'
import { PlaylistsApi as GeneratedPlaylistsApi } from '../generated/default/apis/PlaylistsApi'
import { TrackUploadHelper } from '../tracks/TrackUploadHelper'

import { PlaylistsApi } from './PlaylistsApi'

const wavFile = fs.readFileSync(
  path.resolve(__dirname, '../../test/wav-file.wav')
)
const pngFile = fs.readFileSync(
  path.resolve(__dirname, '../../test/png-file.png')
)

vitest.mock('../../services/EntityManager')
vitest.mock('../../services/StorageNodeSelector')
vitest.mock('../../services/Storage')
vitest.mock('../tracks/TrackUploadHelper')
vitest.mock('../tracks/TrackUploadHelper')
vitest.mock('../generated/default/apis/PlaylistsApi')

vitest.spyOn(Storage.prototype, 'uploadFile').mockImplementation(async () => {
  return {
    id: 'a',
    status: 'done',
    results: {
      '320': 'a'
    },
    orig_file_cid:
      'baeaaaiqsea7fukrfrjrugqts6jqfmqhcb5ruc5pjmdk3anj7amoht4d4gemvq',
    orig_filename: 'file.wav',
    probe: {
      format: {
        duration: '10'
      }
    },
    audio_analysis_error_count: 0,
    audio_analysis_results: {}
  }
})

vitest
  .spyOn(TrackUploadHelper.prototype, 'generateId' as any)
  .mockImplementation(async () => {
    return 1
  })

vitest
  .spyOn(
    TrackUploadHelper.prototype,
    'populateTrackMetadataWithUploadResponse' as any
  )
  .mockImplementation(async () => ({}))

vitest
  .spyOn(TrackUploadHelper.prototype, 'transformTrackUploadMetadata' as any)
  .mockImplementation(async () => ({}))

vitest
  .spyOn(EntityManagerClient.prototype, 'manageEntity')
  .mockImplementation(async () => {
    return {
      blockHash: 'a',
      blockNumber: 1
    } as any
  })

vitest
  .spyOn(GeneratedPlaylistsApi.prototype, 'getPlaylist')
  .mockImplementation(async () => {
    return {
      data: [
        {
          playlistName: 'test',
          playlistContents: [
            { trackId: 'yyNwXq7', timestamp: 1 },
            { trackId: 'yyNwXq7', timestamp: 1 }
          ]
        } as any
      ]
    }
  })

describe('PlaylistsApi', () => {
  // TODO: Move this setup out of describe
  let playlists: PlaylistsApi

  // eslint-disable-next-line mocha/no-setup-in-describe
  const audiusWalletClient = createAppWalletClient({ apiKey: '' })
  const logger = new Logger()
  const storageNodeSelector = new StorageNodeSelector({
    endpoint: 'https://discoveryprovider.audius.co',
    logger
  })

  beforeAll(() => {
    playlists = new PlaylistsApi(
      new Configuration(),
      new Storage({
        storageNodeSelector,
        logger: new Logger()
      }),
      new EntityManagerClient({
        audiusWalletClient,
        endpoint: 'https://discoveryprovider.audius.co'
      }),
      new Logger()
    )
    vitest.spyOn(console, 'warn').mockImplementation(() => {})
    vitest.spyOn(console, 'info').mockImplementation(() => {})
    vitest.spyOn(console, 'debug').mockImplementation(() => {})
    vitest.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('createPlaylist', () => {
    it('creates a playlist if valid metadata is provided', async () => {
      const result = await playlists.createPlaylist({
        userId: '7eP5n',
        coverArtFile: {
          buffer: pngFile,
          name: 'coverArt'
        },
        metadata: {
          playlistName: 'My Playlist'
        },
        trackIds: ['yyNwXq7']
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1,
        playlistId: '7eP5n'
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await playlists.createPlaylist({
          userId: '7eP5n',
          coverArtFile: {
            buffer: pngFile,
            name: 'coverArt'
          },
          metadata: {} as any,
          trackIds: ['yyNwXq7']
        })
      }).rejects.toThrow()
    })
  })

  describe('uploadPlaylist', () => {
    it('uploads a playlist if valid metadata is provided', async () => {
      const result = await playlists.uploadPlaylist({
        userId: '7eP5n',
        coverArtFile: {
          buffer: pngFile,
          name: 'coverArt'
        },
        metadata: {
          playlistName: 'My Playlist',
          genre: Genre.ACOUSTIC,
          mood: Mood.TENDER
        },
        trackMetadatas: [
          {
            title: 'BachGavotte'
          }
        ],
        trackFiles: [
          {
            buffer: wavFile,
            name: 'trackArt'
          }
        ]
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1,
        playlistId: '7eP5n'
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await playlists.uploadPlaylist({
          userId: '7eP5n',
          coverArtFile: {
            buffer: pngFile,
            name: 'coverArt'
          },
          metadata: {} as any,
          trackMetadatas: [
            {
              title: 'BachGavotte'
            }
          ],
          trackFiles: [
            {
              buffer: wavFile,
              name: 'trackArt'
            }
          ]
        })
      }).rejects.toThrow()
    })
  })

  describe('addTrackToPlaylist', () => {
    it('adds a track to a playlist if valid metadata is provided', async () => {
      const result = await playlists.addTrackToPlaylist({
        userId: '7eP5n',
        playlistId: 'x5pJ3Aj',
        trackId: 'yyNwXq7'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await playlists.addTrackToPlaylist({
          userId: '7eP5n',
          trackId: 'yyNwXq7'
        } as any)
      }).rejects.toThrow()
    })
  })

  describe('removeTrackFromPlaylist', () => {
    it('removes a track from a playlist if valid metadata is provided', async () => {
      const result = await playlists.removeTrackFromPlaylist({
        userId: '7eP5n',
        playlistId: 'x5pJ3Aj',
        trackIndex: 0
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await playlists.removeTrackFromPlaylist({
          userId: '7eP5n'
        } as any)
      }).rejects.toThrow()
    })
  })

  describe('publishPlaylist', () => {
    it('publishes a playlist if valid metadata is provided', async () => {
      const result = await playlists.publishPlaylist({
        userId: '7eP5n',
        playlistId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await playlists.publishPlaylist({
          userId: '7eP5n'
        } as any)
      }).rejects.toThrow()
    })
  })

  describe('updatePlaylist', () => {
    it('updates a playlist if valid metadata is provided', async () => {
      const result = await playlists.updatePlaylist({
        userId: '7eP5n',
        playlistId: 'x5pJ3Aj',
        coverArtFile: {
          buffer: pngFile,
          name: 'coverArt'
        },
        metadata: {
          playlistName: 'My Playlist edited',
          mood: Mood.TENDER,
          playlistContents: []
        }
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await playlists.updatePlaylist({
          userId: '7eP5n',
          playlistId: 'x5pJ3Aj',
          coverArtFile: {
            buffer: pngFile,
            name: 'coverArt'
          },
          metadata: {
            playlistName: 'My Playlist edited',
            playlistMood: Mood.TENDER,
            mod: Mood.TENDER
          } as any
        })
      }).rejects.toThrow()
    })
  })

  describe('deletePlaylist', () => {
    it('deletes a playlist if valid metadata is provided', async () => {
      const result = await playlists.deletePlaylist({
        userId: '7eP5n',
        playlistId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await playlists.deletePlaylist({
          userId: '7eP5n',
          playlistId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('favoritePlaylist', () => {
    it('favorites a playlist if valid metadata is provided', async () => {
      const result = await playlists.favoritePlaylist({
        userId: '7eP5n',
        playlistId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await playlists.favoritePlaylist({
          userId: '7eP5n',
          playlistId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('unfavoritePlaylist', () => {
    it('unfavorites a playlist if valid metadata is provided', async () => {
      const result = await playlists.unfavoritePlaylist({
        userId: '7eP5n',
        playlistId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await playlists.unfavoritePlaylist({
          userId: '7eP5n',
          playlistId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('repostPlaylist', () => {
    it('reposts a playlist if valid metadata is provided', async () => {
      const result = await playlists.repostPlaylist({
        userId: '7eP5n',
        playlistId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await playlists.repostPlaylist({
          userId: '7eP5n',
          playlistId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('unrepostPlaylist', () => {
    it('unreposts a playlist if valid metadata is provided', async () => {
      const result = await playlists.unrepostPlaylist({
        userId: '7eP5n',
        playlistId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await playlists.unrepostPlaylist({
          userId: '7eP5n',
          playlistId: 1 as any
        })
      }).rejects.toThrow()
    })
  })
})
