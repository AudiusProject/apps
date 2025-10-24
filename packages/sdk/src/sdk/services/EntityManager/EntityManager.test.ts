import { rest } from 'msw'
import { setupServer } from 'msw/node'
import type { Hex } from 'viem'
import {
  vitest,
  it,
  expect,
  describe,
  beforeAll,
  afterEach,
  afterAll
} from 'vitest'

import { developmentConfig } from '../../config/development'
import { createAppWalletClient } from '../AudiusWalletClient'

import { EntityManagerClient } from './EntityManagerClient'
import { getDefaultEntityManagerConfig } from './getDefaultConfig'
import { Action, EntityType } from './types'

const userWallet = '0xc0ffee254729296a45a3885639AC7E10F9d54979'

const api = 'https://api.audius.co'

const audiusWalletClient = createAppWalletClient({ apiKey: userWallet }).extend(
  () => ({
    signTypedData: async () =>
      '0xcfe7a6974bd1691c0a298e119318337c54bf58175f8a9a6aeeaf3b0346c6105265c83de64ab81da28266c4b5b4ff68d81d9e266f9163d7ebd5b2a52d46e275941c' as Hex
  })
)

const mswHandlers = [
  rest.post(`${api}/relay`, (_req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        receipt: {
          blockHash: '',
          blockNumber: 1
        }
      })
    )
  }),

  rest.get(`${api}/block_confirmation`, (req, res, ctx) => {
    const blockNumber = req.url.searchParams.get('blocknumber')

    const data = {
      0: {
        block_passed: false
      },
      1: {
        block_passed: true
      }
    }[Number(blockNumber)!]

    return res(
      ctx.status(200),
      ctx.json({
        data
      })
    )
  })
]

const server = setupServer(...mswHandlers)

const entityManager = new EntityManagerClient({
  ...getDefaultEntityManagerConfig(developmentConfig),
  audiusWalletClient,
  endpoint: api
})

describe('EntityManager', () => {
  beforeAll(() => {
    server.listen()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  describe('manageEntity', () => {
    it('calls relay and confirms the transaction', async () => {
      const confirmWriteSpy = vitest.spyOn(entityManager, 'confirmWrite')

      await entityManager.manageEntity({
        userId: 1,
        entityType: EntityType.TRACK,
        entityId: 1,
        action: Action.CREATE,
        metadata: JSON.stringify({})
      })

      expect(confirmWriteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          blockHash: '',
          blockNumber: 1
        })
      )
    })
  })

  describe('confirmWrite', () => {
    it('confirms a write', async () => {
      const result = await entityManager.confirmWrite({
        blockHash: '',
        blockNumber: 1
      })
      expect(result).toBe(true)
    })

    it("throws when a write can't be confirmed", async () => {
      await expect(async () => {
        await entityManager.confirmWrite({
          blockHash: '',
          blockNumber: 0,
          confirmationTimeout: 1000
        })
      }).rejects.toThrow()
    })
  })
})
