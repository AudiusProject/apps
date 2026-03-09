/**
 * Ethereum contract utilities for Audius.
 *
 * Plain functions that call Audius Ethereum contracts via viem,
 * using ABIs + mainnet addresses from @audius/eth.
 * No classes, no schemas — just contract calls.
 */

import {
  AudiusToken,
  type AudiusTokenTypes,
  AudiusWormhole,
  type AudiusWormholeTypes,
  DelegateManager,
  Staking
} from '@audius/eth'
import {
  type Hex,
  type PublicClient,
  type TypedDataDefinition,
  type WalletClient,
  createPublicClient,
  createWalletClient,
  http,
  parseSignature
} from 'viem'
import { mainnet } from 'viem/chains'

// ---------- Types ----------

/** Minimal signer interface for Ethereum transactions. */
export type EthSigner = {
  getAddresses: () => Promise<Hex[]>
  signTypedData: (data: any) => Promise<Hex>
}

// ---------- Client factories ----------

/** Create a viem PublicClient for Ethereum mainnet. */
export const createEthPublicClient = (rpcUrl: string) =>
  createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl)
  })

/** Create a viem WalletClient for Ethereum mainnet. */
export const createEthWalletClient = (rpcUrl: string) =>
  createWalletClient({
    chain: mainnet,
    transport: http(rpcUrl)
  })

// ---------- Reads: AudiusToken ----------

/** Get AUDIO token balance for an Ethereum address. */
export const getAudioBalance = (client: PublicClient, account: Hex) =>
  client.readContract({
    address: AudiusToken.address,
    abi: AudiusToken.abi,
    functionName: 'balanceOf',
    args: [account]
  })

// ---------- Reads: Staking ----------

/** Get total staked AUDIO for an address. */
export const getTotalStakedFor = (client: PublicClient, account: Hex) =>
  client.readContract({
    address: Staking.address,
    abi: Staking.abi,
    functionName: 'totalStakedFor',
    args: [account]
  })

// ---------- Reads: DelegateManager ----------

/** Get total delegated stake for a delegator address. */
export const getTotalDelegatorStake = (client: PublicClient, delegator: Hex) =>
  client.readContract({
    address: DelegateManager.address,
    abi: DelegateManager.abi,
    functionName: 'getTotalDelegatorStake',
    args: [delegator]
  })

// ---------- Composite reads ----------

/** Get full AUDIO balance: token + staked + delegated. */
export const getFullAudioBalance = async (
  client: PublicClient,
  account: Hex
) => {
  const [balance, stakedBalance, delegatedBalance] = await Promise.all([
    getAudioBalance(client, account),
    getTotalStakedFor(client, account),
    getTotalDelegatorStake(client, account)
  ])
  return balance + stakedBalance + delegatedBalance
}

// ---------- Writes ----------

const ONE_HOUR_IN_MS = 1000 * 60 * 60
const ONE_HOUR_IN_S = 60 * 60

/** Wormhole chain ID for Solana (always 1 in the Wormhole protocol). */
const WORMHOLE_SOLANA_CHAIN_ID = 1

/**
 * EIP-2612 permit: approve a spender to transfer AUDIO tokens on behalf of
 * the owner using a signed message instead of an on-chain approve() tx.
 */
export async function permitAudioToken({
  ethPublicClient,
  ethWalletClient,
  signer,
  spender,
  value
}: {
  ethPublicClient: PublicClient
  ethWalletClient: WalletClient
  signer: EthSigner
  spender: Hex
  value: bigint
}): Promise<Hex> {
  const owner = (await signer.getAddresses())[0]
  if (!owner) {
    throw new Error('No wallet address available')
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60)

  const nonce = await ethPublicClient.readContract({
    address: AudiusToken.address,
    abi: AudiusToken.abi,
    functionName: 'nonces',
    args: [owner]
  })

  const name = await ethPublicClient.readContract({
    abi: AudiusToken.abi,
    address: AudiusToken.address,
    functionName: 'name'
  })

  const chainId = BigInt(await ethPublicClient.getChainId())

  const typedData: TypedDataDefinition<AudiusTokenTypes, 'Permit'> = {
    primaryType: 'Permit',
    domain: {
      name,
      version: '1',
      chainId,
      verifyingContract: AudiusToken.address
    },
    message: { owner, spender, value, nonce, deadline },
    types: AudiusToken.types
  }

  const signature = await signer.signTypedData(typedData)
  const { r, s, v } = parseSignature(signature)

  const { request } = await ethPublicClient.simulateContract({
    address: AudiusToken.address,
    abi: AudiusToken.abi,
    functionName: 'permit',
    args: [owner, spender, value, deadline, Number(v), r, s] as const,
    account: owner
  })
  return await ethWalletClient.writeContract(request)
}

/**
 * Transfer AUDIO tokens through the Wormhole bridge to Solana.
 */
export async function wormholeTransferTokens({
  ethPublicClient,
  ethWalletClient,
  signer,
  amount,
  recipient
}: {
  ethPublicClient: PublicClient
  ethWalletClient: WalletClient
  signer: EthSigner
  amount: bigint
  recipient: Hex
}): Promise<Hex> {
  const from = (await signer.getAddresses())[0]
  if (!from) {
    throw new Error('No wallet address available')
  }

  const deadline = BigInt(Math.round(Date.now() / 1000) + ONE_HOUR_IN_S)
  const arbiterFee = BigInt(0)

  const nonce = await ethPublicClient.readContract({
    address: AudiusWormhole.address,
    abi: AudiusWormhole.abi,
    functionName: 'nonces',
    args: [from]
  })

  const chainId = BigInt(await ethPublicClient.getChainId())

  const typedData: TypedDataDefinition<AudiusWormholeTypes, 'TransferTokens'> =
    {
      primaryType: 'TransferTokens',
      domain: {
        name: 'AudiusWormholeClient',
        version: '1',
        chainId,
        verifyingContract: AudiusWormhole.address
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

  const signature = await signer.signTypedData(typedData)
  const { r, s, v } = parseSignature(signature)

  const { request } = await ethPublicClient.simulateContract({
    address: AudiusWormhole.address,
    abi: AudiusWormhole.abi,
    functionName: 'transferTokens',
    args: [
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
    account: from
  })
  return await ethWalletClient.writeContract(request)
}
