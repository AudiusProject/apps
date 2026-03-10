import { useEffect, useState } from 'react'

import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction
} from '@solana/web3.js'
import { useDispatch } from 'react-redux'

import { useWalletAddresses } from '~/api'
import { useQueryContext } from '~/api/tan-query/utils'
import { useAppContext } from '~/context'
import { Name } from '~/models/Analytics'
import { decorateCoinflowWithdrawalTransaction } from '~/services/audius-backend'
import {
  BuyUSDCError,
  PurchaseContentError,
  PurchaseErrorCode,
  purchaseContentActions
} from '~/store'

type CoinflowAdapter = {
  wallet: {
    publicKey: PublicKey
    sendTransaction: (
      transaction: Transaction | VersionedTransaction
    ) => Promise<string>
  }
  connection: Connection
}

/** An adapter for signing and sending Coinflow withdrawal transactions. It will decorate
 * the incoming transaction to route it through a user bank. The transcation will then be
 * signed with the current user's Solana root wallet and sent/confirmed via Relay.
 */
export const useCoinflowWithdrawalAdapter = () => {
  const {
    audiusBackend,
    analytics: { make, track }
  } = useAppContext()
  const [adapter, setAdapter] = useState<CoinflowAdapter | null>(null)
  const { data: walletAddresses } = useWalletAddresses()
  const { currentUser } = walletAddresses ?? {}
  const { audiusSdk, solanaWalletService } = useQueryContext()

  useEffect(() => {
    const initWallet = async () => {
      const wallet = await solanaWalletService.getKeypair()
      const sdk = await audiusSdk()
      const connection = sdk.services.solanaClient.connection

      if (!wallet) {
        console.error(
          'useCoinflowWithdrawalAdapter: Missing solana root wallet'
        )
        return
      }

      setAdapter({
        connection,
        wallet: {
          publicKey: wallet.publicKey,
          sendTransaction: async (
            transaction: Transaction | VersionedTransaction
          ) => {
            if (!currentUser) {
              throw new Error('Missing current user')
            }
            const finalTransaction =
              await decorateCoinflowWithdrawalTransaction(sdk, audiusBackend, {
                ethAddress: currentUser,
                transaction,
                wallet
              })
            finalTransaction.sign([wallet])
            try {
              const res =
                await sdk.services.claimableTokensClient.sendTransaction(
                  finalTransaction,
                  { skipPreflight: true }
                )
              track(
                make({
                  eventName: Name.WITHDRAW_USDC_COINFLOW_SEND_TRANSACTION,
                  signature: res
                })
              )
              return res
            } catch (error) {
              console.error('Relaying Coinflow transaction failed.', {
                error,
                finalTransaction
              })
              track(
                make({
                  eventName:
                    Name.WITHDRAW_USDC_COINFLOW_SEND_TRANSACTION_FAILED,
                  error: (error as Error).message ?? undefined
                })
              )
              throw error
            }
          }
        }
      })
    }
    initWallet()
  }, [audiusBackend, currentUser, solanaWalletService, make, track, audiusSdk])

  return adapter
}

/** An adapter for signing and sending unmodified Coinflow transactions. Will partialSign with the
 * current user's Solana root wallet and send/confirm locally (no relay).
 * @param onSuccess optional callback to invoke when the relay succeeds
 */
export const useCoinflowAdapter = ({
  onSuccess,
  onFailure
}: {
  onSuccess: () => void
  onFailure: () => void
}) => {
  const { audiusBackend } = useAppContext()
  const [adapter, setAdapter] = useState<CoinflowAdapter | null>(null)
  const { audiusSdk, solanaWalletService } = useQueryContext()
  const dispatch = useDispatch()

  useEffect(() => {
    const initWallet = async () => {
      const wallet = await solanaWalletService.getKeypair()
      const sdk = await audiusSdk()
      const connection = sdk.services.solanaClient.connection
      if (!wallet) {
        console.error(
          'useCoinflowWithdrawalAdapter: Missing solana root wallet'
        )
        return
      }

      setAdapter({
        connection,
        wallet: {
          publicKey: wallet.publicKey,
          sendTransaction: async (tx: Transaction | VersionedTransaction) => {
            try {
              const transaction = tx as VersionedTransaction

              // Get a more recent blockhash to prevent BlockhashNotFound errors
              transaction.message.recentBlockhash = (
                await connection.getLatestBlockhash()
              ).blockhash

              // Use our own fee payer as signer
              transaction.message.staticAccountKeys[0] =
                await sdk.services.solanaRelay.getFeePayer()
              transaction.signatures[0] = Buffer.alloc(64, 0)

              // Sign with user's Eth wallet derived "root" Solana wallet,
              // which is the source of the funds for the purchase
              transaction.sign([wallet])

              // Send to relay to make use of retry and caching logic
              const { signature } = await sdk.services.solanaRelay.relay({
                transaction,
                sendOptions: {
                  skipPreflight: true
                }
              })
              onSuccess()
              return signature
            } catch (e) {
              console.error('Caught error in sendTransaction', e)
              const error =
                e instanceof PurchaseContentError || e instanceof BuyUSDCError
                  ? e
                  : new PurchaseContentError(PurchaseErrorCode.Unknown, `${e}`)
              dispatch(
                purchaseContentActions.purchaseContentFlowFailed({ error })
              )
              onFailure()
              throw e
            }
          }
        }
      })
    }
    initWallet()
  }, [
    audiusBackend,
    solanaWalletService,
    audiusSdk,
    dispatch,
    onSuccess,
    onFailure
  ])

  return adapter
}
