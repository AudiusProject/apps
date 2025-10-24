import type { RelayRequestBody } from '@audius/sdk'
import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js'
import bs58 from 'bs58'
import { Request, Response, NextFunction } from 'express'

import { config } from '../../config'
import { BadRequestError, UnauthorizedError } from '../../errors'
import { connections } from '../../utils/connections'
import {
  broadcastTransaction,
  sendTransactionWithRetries
} from '../../utils/transaction'
import { verifySignatures } from '../../utils/verifySignatures'

import { InvalidRelayInstructionError } from './InvalidRelayInstructionError'
import { assertRelayAllowedInstructions } from './assertRelayAllowedInstructions'
import { associateExternalWallet } from './associateExternalWallet'

/**
 * Gets the specified fee payer's key pair from the config.
 * @param feePayerPublicKey the fee payer to find
 * @returns the Keypair of the given fee payer or null if not found
 */
export const getFeePayerKeyPair = (feePayerPublicKey?: PublicKey) => {
  if (!feePayerPublicKey) {
    return null
  }
  return (
    config.solanaFeePayerWallets.find((kp) =>
      kp.publicKey.equals(feePayerPublicKey)
    ) ?? null
  )
}

/**
 * Gets the lookup table account datas for the addresses given.
 * @param lookupTableKeys the addresses of the lookup tables
 * @returns the lookup table account data for each address
 */
const getLookupTableAccounts = async (lookupTableKeys: PublicKey[]) => {
  return await Promise.all(
    lookupTableKeys.map(async (accountKey) => {
      const res = await connections[0].getAddressLookupTable(accountKey)
      if (res.value === null) {
        throw new Error(`Lookup table not found: ${accountKey.toBase58()}`)
      }
      return res.value
    })
  )
}

/**
 * The core Solana relay route, /solana/relay.
 *
 * This endpoint takes a transaction and some options in the POST body,
 * and signs the transaction (if necessary) and sends it (with retry logic).
 * If successful, it broadcasts the resulting transaction metadata to the
 * other discovery nodes to help them save on RPC calls when indexing.
 */
export const relay = async (
  req: Request<unknown, unknown, RelayRequestBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      transaction: encodedTransaction,
      confirmationOptions,
      sendOptions
    } = req.body
    const commitment = confirmationOptions?.commitment ?? 'processed'
    const connection = connections[0]
    const strategy =
      confirmationOptions?.strategy ?? (await connection.getLatestBlockhash())
    const decoded = Buffer.from(encodedTransaction, 'base64')
    const transaction = VersionedTransaction.deserialize(decoded)

    const lookupTableAccounts = await getLookupTableAccounts(
      transaction.message.addressTableLookups.map((k) => k.accountKey)
    )
    const decompiled = TransactionMessage.decompile(transaction.message, {
      addressLookupTableAccounts: lookupTableAccounts
    })

    const feePayerKey = decompiled.payerKey
    const feePayerKeyPair = getFeePayerKeyPair(feePayerKey)

    if (feePayerKeyPair) {
      res.locals.logger.info(
        `Signing with fee payer '${feePayerKey.toBase58()}'`
      )
      try {
        // Only care about what the instructions are if signing/paying
        await assertRelayAllowedInstructions(decompiled.instructions, {
          user: res.locals.signerUser,
          feePayer: feePayerKey.toBase58()
        })
      } catch (e) {
        if (e instanceof InvalidRelayInstructionError) {
          throw new BadRequestError('Invalid relay instructions', { cause: e })
        } else {
          throw e
        }
      }
      transaction.sign([feePayerKeyPair])
    } else if (verifySignatures(transaction)) {
      if (res.locals.signerUser?.user_id) {
        res.locals.logger.info('Associating external wallet...')
        await associateExternalWallet(
          transaction,
          res.locals.signerUser?.user_id
        )
      }
      res.locals.logger.info(
        `Transaction already signed by '${feePayerKey.toBase58()}'`
      )
    } else if (res.locals.signerUser) {
      throw new BadRequestError(
        `No fee payer for address '${feePayerKey?.toBase58()}' and signature missing or invalid`
      )
    } else {
      throw new UnauthorizedError()
    }
    const signature = bs58.encode(transaction.signatures[0])

    const logger = res.locals.logger.child({ signature })
    logger.info(
      { rpcEndpoints: connections.map((c) => c.rpcEndpoint) },
      'Sending transaction...'
    )
    const confirmationStrategy = { ...strategy, signature }
    await sendTransactionWithRetries({
      transaction,
      sendOptions,
      commitment,
      confirmationStrategy,
      logger
    })
    res.status(200).send({ signature })
    const responseTime = new Date().getTime() - res.locals.requestStartTime
    logger.info({ responseTime, statusCode: res.statusCode }, 'response sent')
    await broadcastTransaction({ logger, signature })
    next()
  } catch (e) {
    next(e)
  }
}
