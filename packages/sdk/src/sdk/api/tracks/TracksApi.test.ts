import fs from 'fs'
import path from 'path'

import { describe, it, beforeAll, expect, vitest } from 'vitest'

import { developmentConfig } from '../../config/development'
import {
  PaymentRouterClient,
  SolanaRelay,
  SolanaRelayWalletAdapter,
  createAppWalletClient,
  getDefaultPaymentRouterClientConfig
} from '../../services'
import { EntityManagerClient } from '../../services/EntityManager'
import { Logger } from '../../services/Logger'
import {
  ClaimableTokensClient,
  getDefaultClaimableTokensConfig
} from '../../services/Solana/programs/ClaimableTokensClient'
import { SolanaClient } from '../../services/Solana/programs/SolanaClient'
import { Storage } from '../../services/Storage'
import { StorageNodeSelector } from '../../services/StorageNodeSelector'
import { Genre } from '../../types/Genre'
import { Mood } from '../../types/Mood'
import { Configuration } from '../generated/default'

import { TrackUploadHelper } from './TrackUploadHelper'
import { TracksApi } from './TracksApi'

const wavFile = fs.readFileSync(
  path.resolve(__dirname, '../../test/wav-file.wav')
)
const pngFile = fs.readFileSync(
  path.resolve(__dirname, '../../test/png-file.png')
)

vitest.mock('../../services/EntityManager')
vitest.mock('../../services/StorageNodeSelector')
vitest.mock('../../services/Storage')
vitest.mock('./TrackUploadHelper')

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

describe('TracksApi', () => {
  // TODO: Move this out of describe
  let tracks: TracksApi

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
    tracks = new TracksApi(
      new Configuration(),
      new Storage({
        storageNodeSelector,
        logger: new Logger()
      }),
      new EntityManagerClient({
        audiusWalletClient,
        endpoint: 'https://discoveryprovider.audius.co'
      }),
      new Logger(),
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

  describe('uploadTrack', () => {
    it('uploads a track if valid metadata is provided', async () => {
      const result = await tracks.uploadTrack({
        userId: '7eP5n',
        coverArtFile: {
          buffer: pngFile,
          name: 'coverArt'
        },
        metadata: {
          title: 'BachGavotte',
          genre: Genre.ELECTRONIC,
          mood: Mood.TENDER
        },
        trackFile: {
          buffer: wavFile,
          name: 'trackArt'
        }
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1,
        trackId: '7eP5n'
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await tracks.uploadTrack({
          userId: '7eP5n',
          coverArtFile: {
            buffer: pngFile,
            name: 'coverArt'
          },
          metadata: {
            title: 'BachGavotte'
          } as any,
          trackFile: {
            buffer: wavFile,
            name: 'trackArt'
          }
        })
      }).rejects.toThrow()
    })
  })

  describe('updateTrack', () => {
    it('updates a track if valid metadata is provided', async () => {
      const result = await tracks.updateTrack({
        userId: '7eP5n',
        trackId: 'ogRRByg',
        coverArtFile: {
          buffer: pngFile,
          name: 'coverArt'
        },
        metadata: {
          title: 'BachGavotte',
          genre: Genre.ELECTRONIC,
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
        await tracks.updateTrack({
          userId: '7eP5n',
          trackId: 'ogRRByg',
          coverArtFile: {
            buffer: pngFile,
            name: 'coverArt'
          },
          metadata: {
            titl: 'BachGavotte'
          } as any
        })
      }).rejects.toThrow()
    })
  })

  describe('deleteTrack', () => {
    it('deletes a track if valid metadata is provided', async () => {
      const result = await tracks.deleteTrack({
        userId: '7eP5n',
        trackId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await tracks.deleteTrack({
          userId: '7eP5n',
          trackId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('favoriteTrack', () => {
    it('favorites a track if valid metadata is provided', async () => {
      const result = await tracks.favoriteTrack({
        userId: '7eP5n',
        trackId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await tracks.favoriteTrack({
          userId: '7eP5n',
          trackId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('unfavoriteTrack', () => {
    it('unfavorites a track if valid metadata is provided', async () => {
      const result = await tracks.unfavoriteTrack({
        userId: '7eP5n',
        trackId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await tracks.unfavoriteTrack({
          userId: '7eP5n',
          trackId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('repostTrack', () => {
    it('reposts a track if valid metadata is provided', async () => {
      const result = await tracks.repostTrack({
        userId: '7eP5n',
        trackId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await tracks.repostTrack({
          userId: '7eP5n',
          trackId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('unrepostTrack', () => {
    it('unreposts a track if valid metadata is provided', async () => {
      const result = await tracks.unrepostTrack({
        userId: '7eP5n',
        trackId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await tracks.unrepostTrack({
          userId: '7eP5n',
          trackId: 1 as any
        })
      }).rejects.toThrow()
    })
  })
})
