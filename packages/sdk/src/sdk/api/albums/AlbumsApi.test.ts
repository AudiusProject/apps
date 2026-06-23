import fs from 'fs'
import path from 'path'

import { describe, it, expect, vitest, beforeAll } from 'vitest'

import { developmentConfig } from '../../config/development'
import { createAppWalletClient } from '../../services/AudiusWalletClient'
import {
  EntityManagerAction,
  EntityManagerClient,
  EntityType
} from '../../services/EntityManager'
import { Logger } from '../../services/Logger'
import { SolanaRelay } from '../../services/Solana/SolanaRelay'
import { SolanaRelayWalletAdapter } from '../../services/Solana/SolanaRelayWalletAdapter'
import {
  ClaimableTokensClient,
  getDefaultClaimableTokensConfig
} from '../../services/Solana/programs/ClaimableTokensClient'
import {
  PaymentRouterClient,
  getDefaultPaymentRouterClientConfig
} from '../../services/Solana/programs/PaymentRouterClient'
import { SolanaClient } from '../../services/Solana/programs/SolanaClient'
import { Storage } from '../../services/Storage'
import { StorageNodeSelector } from '../../services/StorageNodeSelector'
import { Genre } from '../../types/Genre'
import { Configuration, Mood } from '../generated/default'
import { PlaylistsApi as GeneratedPlaylistsApi } from '../generated/default/apis/PlaylistsApi'
import type { PlaylistResponse } from '../generated/default/models/PlaylistResponse'
import { TrackUploadHelper } from '../tracks/TrackUploadHelper'

import { AlbumsApi } from './AlbumsApi'

const wavFile = fs.readFileSync(
  path.resolve(__dirname, '../../test/wav-file.wav')
)
const pngFile = fs.readFileSync(
  path.resolve(__dirname, '../../test/png-file.png')
)

vitest.mock('../../services/EntityManager')
vitest.mock('../../services/StorageNodeSelector')
vitest.mock('../../services/Storage')
vitest.mock('../generated/default/apis/PlaylistsApi')

vitest.spyOn(Storage.prototype, 'uploadFile').mockImplementation(() => {
  return {
    start: async () => ({
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
    }),
    abort: () => {}
  }
})

vitest
  .spyOn(TrackUploadHelper.prototype, 'generateId')
  .mockImplementation(async () => {
    return 1
  })

const manageEntitySpy = vitest
  .spyOn(EntityManagerClient.prototype, 'manageEntity')
  .mockImplementation(async () => {
    return {
      blockHash: 'a',
      blockNumber: 1
    } as any
  })

const mockPlaylistResponse: PlaylistResponse = {
  latestChainBlock: 0,
  latestIndexedBlock: 0,
  latestChainSlotPlays: 0,
  latestIndexedSlotPlays: 0,
  signature: '',
  timestamp: '',
  version: { service: 'api', version: '1.0' },
  data: []
}

vitest
  .spyOn(GeneratedPlaylistsApi.prototype, 'getPlaylist')
  .mockImplementation(async () => mockPlaylistResponse)

