import {
  Transaction,
  PublicKey,
  Connection,
  Keypair,
  TransactionInstruction,
  TransactionMessage,
  AddressLookupTableAccount,
  VersionedTransaction
} from '@solana/web3.js'
import bs58 from 'bs58'
import { sample } from 'lodash'

import type { Logger, Nullable } from '../../utils'
import type { IdentityService, RelayTransactionData } from '../identity'

import { SolanaUtils } from './SolanaUtils'

type HandleTransactionParams = {
  instructions: TransactionInstruction[]
  errorMapping?: Nullable<{ fromErrorCode: (errorCode: number) => string }>
  recentBlockhash?: Nullable<string>
  logger?: Logger
  skipPreflight?: Nullable<boolean>
  feePayerOverride?: Nullable<PublicKey>
  sendBlockhash?: boolean
  signatures?: Nullable<Array<{ publicKey: string; signature: Buffer }>>
  lookupTableAddresses?: string[]
  retry?: boolean
  useCoinflowRelay?: boolean
}

export class TransactionHandler {
  private connection: Connection
  private readonly useRelay: boolean
  private readonly identityService: IdentityService | null
  private readonly feePayerKeypairs: Keypair[] | null
  private readonly skipPreflight: boolean
  private readonly retryTimeoutMs: number
  private readonly pollingFrequencyMs: number
  private readonly sendingFrequencyMs: number
  private readonly fallbackConnections: Connection[] | null

  constructor({
    connection,
    useRelay,
    identityService = null,
    feePayerKeypairs = null,
    skipPreflight = true,
    retryTimeoutMs = 60000,
    pollingFrequencyMs = 2000,
    sendingFrequencyMs = 2000,
    fallbackConnections = null
  }: {
    connection: Connection
    useRelay: boolean
    identityService?: IdentityService | null
    feePayerKeypairs?: Keypair[] | null
    skipPreflight?: boolean
    retryTimeoutMs?: number
    pollingFrequencyMs?: number
    sendingFrequencyMs?: number
    fallbackConnections?: Connection[] | null
  }) {
    this.connection = connection
    this.useRelay = useRelay
    this.identityService = identityService
    this.feePayerKeypairs = feePayerKeypairs
    this.skipPreflight = skipPreflight
    this.retryTimeoutMs = retryTimeoutMs
    this.pollingFrequencyMs = pollingFrequencyMs
    this.sendingFrequencyMs = sendingFrequencyMs
    this.fallbackConnections = fallbackConnections
  }

  async handleTransaction({
    instructions,
    errorMapping = null,
    recentBlockhash = null,
    logger = console,
    skipPreflight = false,
    feePayerOverride = null,
    sendBlockhash = false,
    signatures = null,
    lookupTableAddresses = [],
    retry = true,
    useCoinflowRelay
  }: HandleTransactionParams) {
    let result: {
      res: string | null
      errorCode: string | number | null
      error: string | null
    } | null = null
    if (this.useRelay) {
      result = await this._relayTransaction(
        instructions,
        recentBlockhash,
        skipPreflight,
        feePayerOverride,
        sendBlockhash,
        signatures,
        lookupTableAddresses,
        retry,
        useCoinflowRelay
      )
    } else {
      result = await this._locallyConfirmTransaction(
        instructions,
        recentBlockhash,
        logger,
        feePayerOverride,
        signatures,
        lookupTableAddresses,
        retry
      )
    }
    if (result.error && result.errorCode !== null && errorMapping) {
      result.errorCode = errorMapping.fromErrorCode(result.errorCode as number)
    }
    return result
  }

  async _relayTransaction(
    instructions: TransactionInstruction[],
    recentBlockhash: string | null,
    skipPreflight: boolean | null,
    feePayerOverride: Nullable<PublicKey> = null,
    sendBlockhash: boolean,
    signatures: Array<{ publicKey: string; signature: Buffer }> | null,
    lookupTableAddresses: string[],
    retry: boolean,
    useCoinflowRelay?: boolean
  ) {
    const relayable = instructions.map(SolanaUtils.prepareInstructionForRelay)

    const transactionData: RelayTransactionData = {
      signatures,
      instructions: relayable,
      skipPreflight:
        skipPreflight === null ? this.skipPreflight : skipPreflight,
      feePayerOverride: feePayerOverride ? feePayerOverride.toString() : null,
      lookupTableAddresses,
      retry,
      useCoinflowRelay
    }

    if (sendBlockhash || Array.isArray(signatures)) {
      transactionData.recentBlockhash =
        recentBlockhash ??
        (await this.connection.getLatestBlockhash('confirmed')).blockhash
    }

    try {
      const response = await this.identityService?.solanaRelay(transactionData)
      return {
        res: response?.transactionSignature ?? null,
        error: null,
        errorCode: null
      }
    } catch (e) {
      let error = null
      if (typeof e === 'object' && e !== null) {
        error = (e as any).response?.data?.error || (e as Error).message
      }
      const errorCode = error ? this._parseSolanaErrorCode(error) : null
      return { res: null, error, errorCode }
    }
  }

