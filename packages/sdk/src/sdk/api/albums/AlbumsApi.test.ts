import fs from 'fs'
import path from 'path'

import { describe, it, expect, vitest, beforeAll } from 'vitest'

import { developmentConfig } from '../../config/development'
import { createAppWalletClient } from '../../services/AudiusWalletClient'
import { EntityManagerClient } from '../../services/EntityManager'
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
import { Mood } from '../../types/Mood'
import { Configuration } from '../generated/default'
import { PlaylistsApi as GeneratedPlaylistsApi } from '../generated/default/apis/PlaylistsApi'
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
vitest.mock('../tracks/TrackUploadHelper')
vitest.mock('../tracks/TrackUploadHelper')
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
    albums = new AlbumsApi(
      new Configuration(),
      new Storage({
        storageNodeSelector,
        logger: new Logger()
      }),
      new EntityManagerClient({
        audiusWalletClient,
        endpoint: 'https://discoveryprovider.audius.co'
      }),
      logger,
      new ClaimableTokensClient({
        ...getDefaultClaimableTokensConfig(developmentConfig),
        audiusWalletClient,
        solanaClient
      }),
      new PaymentRouterClient({
        ...getDefaultPaymentRouterClientConfig(developmentConfig),
        solanaClient
      }),
      new SolanaRelay(
        new Configuration({
          middleware: []
        })
      ),
      solanaClient
    )
    vitest.spyOn(console, 'warn').mockImplementation(() => {})
    vitest.spyOn(console, 'info').mockImplementation(() => {})
    vitest.spyOn(console, 'debug').mockImplementation(() => {})
    vitest.spyOn(console, 'error').mockImplementation(() => {})
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
          genre: Genre.ACOUSTIC,
          albumName: 'My Album',
          mood: Mood.TENDER
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
          genre: Genre.ACOUSTIC,
          albumName: 'My Album edited',
          mood: Mood.TENDER
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
            mod: Mood.TENDER
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
