import '@testing-library/jest-dom/vitest'
import './vitest-canvas-mock'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

import { queryClient } from 'services/query-client'

// Mock console.error to filter out React prop warnings
const originalError = console.error
console.error = (...args) => {
  if (typeof args[0] === 'string') {
    if (
      args[0].includes('React does not recognize the `') &&
      args[0].includes('` prop on a DOM element')
    ) {
      return
    }
    if (args[0].includes('Error initializing fingerprint client')) {
      return
    }
  }
  originalError.call(console, ...args)
}

// Some global mocks that most tests will need.
// If you need to provide any form of mocked responses, you can replace them in your test with a hoisted implementation
// @ts-ignore
Element.prototype.scrollTo = vi.fn()
document.addEventListener = vi.fn()
document.removeEventListener = vi.fn()

class MockImage {
  onload: () => void = () => {}
  onerror: () => void = () => {}
  private _src: string = ''
  get src() {
    return this._src
  }

  set src(url: string) {
    this._src = url
    // simulate successful load
    setTimeout(() => {
      this.onload()
    }, 0)
  }
}

vi.stubGlobal('Image', MockImage)

vi.mock('@reown/appkit/react', () => {
  // See https://github.com/orgs/WalletConnect/discussions/5729#discussioncomment-12770662
  return {
    createAppKit: vi.fn().mockReturnValue({
      getUniversalProvider: vi.fn(),
      subscribeEvents: vi.fn().mockReturnValue(() => {}), // Return unsubscribe function
      getState: vi.fn().mockReturnValue({ selectedNetworkId: null }),
      switchNetwork: vi.fn()
    }),
    useAppKit: vi.fn().mockReturnValue({
      open: vi.fn()
    }),
    useAppKitState: vi.fn().mockReturnValue({
      open: false
    }),
    useAppKitAccount: vi.fn().mockReturnValue({
      address: null,
      isConnected: false
    }),
    useDisconnect: vi.fn().mockReturnValue({
      disconnect: vi.fn()
    })
  }
})

vi.mock('@reown/appkit/networks', () => {
  return {
    mainnet: { id: 1, name: 'Ethereum' },
    solana: { id: 1111111111111, name: 'Solana' },
    ethereum: { id: 1, name: 'Ethereum' },
    polygon: { id: 137, name: 'Polygon' }
  }
})

vi.mock('@reown/appkit', () => {
  return {}
})

vi.mock('@reown/appkit-common', () => {
  return {}
})

vi.mock('@reown/appkit-wallet-button/react', () => {
  return {
    useAppKitWallet: vi.fn().mockReturnValue({
      wallet: null
    })
  }
})

vi.mock('@reown/appkit-adapter-wagmi', () => {
  return {
    WagmiAdapter: vi.fn().mockImplementation(() => ({
      // Mock adapter object - just return an empty object
    }))
  }
})

vi.mock('@reown/appkit-adapter-solana/react', () => {
  return {
    SolanaAdapter: vi.fn().mockImplementation(() => ({
      // Mock adapter object - just return an empty object
    }))
  }
})

vi.mock('redux-first-history', async (importOriginal) => {
  const originalImport: any = await importOriginal()
  return { ...originalImport, connectRouter: vi.fn() }
})

vi.mock('redux-saga', () => {
  // Create a proper redux middleware function (store) => (next) => (action) => next(action)
  const createMockSagaMiddleware = (options?: any) => {
    const middleware = (store: any) => (next: any) => (action: any) => {
      return next(action)
    }

    // Add methods that saga middleware normally has
    ;(middleware as any).run = vi.fn()
    ;(middleware as any).setContext = vi.fn()
    ;(middleware as any).toPromise = vi.fn()

    return middleware
  }

  return {
    default: createMockSagaMiddleware,
    createSagaMiddleware: createMockSagaMiddleware
  }
})

window.matchMedia = vi.fn().mockReturnValue({
  matches: false,
  media: '',
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
})

afterEach(() => {
  cleanup()
  // Clear the query cache after each test
  queryClient.clear()
})
