/**
 * Ethereum contract utilities for Audius.
 *
 * Exports EthereumService — a configured service that exposes viem contract
 * instances for all Audius Ethereum contracts, using ABIs + addresses from
 * @audius/eth with optional per-environment address overrides.
 *
 * Also re-exports all contract definitions from @audius/eth for discoverability,
 * and provides standalone client factories for advanced use cases.
 */

import {
  AudiusToken,
  type AudiusTokenTypes,
  AudiusWormhole,
  type AudiusWormholeTypes,
  ClaimsManager,
  DelegateManager,
  EthRewardsManager,
  Governance,
  ServiceProviderFactory,
  ServiceTypeManager,
  Staking,
  TrustedNotifierManager
} from '@audius/eth'
import {
  type Hex,
  type GetContractReturnType,
  type PublicClient,
  type TypedDataDefinition,
  type WalletClient,
  getContract,
  parseSignature
} from 'viem'

import { productionConfig } from '../../config/production'
import { mergeConfigWithDefaults } from '../../utils/mergeConfigs'
import type { AudiusWalletClient } from '../AudiusWalletClient'

import { getDefaultEthereumServiceConfig } from './getDefaultConfig'
import type { EthereumServiceConfig } from './types'

export * from '@audius/eth'
export type { EthereumServiceConfig }

const WORMHOLE_SOLANA_CHAIN_ID = 1
const ONE_HOUR_IN_S = 60 * 60

// ---------- EthereumService ----------

/**
 * Configured Ethereum service for Audius protocol contracts.
 *
 * Exposes viem contract instances (`.read.*`, `.simulate.*`) for each
 * Audius contract, plus composite helpers for permit and Wormhole bridge transfer.
 */
export class EthereumService {
  public readonly publicClient: PublicClient
  public readonly ethWalletClient: WalletClient
  private readonly audiusWalletClient: AudiusWalletClient
  public readonly audiusToken: GetContractReturnType<
    typeof AudiusToken.abi,
    { public: PublicClient; wallet: WalletClient }
  >

  public readonly audiusWormhole: GetContractReturnType<
    typeof AudiusWormhole.abi,
    { public: PublicClient; wallet: WalletClient }
  >

  public readonly staking: GetContractReturnType<
    typeof Staking.abi,
    { public: PublicClient; wallet: WalletClient }
  >

  public readonly delegateManager: GetContractReturnType<
    typeof DelegateManager.abi,
    { public: PublicClient; wallet: WalletClient }
  >

  public readonly governance: GetContractReturnType<
    typeof Governance.abi,
    { public: PublicClient; wallet: WalletClient }
  >

  public readonly serviceProviderFactory: GetContractReturnType<
    typeof ServiceProviderFactory.abi,
    { public: PublicClient; wallet: WalletClient }
  >

  public readonly claimsManager: GetContractReturnType<
    typeof ClaimsManager.abi,
    { public: PublicClient; wallet: WalletClient }
  >

  public readonly ethRewardsManager: GetContractReturnType<
    typeof EthRewardsManager.abi,
    { public: PublicClient; wallet: WalletClient }
  >

  public readonly serviceTypeManager: GetContractReturnType<
    typeof ServiceTypeManager.abi,
    { public: PublicClient; wallet: WalletClient }
  >

  public readonly trustedNotifierManager: GetContractReturnType<
    typeof TrustedNotifierManager.abi,
    { public: PublicClient; wallet: WalletClient }
  >