  async _locallyConfirmTransaction(
    instructions: TransactionInstruction[],
    recentBlockhash: string | null,
    logger: Logger,
    feePayerOverride: Nullable<PublicKey | string> = null,
    signatures: Array<{ publicKey: string; signature: Buffer }> | null = null,
    lookupTableAddresses: string[],
    retry = true
  ) {
    const txStartTime = Date.now()
    const feePayerKeypairOverride = (() => {
      if (feePayerOverride && this.feePayerKeypairs) {
        const stringFeePayer = feePayerOverride.toString()
        return this.feePayerKeypairs.find(
          (keypair) => keypair.publicKey.toString() === stringFeePayer
        )
      }
      return null
    })()

    const feePayerAccount =
      feePayerKeypairOverride ?? this.feePayerKeypairs?.[0]
    const feePayerPubKey =
      feePayerAccount?.publicKey ??
      (feePayerOverride ? new PublicKey(feePayerOverride) : null)

    const alreadySigned = signatures?.some(
      (s) =>
        s.publicKey === feePayerOverride?.toString() &&
        !s.signature.every((b) => b === 0)
    )
    if (!feePayerPubKey || (!feePayerAccount && !alreadySigned)) {
      logger.error(
        'transactionHandler: Local feepayer keys missing for direct confirmation!'
      )
      return {
        res: null,
        error: 'Missing keys',
        errorCode: null
      }
    }

    recentBlockhash =
      recentBlockhash ??
      (await this.connection.getLatestBlockhash('confirmed')).blockhash
    let rawTransaction: Buffer | Uint8Array
    let txid: string

    if (lookupTableAddresses.length > 0) {
      const lookupTableAccounts: AddressLookupTableAccount[] = []
      for (const address of lookupTableAddresses) {
        if (address === undefined) continue
        const lookupTableAccount = await this.connection.getAddressLookupTable(
          new PublicKey(address)
        )
        if (lookupTableAccount.value !== null) {
          lookupTableAccounts.push(lookupTableAccount.value)
        } else {
          return {
            res: null,
            error: `Missing lookup table account for address ${address}`,
            errorCode: null
          }
        }
      }
      const message = new TransactionMessage({
        payerKey: feePayerPubKey,
        recentBlockhash,
        instructions
      }).compileToV0Message(lookupTableAccounts)
      const tx = new VersionedTransaction(message)
      if (feePayerAccount) {
        tx.sign([feePayerAccount])
      }
      if (Array.isArray(signatures)) {
        signatures.forEach(({ publicKey, signature }) => {
          tx.addSignature(new PublicKey(publicKey), signature)
        })
      }
      txid = bs58.encode(tx.signatures[0]!)
      rawTransaction = tx.serialize()
    } else {
      const tx = new Transaction()
      tx.recentBlockhash = recentBlockhash
      instructions.forEach((i) => tx.add(i))
      tx.feePayer = feePayerPubKey
      if (feePayerAccount) {
        tx.sign(feePayerAccount)
      }
      if (Array.isArray(signatures)) {
        signatures.forEach(({ publicKey, signature }) => {
          tx.addSignature(new PublicKey(publicKey), signature)
        })
      }
      txid = bs58.encode(tx.signatures[0]!.signature!)
      rawTransaction = tx.serialize()
    }

    const sendRawTransaction = async () => {
      return await this.connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        preflightCommitment: 'processed',
        maxRetries: 0
      })
    }

    const sendRawTransactionToConn = async (conn: Connection) => {
      return await conn.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        preflightCommitment: 'processed',
        maxRetries: 0
      })
    }

    try {
      await sendRawTransaction()
    } catch (e) {
      logger.warn(
        `transactionHandler: Initial send failed for txId ${txid}: ${e}`
      )
    }

    let done = false

    let sendCount = 0
    const startTime = Date.now()
    if (retry) {
      ;(async () => {
        const connections = this.fallbackConnections ?? []
        if (connections.length === 0) {
          connections.push(this.connection)
        }
        let elapsed = Date.now() - startTime
        // eslint-disable-next-line no-unmodified-loop-condition
        while (!done && elapsed < this.retryTimeoutMs) {
          const conn = connections[sendCount % connections.length]
          try {
            sendRawTransactionToConn(conn!)
          } catch (e) {
            logger.warn(
              `transactionHandler: error in send loop: ${e} for txId ${txid} to ${
                conn!.rpcEndpoint
              }`
            )
          }
          sendCount++
          await delay(this.sendingFrequencyMs)
          elapsed = Date.now() - startTime
        }
      })()
    }

    try {
      await this._awaitTransactionSignatureConfirmation(txid, logger)
      done = true
      logger.info(
        `transactionHandler: finished sending txid ${txid} with ${sendCount} retries in ${
          Date.now() - txStartTime
        } ms`
      )
      return {
        res: txid,
        error: null,
        errorCode: null
      }
    } catch (e) {
      const fallbackConnection =
        sample(
          this.fallbackConnections?.filter(
            (conn) => conn.rpcEndpoint !== this.connection.rpcEndpoint
          )
        ) ?? this.connection
      logger.warn(
        `transactionHandler: error in awaitTransactionSignature: ${JSON.stringify(
          e
        )}, ${txid}, with ${sendCount} retries to ${
          this.connection.rpcEndpoint
        } falling back to ${fallbackConnection.rpcEndpoint}`
      )
      this.connection = fallbackConnection
      done = true
      let errorCode = null
      let error = null
      if (e instanceof Error) {
        error = e.message
        errorCode = this._parseSolanaErrorCode(error)
      }
      return {
        res: null,
        error,
        errorCode
      }
    }
  }

  async _awaitTransactionSignatureConfirmation(txid: string, logger: Logger) {
    let done = false

    const result = await new Promise((resolve, reject) => {
      ;(async () => {
        setTimeout(() => {
          if (done) {
            return
          }
          done = true
          const message = `transactionHandler: Timed out in await, ${txid}`
          logger.warn(message)
          reject(new Error(message))
        }, this.retryTimeoutMs)

        try {
          this.connection.onSignature(
            txid,
            (result) => {
              if (done) return
              done = true
              if (result.err) {
                const err = JSON.stringify(result.err)
                logger.warn(
                  `transactionHandler: Error in onSignature ${txid}, ${err}`
                )
                reject(new Error(err))
              } else {
                resolve(txid)
              }
            },
            'processed'
          )
        } catch (e) {
          done = true
          logger.error(`transactionHandler: WS error in setup ${txid}, ${e}`)
        }

        while (!done) {
          ;(async () => {
            try {
              const signatureStatuses =
                await this.connection.getSignatureStatuses([txid])
              const result = signatureStatuses?.value[0]

              if (done || !result) return

              if (result.err) {
                const err = JSON.stringify(result.err)
                logger.error(
                  `transactionHandler: polling saw result error: ${err}, tx: ${txid}`
                )
                done = true
                reject(new Error(err))
                return
              }

              if (
                !(
                  (result.confirmations !== null &&
                    result.confirmations !== 0) ||
                  result.confirmationStatus === 'confirmed' ||
                  result.confirmationStatus === 'finalized'
                )
              ) {
                return
              }
              done = true
              resolve(txid)
            } catch (e) {
              if (!done) {
                logger.error(
                  `transactionHandler: REST polling connection error: ${e}, tx: ${txid}`
                )
              }
            }
          })()

          await delay(this.pollingFrequencyMs)
        }
      })()
    })
    done = true
    return result
  }

  _parseSolanaErrorCode(errorMessage: string) {
    if (!errorMessage) return null
    const matcher = /(?:custom program error: 0x)(.*)$/
    const res = errorMessage.match(matcher)
    if (res && res.length === 2)
      return res[1] ? parseInt(res[1], 16) || null : null
    const matcher2 = /(?:"Custom":)(\d+)/
    const res2 = errorMessage.match(matcher2)
    if (res2 && res2.length === 2)
      return res2[1] ? parseInt(res2[1], 10) || null : null
    return null
  }
}

async function delay(ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, ms))
}
