import { rest } from 'msw'
import { setupServer } from 'msw/node'
import {
  expect,
  it,
  describe,
  beforeAll,
  afterAll,
  afterEach,
  vitest
} from 'vitest'

import { Logger } from '../Logger'

import { StorageNodeSelector } from './StorageNodeSelector'
import { HealthCheckResponseData } from './types'

const storageNodeA = {
  endpoint: 'https://node-a.audius.co',
  delegateOwnerWallet: '0xc0ffee254729296a45a3885639AC7E10F9d54971'
}
const storageNodeB = {
  endpoint: 'https://node-b.audius.co',
  delegateOwnerWallet: '0xc0ffee254729296a45a3885639AC7E10F9d54972'
}

const discoveryNode = 'https://discovery-provider.audius.co'

const logger = new Logger()

const mswHandlers = [
  rest.get(`${discoveryNode}/health_check`, (_req, res, ctx) => {
    const data: HealthCheckResponseData = {
      network: {
        content_nodes: [storageNodeA, storageNodeB]
      }
    }

    return res(
      ctx.status(200),
      ctx.json({
        data,
        comms: { healthy: true }
      })
    )
  }),

  rest.get(`${storageNodeA.endpoint}/health_check`, (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ data: { diskHasSpace: true } }))
  }),

  rest.get(`${storageNodeB.endpoint}/health_check`, (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ data: { diskHasSpace: true } }))
  })
]

const server = setupServer(...mswHandlers)

describe('StorageNodeSelector', () => {
  beforeAll(() => {
    server.listen()
    vitest.spyOn(console, 'warn').mockImplementation(() => {})
    vitest.spyOn(console, 'info').mockImplementation(() => {})
    vitest.spyOn(console, 'debug').mockImplementation(() => {})
    vitest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  it('selects the correct endpoint given bootstrap nodes and user wallet', async () => {
    const bootstrapNodes = [storageNodeA, storageNodeB]

    const storageNodeSelector = new StorageNodeSelector({
      bootstrapNodes,
      logger,
      endpoint: discoveryNode
    })

    const nodes = storageNodeSelector.getNodes('test')
    expect(nodes[0]!).toEqual(storageNodeA.endpoint)
  })

  it('selects the first healthy node', async () => {
    server.use(
      rest.get(`${storageNodeA.endpoint}/health_check`, (_req, res, ctx) => {
        return res(ctx.status(400))
      })
    )
    const bootstrapNodes = [storageNodeA, storageNodeB]

    const storageNodeSelector = new StorageNodeSelector({
      bootstrapNodes,
      logger,
      endpoint: discoveryNode
    })

    expect(await storageNodeSelector.getSelectedNode()).toEqual(
      storageNodeB.endpoint
    )
  })

  it('selects correct nodes when provided a cid', async () => {
    const bootstrapNodes = [storageNodeA, storageNodeB]
    const cid = 'QmNnuRwRWxrbWwE9ib9dvWVr4hLgcHGAJ8euys8WH5NgCX'

    const storageNodeSelector = new StorageNodeSelector({
      bootstrapNodes,
      logger,
      endpoint: discoveryNode
    })

    expect(await storageNodeSelector.getNodes(cid)).toEqual([
      storageNodeB.endpoint,
      storageNodeA.endpoint
    ])
  })

  it('tries selecting all nodes', async () => {
    server.use(
      rest.get(`${storageNodeA.endpoint}/health_check`, (_req, res, ctx) => {
        return res(ctx.status(400))
      })
    )
    server.use(
      rest.get(`${storageNodeB.endpoint}/health_check`, (_req, res, ctx) => {
        return res(ctx.status(400))
      })
    )
    const bootstrapNodes = [storageNodeA, storageNodeB]

    const storageNodeSelector = new StorageNodeSelector({
      bootstrapNodes,
      logger,
      endpoint: discoveryNode
    })

    expect(await storageNodeSelector.getSelectedNode()).toBe(null)
    expect(await storageNodeSelector.triedSelectingAllNodes()).toBe(true)
  })

  it('fetches the node list once, on first selection', async () => {
    let healthCheckCalls = 0
    const storageNodeC = {
      endpoint: 'https://node-c.audius.co',
      delegateOwnerWallet: '0xc0ffee254729296a45a3885639AC7E10F9d54973'
    }
    server.use(
      rest.get(`${discoveryNode}/health_check`, (_req, res, ctx) => {
        healthCheckCalls++
        const data: HealthCheckResponseData = {
          network: { content_nodes: [storageNodeC] }
        }
        return res(ctx.status(200), ctx.json({ data }))
      }),
      rest.get(`${storageNodeC.endpoint}/health_check`, (_req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ data: { diskHasSpace: true } }))
      })
    )

    const storageNodeSelector = new StorageNodeSelector({
      bootstrapNodes: [storageNodeA, storageNodeB],
      logger,
      endpoint: discoveryNode
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(healthCheckCalls).toBe(0)

    const [first, second] = await Promise.all([
      storageNodeSelector.getSelectedNode(),
      storageNodeSelector.getSelectedNode()
    ])
    expect(first).toEqual(storageNodeC.endpoint)
    expect(second).toEqual(storageNodeC.endpoint)
    expect(healthCheckCalls).toBe(1)
  })

  it('reorders with the refreshed node list after a failed fetch', async () => {
    let healthCheckCalls = 0
    const storageNodeC = {
      endpoint: 'https://node-c.audius.co',
      delegateOwnerWallet: '0xc0ffee254729296a45a3885639AC7E10F9d54973'
    }
    server.use(
      rest.get(`${discoveryNode}/health_check`, (_req, res, ctx) => {
        healthCheckCalls++
        if (healthCheckCalls === 1) {
          return res.networkError('Failed to connect')
        }
        const data: HealthCheckResponseData = {
          network: { content_nodes: [storageNodeC] }
        }
        return res(ctx.status(200), ctx.json({ data }))
      }),
      rest.get(`${storageNodeC.endpoint}/health_check`, (_req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ data: { diskHasSpace: true } }))
      })
    )

    const storageNodeSelector = new StorageNodeSelector({
      bootstrapNodes: [storageNodeA, storageNodeB],
      logger,
      endpoint: discoveryNode
    })

    // The first fetch fails, so selection falls back to the bootstrap nodes
    expect([storageNodeA.endpoint, storageNodeB.endpoint]).toContain(
      await storageNodeSelector.getSelectedNode()
    )

    expect(await storageNodeSelector.getSelectedNode(true)).toEqual(
      storageNodeC.endpoint
    )
    expect(healthCheckCalls).toBe(2)
  })
})
