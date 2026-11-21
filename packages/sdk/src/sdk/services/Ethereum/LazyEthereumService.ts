import type { PublicClient, WalletClient } from 'viem'

import { productionConfig } from '../../config/production'
import { createLazyLoader, type PublicInterface } from '../../utils/lazy'
import { mergeConfigWithDefaults } from '../../utils/mergeConfigs'

import type { EthereumService } from './ethereum'
import { getDefaultEthereumServiceConfig } from './getDefaultConfig'
import type {
  EthereumServiceConfig,
  EthereumServiceConfigInternal
} from './types'

type ContractName = keyof EthereumServiceConfigInternal['addresses']

const ASYNC_NAMESPACES = [
  'read',
  'write',
  'simulate',
  'estimateGas',
  'createEventFilter',
  'getEvents'
]

type AnyFn = (...args: any[]) => any

const isMethodName = (fn: string | symbol): fn is string =>
  typeof fn === 'string' && fn !== 'then'

/**
 * A stand-in for a viem contract instance that loads the real one on first
 * use. `address` is known up front; `read.*`, `write.*`, etc. return promises
 * so they can await the load; `watchEvent.*` returns its unwatch function
 * synchronously and starts watching once loaded. `abi` is only available
 * after the contract has loaded.
 */
export const createLazyContract = <C extends object>(
  address: string | undefined,
  load: () => Promise<C>,
  peek: () => C | undefined
): C => {
  const contract: Record<string, unknown> = {}

  for (const ns of ASYNC_NAMESPACES) {
    contract[ns] = new Proxy(
      {},
      {
        get: (_target, fn) =>
          isMethodName(fn)
            ? async (...args: unknown[]) =>
                ((await load()) as any)[ns][fn](...args)
            : undefined
      }
    )
  }

  contract.watchEvent = new Proxy(
    {},
    {
      get: (_target, fn) => {
        if (!isMethodName(fn)) return undefined
        return (...args: unknown[]) => {
          let stopped = false
          let unwatch: (() => void) | undefined
          load().then(
            (c) => {
              if (!stopped) {
                unwatch = ((c as any).watchEvent[fn] as AnyFn)(...args)
              }
            },
            (e) => {
              const options = args[args.length - 1] as
                | { onError?: (e: unknown) => void }
                | undefined
              options?.onError?.(e)
            }
          )
          return () => {
            stopped = true
            unwatch?.()
          }
        }
      }
    }
  )

  Object.defineProperty(contract, 'address', {
    enumerable: true,
    get: () => (peek() as { address?: string } | undefined)?.address ?? address
  })
  Object.defineProperty(contract, 'abi', {
    enumerable: false,
    get: () => {
      const loaded = peek()
      if (!loaded) {
        throw new Error(
          'Contract ABI is not loaded yet. Call any contract method first.'
        )
      }
      return (loaded as { abi: unknown }).abi
    }
  })

  return contract as C
}

/**
 * Same interface as EthereumService, but the contract ABIs from @audius/eth
 * are only loaded the first time a contract or helper is used.
 */
export class LazyEthereumService implements PublicInterface<EthereumService> {
  public readonly publicClient: PublicClient
  public readonly walletClient: WalletClient

  public readonly audiusToken: EthereumService['audiusToken']
  public readonly audiusWormhole: EthereumService['audiusWormhole']
  public readonly staking: EthereumService['staking']
  public readonly delegateManager: EthereumService['delegateManager']
  public readonly governance: EthereumService['governance']
  public readonly serviceProviderFactory: EthereumService['serviceProviderFactory']
  public readonly claimsManager: EthereumService['claimsManager']
  public readonly ethRewardsManager: EthereumService['ethRewardsManager']
  public readonly serviceTypeManager: EthereumService['serviceTypeManager']
  public readonly trustedNotifierManager: EthereumService['trustedNotifierManager']
  public readonly registry: EthereumService['registry']

  private readonly loader

  constructor(config: EthereumServiceConfig) {
    this.publicClient = config.publicClient
    this.walletClient = config.walletClient
    const loader = createLazyLoader(async () => {
      const { EthereumService } = await import('./ethereum')
      return new EthereumService(config)
    })
    this.loader = loader

    const addresses = mergeConfigWithDefaults(
      config,
      getDefaultEthereumServiceConfig(productionConfig)
    ).addresses
    const contract = <K extends ContractName>(name: K) =>
      createLazyContract<EthereumService[K]>(
        addresses[name],
        async () => (await loader.get())[name],
        () => loader.peek()?.[name]
      )

    this.audiusToken = contract('audiusToken')
    this.audiusWormhole = contract('audiusWormhole')
    this.staking = contract('staking')
    this.delegateManager = contract('delegateManager')
    this.governance = contract('governance')
    this.serviceProviderFactory = contract('serviceProviderFactory')
    this.claimsManager = contract('claimsManager')
    this.ethRewardsManager = contract('ethRewardsManager')
    this.serviceTypeManager = contract('serviceTypeManager')
    this.trustedNotifierManager = contract('trustedNotifierManager')
    this.registry = contract('registry')
  }

  async permitAudioToken(
    ...args: Parameters<EthereumService['permitAudioToken']>
  ) {
    return (await this.loader.get()).permitAudioToken(...args)
  }

  async wormholeTransferTokens(
    ...args: Parameters<EthereumService['wormholeTransferTokens']>
  ) {
    return (await this.loader.get()).wormholeTransferTokens(...args)
  }
}