  constructor(config: EthereumServiceConfig) {
    const configWithDefaults = mergeConfigWithDefaults(
      config,
      getDefaultEthereumServiceConfig(productionConfig)
    )
    this.publicClient = config.publicClient
    this.ethWalletClient = config.ethWalletClient
    this.audiusWalletClient = config.audiusWalletClient

    const client = {
      public: this.publicClient,
      wallet: this.ethWalletClient
    }
    const a = configWithDefaults.addresses

    this.audiusToken = getContract({
      address: a.audiusToken ?? AudiusToken.address,
      abi: AudiusToken.abi,
      client
    })
    this.audiusWormhole = getContract({
      address: a.audiusWormhole ?? AudiusWormhole.address,
      abi: AudiusWormhole.abi,
      client
    })
    this.staking = getContract({
      address: a.staking ?? Staking.address,
      abi: Staking.abi,
      client
    })
    this.delegateManager = getContract({
      address: a.delegateManager ?? DelegateManager.address,
      abi: DelegateManager.abi,
      client
    })
    this.governance = getContract({
      address: a.governance ?? Governance.address,
      abi: Governance.abi,
      client
    })
    this.serviceProviderFactory = getContract({
      address: a.serviceProviderFactory ?? ServiceProviderFactory.address,
      abi: ServiceProviderFactory.abi,
      client
    })
    this.claimsManager = getContract({
      address: a.claimsManager ?? ClaimsManager.address,
      abi: ClaimsManager.abi,
      client
    })
    this.ethRewardsManager = getContract({
      address: a.ethRewardsManager ?? EthRewardsManager.address,
      abi: EthRewardsManager.abi,
      client
    })
    this.serviceTypeManager = getContract({
      address: a.serviceTypeManager ?? ServiceTypeManager.address,
      abi: ServiceTypeManager.abi,
      client
    })
    this.trustedNotifierManager = getContract({
      address: a.trustedNotifierManager ?? TrustedNotifierManager.address,
      abi: TrustedNotifierManager.abi,
      client
    })
  }

  /**
   * EIP-2612 permit: approve a spender to transfer AUDIO tokens on behalf of
   * the owner using a signed message instead of an on-chain approve() tx.
   */
  async permitAudioToken({
    spender,
    value
  }: {
    spender: Hex
    value: bigint
  }): Promise<Hex> {
    const owner = (await this.audiusWalletClient.getAddresses())[0]
    if (!owner) throw new Error('No wallet address available')

    const deadline = BigInt(Math.floor(Date.now() / 1000) + ONE_HOUR_IN_S)

    const [nonce, name, chainId] = await Promise.all([
      this.audiusToken.read.nonces([owner]),
      this.audiusToken.read.name(),
      this.publicClient.getChainId()
    ])

    const typedData: TypedDataDefinition<AudiusTokenTypes, 'Permit'> = {
      primaryType: 'Permit',
      domain: {
        name,
        version: '1',
        chainId: BigInt(chainId),
        verifyingContract: this.audiusToken.address
      },
      message: { owner, spender, value, nonce, deadline },
      types: AudiusToken.types
    }

    const signature = await this.audiusWalletClient.signTypedData(typedData)
    const { r, s, v } = parseSignature(signature)

    const { request } = await this.audiusToken.simulate.permit(
      [owner, spender, value, deadline, Number(v), r, s],
      { account: owner }
    )
    return this.ethWalletClient.writeContract(request)
  }

  /**
   * Transfer AUDIO tokens through the Wormhole bridge to Solana.
   */
  async wormholeTransferTokens({
    amount,
    recipient
  }: {
    amount: bigint
    recipient: Hex
  }): Promise<Hex> {
    const from = (await this.audiusWalletClient.getAddresses())[0]
    if (!from) throw new Error('No wallet address available')

    const deadline = BigInt(Math.round(Date.now() / 1000) + ONE_HOUR_IN_S)
    const arbiterFee = BigInt(0)

    const [nonce, chainId] = await Promise.all([
      this.audiusWormhole.read.nonces([from]),
      this.publicClient.getChainId()
    ])

    const typedData: TypedDataDefinition<
      AudiusWormholeTypes,
      'TransferTokens'
    > = {
      primaryType: 'TransferTokens',
      domain: {
        name: 'AudiusWormholeClient',
        version: '1',
        chainId: BigInt(chainId),
        verifyingContract: this.audiusWormhole.address
      },
      message: {
        from,
        amount,
        recipientChain: WORMHOLE_SOLANA_CHAIN_ID,
        recipient,
        artbiterFee: arbiterFee,
        deadline,
        nonce
      },
      types: AudiusWormhole.types
    }

    const signature = await this.audiusWalletClient.signTypedData(typedData)
    const { r, s, v } = parseSignature(signature)

    const { request } = await this.audiusWormhole.simulate.transferTokens(
      [
        from,
        amount,
        WORMHOLE_SOLANA_CHAIN_ID,
        recipient,
        arbiterFee,
        deadline,
        Number(v),
        r,
        s
      ],
      { account: from }
    )
    return this.ethWalletClient.writeContract(request)
  }
}
