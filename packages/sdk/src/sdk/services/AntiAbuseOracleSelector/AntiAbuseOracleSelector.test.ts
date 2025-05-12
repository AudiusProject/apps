import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'

import { AntiAbuseOracleSelector } from './AntiAbuseOracleSelector'

const HEALTHY_NODE = 'https://healthy-aao.audius.co'
const OFFLINE_NODE = 'https://offline-aao.audius.co'
const UNHEALTHY_NODE = 'https://unhealthy-aao.audius.co'
const UNREGISTERED_NODE = 'https://unregistered-aao.audius.co'
const registeredAddresses = ['0x11111111']

const handlers = [
  http.get(`${HEALTHY_NODE}/health_check`, () => {
    return HttpResponse.json({
      walletPubkey: registeredAddresses[0]
    })
  }),
  http.get(`${OFFLINE_NODE}/health_check`, () => {
    return HttpResponse.error()
  }),
  http.get(`${UNHEALTHY_NODE}/health_check`, () => {
    return new HttpResponse(null, { status: 500 })
  }),
  http.get(`${UNREGISTERED_NODE}/health_check`, () => {
    return HttpResponse.json({
      walletPubkey: '0x12345'
    })
  })
]
const server = setupServer(...handlers)

describe('AntiAbuseOracleSelector', () => {
  beforeAll(() => {
    server.listen()
  })

  afterEach(() => server.resetHandlers())

  afterAll(() => server.close())

  it('does not choose unhealthy nodes', async () => {
    const selector = new AntiAbuseOracleSelector({
      endpoints: [UNHEALTHY_NODE, HEALTHY_NODE],
      registeredAddresses
    })
    const selected = await selector.getSelectedService()
    expect(selected.endpoint).not.toBe(UNHEALTHY_NODE)
  })

  it('does not choose offline nodes', async () => {
    const selector = new AntiAbuseOracleSelector({
      endpoints: [OFFLINE_NODE, HEALTHY_NODE],
      registeredAddresses
    })
    const selected = await selector.getSelectedService()
    expect(selected.endpoint).not.toBe(UNHEALTHY_NODE)
  })

  it('does not choose unregistered nodes', async () => {
    const selector = new AntiAbuseOracleSelector({
      endpoints: [UNHEALTHY_NODE, HEALTHY_NODE],
      registeredAddresses
    })
    const selected = await selector.getSelectedService()
    expect(selected.endpoint).not.toBe(UNHEALTHY_NODE)
  })

  it('chooses a healthy node', async () => {
    const selector = new AntiAbuseOracleSelector({
      endpoints: [UNHEALTHY_NODE, UNREGISTERED_NODE, HEALTHY_NODE],
      registeredAddresses
    })
    const selected = await selector.getSelectedService()
    expect(selected.endpoint).toBe(HEALTHY_NODE)
  })

  it('throws if none available', async () => {
    const selector = new AntiAbuseOracleSelector({
      endpoints: [UNHEALTHY_NODE, UNREGISTERED_NODE, OFFLINE_NODE],
      registeredAddresses
    })
    await expect(async () => {
      await selector.getSelectedService()
    }).rejects.toThrow()
  })
})