describe('AlbumsApi', () => {
  // TODO: Remove this setup in describe
  let albums: AlbumsApi
  // eslint-disable-next-line mocha/no-setup-in-describe
  const audiusWalletClient = createAppWalletClient({ apiKey: '' })
  const logger = new Logger()
  const storageNodeSelector = new StorageNodeSelector({
    endpoint: 'https://discoveryprovider.audius.co',
    logger
  })

  beforeAll(() => {
    const solanaWalletAdapter = new SolanaRelayWalletAdapter({
      solanaRelay: new SolanaRelay(
        new Configuration({
          middleware: []
        })
      )
    })
    const solanaClient = new SolanaClient({
      solanaWalletAdapter
    })
    albums = new AlbumsApi(new Configuration(), {
      storage: new Storage({
        storageNodeSelector,
        logger: new Logger()
      }),
      entityManager: new EntityManagerClient({
        audiusWalletClient,
        endpoint: 'https://discoveryprovider.audius.co'
      }),
      logger,
      claimableTokensClient: new ClaimableTokensClient({
        ...getDefaultClaimableTokensConfig(developmentConfig),
        audiusWalletClient,
        solanaClient
      }),
      paymentRouterClient: new PaymentRouterClient({
        ...getDefaultPaymentRouterClientConfig(developmentConfig),
        solanaClient
      }),
      solanaRelay: new SolanaRelay(
        new Configuration({
          middleware: []
        })
      ),
      solanaClient
    })
    vitest.spyOn(console, 'warn').mockImplementation(() => {})
    vitest.spyOn(console, 'info').mockImplementation(() => {})
    vitest.spyOn(console, 'debug').mockImplementation(() => {})
    vitest.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('createAlbum', () => {
    it('does not pass album id as a top-level playlist create param', async () => {
      const createPlaylistSpy = vitest
        .spyOn((albums as any).playlistsApi, 'createPlaylist')
        .mockResolvedValueOnce({ playlistId: 'x5pJ3Aj' } as any)

      try {
        await albums.createAlbum({
          userId: '7eP5n',
          albumId: 'x5pJ3Aj',
          metadata: {
            albumName: 'My Album'
          }
        })

        const playlistParams = createPlaylistSpy.mock.calls[0]![0]
        expect(playlistParams).not.toHaveProperty('albumId')
        expect(playlistParams).toMatchObject({
          userId: '7eP5n',
          metadata: {
            isAlbum: true,
            playlistContents: [],
            playlistId: 'x5pJ3Aj',
            playlistName: 'My Album'
          }
        })
      } finally {
        createPlaylistSpy.mockRestore()
      }
    })

    it('creates a blank album with a provided album id', async () => {
      manageEntitySpy.mockClear()

      const result = await albums.createAlbum({
        userId: '7eP5n',
        albumId: 'x5pJ3Aj',
        metadata: {
          albumName: 'My Album'
        }
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1,
        playlistId: 'x5pJ3Aj'
      })
      expect(manageEntitySpy).toHaveBeenCalledTimes(1)

      const manageEntityOptions = manageEntitySpy.mock.calls[0]![0]
      expect(manageEntityOptions.entityType).toBe(EntityType.PLAYLIST)
      expect(manageEntityOptions.action).toBe(EntityManagerAction.CREATE)

      const metadata = JSON.parse(manageEntityOptions.metadata!)
      expect(metadata.data).toMatchObject({
        is_album: true,
        playlist_contents: [],
        playlist_id: manageEntityOptions.entityId,
        playlist_name: 'My Album'
      })
      expect(metadata.data).not.toHaveProperty('album_id')
    })
  })

  describe('uploadAlbum', () => {
    it('uploads an album if valid metadata is provided', async () => {
      const result = await albums.uploadAlbum({
        userId: '7eP5n',
        imageFile: {
          buffer: pngFile,
          name: 'coverArt'
        },
        metadata: {
          genre: Genre.Acoustic,
          albumName: 'My Album',
          mood: Mood.Tender
        },
        trackMetadatas: [
          {
            title: 'BachGavotte'
          }
        ],
        audioFiles: [
          {
            buffer: wavFile,
            name: 'trackArt'
          }
        ]
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1,
        albumId: '7eP5n'
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await albums.uploadAlbum({
          userId: '7eP5n',
          imageFile: {
            buffer: pngFile,
            name: 'coverArt'
          },
          metadata: {} as any,
          trackMetadatas: [
            {
              title: 'BachGavotte'
            }
          ],
          audioFiles: [
            {
              buffer: wavFile,
              name: 'trackArt'
            }
          ]
        })
      }).rejects.toThrow()
    })
  })

  describe('updateAlbum', () => {
    it('updates an album if valid metadata is provided', async () => {
      const result = await albums.updateAlbum({
        userId: '7eP5n',
        albumId: 'x5pJ3Aj',
        imageFile: {
          buffer: pngFile,
          name: 'coverArt'
        },
        metadata: {
          genre: Genre.Acoustic,
          albumName: 'My Album edited',
          mood: Mood.Tender
        }
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await albums.updateAlbum({
          userId: '7eP5n',
          albumId: 'x5pJ3Aj',
          imageFile: {
            buffer: pngFile,
            name: 'coverArt'
          },
          metadata: {
            mod: Mood.Tender
          } as any
        })
      }).rejects.toThrow()
    })
  })

  describe('deleteAlbum', () => {
    it('deletes an album if valid metadata is provided', async () => {
      const result = await albums.deleteAlbum({
        userId: '7eP5n',
        albumId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await albums.deleteAlbum({
          userId: '7eP5n',
          albumId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('favoriteAlbum', () => {
    it('favorites an album if valid metadata is provided', async () => {
      const result = await albums.favoriteAlbum({
        userId: '7eP5n',
        albumId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await albums.favoriteAlbum({
          userId: '7eP5n',
          albumId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('unfavoriteAlbum', () => {
    it('unfavorites an album if valid metadata is provided', async () => {
      const result = await albums.unfavoriteAlbum({
        userId: '7eP5n',
        albumId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await albums.unfavoriteAlbum({
          userId: '7eP5n',
          albumId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('repostAlbum', () => {
    it('reposts an album if valid metadata is provided', async () => {
      const result = await albums.repostAlbum({
        userId: '7eP5n',
        albumId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await albums.repostAlbum({
          userId: '7eP5n',
          albumId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('unrepostAlbum', () => {
    it('unreposts an album if valid metadata is provided', async () => {
      const result = await albums.unrepostAlbum({
        userId: '7eP5n',
        albumId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await albums.unrepostAlbum({
          userId: '7eP5n',
          albumId: 1 as any
        })
      }).rejects.toThrow()
    })
  })
})
