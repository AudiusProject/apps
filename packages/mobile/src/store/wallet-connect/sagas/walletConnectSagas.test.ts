import type { Action } from 'redux'
import { runSaga, stdChannel } from 'redux-saga'

import { connectNewWallet, signMessage } from '../slice'

import { watchConnectNewWallet } from './connectNewWalletSaga'
import { watchSignMessage } from './signMessageSaga'

const mockQueryCurrentUserId = jest.fn()

jest.mock('@audius/common/api', () => ({
  queryCurrentUserId: () => mockQueryCurrentUserId()
}))
jest.mock('@audius/common/models', () => ({
  Chain: { Eth: 'eth', Sol: 'sol' }
}))
jest.mock('@audius/common/utils', () => ({ waitForValue: jest.fn() }))
jest.mock('@audius/common/store', () => {
  const action = (type: string) => (payload?: unknown) => ({ type, payload })
  return {
    tokenDashboardPageActions: {
      connectNewWallet: action('tokenDashboard/connectNewWallet'),
      setIsConnectingWallet: action('tokenDashboard/setIsConnectingWallet'),
      updateWalletError: action('tokenDashboard/updateWalletError')
    },
    tokenDashboardPageSelectors: {
      getConfirmingWallet: (state: any) => state.confirmingWallet,
      getError: () => null
    }
  }
})
jest.mock(
  'common/store/pages/token-dashboard/checkIsNewWallet',
  () => ({ checkIsNewWallet: jest.fn() }),
  { virtual: true }
)
jest.mock(
  'common/store/pages/token-dashboard/getWalletInfo',
  () => ({ getWalletInfo: jest.fn() }),
  { virtual: true }
)
jest.mock(
  'common/store/pages/token-dashboard/addWalletToUser',
  () => ({ addWalletToUser: jest.fn() }),
  { virtual: true }
)
jest.mock('app/store/drawers/slice', () => ({
  setVisibility: (payload: unknown) => ({
    type: 'drawers/setVisibility',
    payload
  })
}))

const runWatcher = async (
  watcher: () => Generator,
  state: Record<string, unknown>,
  action: Action
) => {
  const channel = stdChannel()
  const dispatched: any[] = []
  const task = runSaga(
    {
      channel,
      dispatch: (a: Action) => {
        dispatched.push(a)
        channel.put(a)
      },
      getState: () => state
    },
    watcher
  )
  channel.put(action)
  await new Promise((resolve) => setTimeout(resolve, 0))
  task.cancel()
  return dispatched
}

const walletErrors = (dispatched: any[]) =>
  dispatched.filter((a) => a.type === 'tokenDashboard/updateWalletError')

const phantomConnect = connectNewWallet({
  connectionType: 'phantom',
  path: 'wallet-connect',
  phantom_encryption_public_key: 'bad',
  data: 'bad',
  nonce: 'bad'
})

const phantomSign = signMessage({
  connectionType: 'phantom',
  path: 'wallet-sign-message',
  data: 'bad',
  nonce: 'bad'
})

const emptyWalletConnect = { dappKeyPair: null, sharedSecret: null }

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
  mockQueryCurrentUserId.mockReturnValue(1)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('watchConnectNewWallet', () => {
  it('reports an error when there is no current user', async () => {
    mockQueryCurrentUserId.mockReturnValue(null)
    const dispatched = await runWatcher(
      watchConnectNewWallet,
      { walletConnect: emptyWalletConnect },
      phantomConnect
    )
    expect(walletErrors(dispatched)).toHaveLength(1)
  })

  it('reports an error when the dapp key pair is missing', async () => {
    const dispatched = await runWatcher(
      watchConnectNewWallet,
      { walletConnect: emptyWalletConnect },
      phantomConnect
    )
    const types = dispatched.map((a) => a.type)
    expect(types).toContain('tokenDashboard/connectNewWallet')
    expect(walletErrors(dispatched)).toHaveLength(1)
    expect(walletErrors(dispatched)[0].payload.errorMessage).toBeTruthy()
  })

  it('reports an error when the Phantom payload cannot be read', async () => {
    const nacl = jest.requireActual('tweetnacl')
    const { serializeKeyPair } = jest.requireActual('../utils')
    const dispatched = await runWatcher(
      watchConnectNewWallet,
      {
        walletConnect: {
          ...emptyWalletConnect,
          dappKeyPair: serializeKeyPair(nacl.box.keyPair())
        }
      },
      phantomConnect
    )
    expect(walletErrors(dispatched)).toHaveLength(1)
  })
})

describe('watchSignMessage', () => {
  it('reports an error when no wallet is being confirmed', async () => {
    const dispatched = await runWatcher(
      watchSignMessage,
      {
        walletConnect: emptyWalletConnect,
        confirmingWallet: { wallet: null, chain: null }
      },
      phantomSign
    )
    expect(walletErrors(dispatched)).toHaveLength(1)
  })

  it('reports an error when the shared secret is missing', async () => {
    const dispatched = await runWatcher(
      watchSignMessage,
      {
        walletConnect: emptyWalletConnect,
        confirmingWallet: { wallet: 'abc', chain: 'sol' }
      },
      phantomSign
    )
    expect(walletErrors(dispatched)).toHaveLength(1)
    expect(dispatched.map((a) => a.type)).not.toContain('drawers/setVisibility')
  })
})
