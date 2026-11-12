import { generatePrivateKey } from 'viem/accounts'
import { describe, it, expect, vi } from 'vitest'

import { createAppWalletClient, Logger } from '../services'
import { HedgehogWalletNotFoundError } from '../services/AudiusWalletClient'

import { addRequestSignatureMiddleware } from './addRequestSignatureMiddleware'

describe('addRequestSignatureMiddleware', () => {
  it('generates a signature', async () => {
    const services = {
      audiusWalletClient: createAppWalletClient({
        apiKey: '',
        apiSecret:
          '0x4ac8b3eff248bfbf20b324b575c1b333d42c6db3dbe19fd587c3d1e11323a25a'
      }),
      logger: new Logger()
    }
    const m = addRequestSignatureMiddleware({ services })
    const ctx = await m.pre?.({
      fetch,
      url: 'example.com',
      init: {
        headers: {
          'x-something': 'value'
        }
      }
    })
    expect(ctx?.init.headers).toHaveProperty('Encoded-Data-Message')
    expect((ctx?.init.headers as any)['Encoded-Data-Message']).toContain(
      'signature'
    )
    expect(ctx?.init.headers).toHaveProperty('Encoded-Data-Signature')
  })

  it('reuses a signature', async () => {
    const services = {
      audiusWalletClient: createAppWalletClient({
        apiKey: '',
        apiSecret:
          '4ac8b3eff248bfbf20b324b575c1b333d42c6db3dbe19fd587c3d1e11323a25a'
      }),
      logger: new Logger()
    }
    const m = addRequestSignatureMiddleware({ services })
    const ctx = await m.pre?.({
      fetch,
      url: 'example.com',
      init: {
        headers: {
          'x-something': 'value'
        }
      }
    })
    const message = (ctx?.init.headers as any)['Encoded-Data-Message']
    const signature = (ctx?.init.headers as any)['Encoded-Data-Signature']

    const ctx2 = await m.pre?.({
      fetch,
      url: 'example2.com',
      init: {
        headers: {
          'x-something': 'value'
        }
      }
    })
    expect((ctx2?.init.headers as any)['Encoded-Data-Message']).toEqual(message)
    expect((ctx2?.init.headers as any)['Encoded-Data-Signature']).toEqual(
      signature
    )
  })

  it('handles HedgehogWalletNotFoundError gracefully without logging warning', async () => {
    const mockLogger = {
      warn: vi.fn()
    }

    const mockWalletClient = {
      getAddresses: vi
        .fn()
        .mockRejectedValue(new HedgehogWalletNotFoundError()),
      signMessage: vi.fn()
    }

    const services = {
      audiusWalletClient: mockWalletClient as any,
      logger: mockLogger as any
    }

    const m = addRequestSignatureMiddleware({ services })
    const ctx = await m.pre?.({
      fetch,
      url: 'example.com',
      init: {
        headers: {
          'x-something': 'value'
        }
      }
    })

    // Should not log a warning for HedgehogWalletNotFoundError
    expect(mockLogger.warn).not.toHaveBeenCalled()

    // Should return the original context without signature headers
    expect(ctx?.init.headers).not.toHaveProperty('Encoded-Data-Message')
    expect(ctx?.init.headers).not.toHaveProperty('Encoded-Data-Signature')
  })

  it('does not reuse a cached signature once the wallet is gone', async () => {
    const appWalletClient = createAppWalletClient({
      apiKey: '',
      apiSecret: generatePrivateKey()
    })
    const getAddresses = vi.fn(() => appWalletClient.getAddresses())
    const services = {
      audiusWalletClient: {
        ...appWalletClient,
        getAddresses,
        signMessage: appWalletClient.signMessage.bind(appWalletClient)
      } as any,
      logger: { warn: vi.fn() } as any
    }

    const m = addRequestSignatureMiddleware({ services })
    const request = () =>
      m.pre?.({
        fetch,
        url: 'example.com',
        init: { headers: { 'x-something': 'value' } }
      })

    const ctx = await request()
    expect(ctx?.init.headers).toHaveProperty('Encoded-Data-Signature')

    // Simulate logging out
    getAddresses.mockRejectedValue(new HedgehogWalletNotFoundError())
    const ctx2 = await request()
    expect(ctx2?.init.headers).not.toHaveProperty('Encoded-Data-Message')
    expect(ctx2?.init.headers).not.toHaveProperty('Encoded-Data-Signature')
  })

  it('logs warning for other errors', async () => {
    const mockLogger = {
      warn: vi.fn()
    }

    const mockWalletClient = {
      getAddresses: vi.fn().mockRejectedValue(new Error('Some other error')),
      signMessage: vi.fn()
    }

    const services = {
      audiusWalletClient: mockWalletClient as any,
      logger: mockLogger as any
    }

    const m = addRequestSignatureMiddleware({ services })
    const ctx = await m.pre?.({
      fetch,
      url: 'example.com',
      init: {
        headers: {
          'x-something': 'value'
        }
      }
    })

    // Should log a warning for other errors
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Unable to add request signature: Error: Some other error'
    )

    // Should return the original context without signature headers
    expect(ctx?.init.headers).not.toHaveProperty('Encoded-Data-Message')
    expect(ctx?.init.headers).not.toHaveProperty('Encoded-Data-Signature')
  })
})
