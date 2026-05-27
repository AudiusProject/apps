import {
  errorResponseServerError,
  handleResponse,
  successResponse
} from '../../apiHelpers'
import { parameterizedAuthMiddleware } from '../../authMiddleware'
import express, { type RequestHandler } from 'express'

import {
  createWalletClient,
  http,
  type Hex,
  type TransactionRequest,
  type WalletRpcSchema,
  type EIP1193Parameters,
  hexToNumber,
  hexToBigInt,
  type RpcTransactionRequest,
  rpcTransactionType,
  type TransactionRequestLegacy,
  type TransactionRequestEIP1559,
  type TransactionRequestEIP2930,
  numberToHex,
  type TransactionRequestEIP4844,
  type TransactionRequestEIP7702
} from 'viem'
import { mainnet } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import config from '../../config'
import { generateETHWalletLockKey } from '../../relay/ethTxRelay'
import { Lock } from '../../redis'

import crypto from 'crypto'
import type Logger from 'bunyan'

type RelayerWallet = {
  publicKey: Hex
  privateKey: string
}

const ethRelayerWallets = config.get('ethRelayerWallets')

const ensureHex = (str: string): Hex =>
  str.startsWith('0x') ? (str as Hex) : `0x${str}`

const walletClient = createWalletClient({
  chain: mainnet,
  transport: http(config.get('ethProviderUrl'))
})

const getRandomRelayerWallet = (): RelayerWallet => {
  const i = Math.floor(Math.random() * ethRelayerWallets.length)
  return ethRelayerWallets[i]
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Since the format that Viem requests for `sendTransaction` and the format RPCs
 * expect for `eth_sendTransaction` differ, convert back from the latter to the
 * former. Viem uses `never` types for the non-allowed fields of the different
 * variants, so to do this the most type safely, handle each variant separately.
 */
const toTransactionRequest = (
  transaction: RpcTransactionRequest
): TransactionRequest => {
  const {
    accessList,
    gas,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
    maxFeePerBlobGas,
    blobVersionedHashes,
    blobs,
    kzg,
    sidecars,
    authorizationList,
    nonce,
    type: hexType,
    value,
    ...other
  } = transaction
  const type =
    typeof hexType !== 'undefined'
      ? (Object.keys(rpcTransactionType).find(
          (key) =>
            rpcTransactionType[key as keyof typeof rpcTransactionType] ===
            hexType
        ) as keyof typeof rpcTransactionType)
      : 'legacy'
  const base = {
    ...other,
    gas: gas ? hexToBigInt(gas) : undefined,
    nonce: nonce ? hexToNumber(nonce) : undefined
  }
  if (type === 'legacy') {
    return {
      ...base,
      gasPrice: gasPrice ? hexToBigInt(gasPrice) : undefined,
      type
    } satisfies TransactionRequestLegacy
  }
  if (type === 'eip2930') {
    return {
      ...base,
      accessList,
      gasPrice: gasPrice ? hexToBigInt(gasPrice) : undefined,
      type
    } satisfies TransactionRequestEIP2930
  }
  if (type === 'eip1559') {
    return {
      ...base,
      accessList,
      maxFeePerGas: maxFeePerGas ? hexToBigInt(maxFeePerGas) : undefined,
      maxPriorityFeePerGas: maxPriorityFeePerGas
        ? hexToBigInt(maxPriorityFeePerGas)
        : undefined,
      type
    } satisfies TransactionRequestEIP1559
  }
  if (type === 'eip4844') {
    return {
      ...base,
      to: base.to!,
      accessList,
      blobs: blobs!,
      blobVersionedHashes,
      kzg,
      sidecars,
      maxFeePerBlobGas: hexToBigInt(maxFeePerBlobGas!)
    } satisfies TransactionRequestEIP4844
  }
  if (type === 'eip7702') {
    return {
      ...base,
      authorizationList: authorizationList!.map((a) => ({
        contractAddress: a.address,
        r: a.r,
        s: a.s,
        chainId: hexToNumber(a.chainId),
        nonce: hexToNumber(a.nonce),
        ...(typeof a.yParity !== 'undefined'
          ? { yParity: hexToNumber(a.yParity as unknown as Hex) }
          : {}),
        ...(typeof a.v !== 'undefined' && typeof a.yParity === 'undefined'
          ? { v: hexToBigInt(a.v as unknown as Hex) }
          : {})
      }))
    } satisfies TransactionRequestEIP7702
  }
  return base
}

/**
 * Runs a function within the context of holding a lock. Ensures the lock is
 * released whether the function is successful or throws an exception.
 */
const withLock = async <T>(
  lockKey: string,
  fn: () => Promise<T>,
  logger?: Logger
): Promise<T> => {
  try {
    logger?.info({ lockKey }, 'Waiting for wallet lock...')
    while ((await Lock.setLock(lockKey)) !== true) {
      await delay(200)
    }
    logger?.info({ lockKey }, 'Acquired wallet lock.')
    return await fn()
  } finally {
    await Lock.clearLock(lockKey)
    logger?.info({ lockKey }, 'Released wallet lock.')
  }
}

const createRouter = () => {
  const router = express.Router()

  /**
   * Proxies requests to the RPC provider. Intercepts `eth_sendTransaction`
   * requests and signs them before sending them locally.
   */
  router.post(
    '/rpc',
    parameterizedAuthMiddleware({ shouldRespondBadRequest: true }),
    handleResponse(<
      RequestHandler<any, any, EIP1193Parameters<WalletRpcSchema>>
    >(async (req) => {
      const logger = req.logger.child({
        requestId: crypto
          .createHash('sha256')
          .update(JSON.stringify(req.body))
          .digest('hex')
      })
      try {
        const body = req.body
        const { method, params } = body
        logger.info({ method, params }, 'Received Ethereum RPC request...')

        if (body.method === 'eth_sendTransaction') {
          // Intercept eth_sendTransaction and send locally
          const relayer = getRandomRelayerWallet()
          const res = await withLock(
            generateETHWalletLockKey(relayer.publicKey),
            async () => {
              const account = privateKeyToAccount(ensureHex(relayer.privateKey))
              const transactionRequest = toTransactionRequest(body.params[0])
              logger.debug(transactionRequest, 'Sending transaction...')
              const hash = await walletClient.sendTransaction({
                account,
                ...transactionRequest
              })
              logger.debug({ hash }, 'Transaction sent.')
              return hash
            },
            logger
          )
          return successResponse({ result: res })
        } else {
          // Pass through everything else
          logger.debug('Proxying request to RPC...')
          const res = await walletClient.transport.request(req.body)
          return successResponse({ result: res })
        }
      } catch (e) {
        logger.error(e, 'Error handling Ethereum RPC request.')
        return errorResponseServerError({ error: e })
      }
    }))
  )
  return router
}

export const ethereumRouter = createRouter()
