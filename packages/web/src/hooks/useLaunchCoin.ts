import {
  getArtistCoinsQueryKey,
  getUserCreatedCoinsQueryKey,
  useQueryContext
} from '@audius/common/api'
import { Feature } from '@audius/common/models'
import { Id } from '@audius/sdk'
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react'
import { PublicKey, VersionedTransaction } from '@solana/web3.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { appkitModal } from 'app/ReownAppKitModal'

// Leaving in consoles for QA and possibly soft-launch to make sure we have good info on where things are failing
/* eslint-disable no-console */

export type LaunchCoinParams = {
  userId: number
  name: string
  symbol: string
  description: string
  walletPublicKey: string
  initialBuyAmountAudio?: string
  image: Blob
}

/**
 * Errors here are complicated & a sensitive area for users, so we want to log lots of info
 */
export type LaunchCoinErrorMetadata = {
  userId: number
  lastStep: string
  relayResponseReceived: boolean
  poolCreateConfirmed: boolean
  sdkCoinAdded: boolean
  firstBuyConfirmed: boolean
  requestedFirstBuy: boolean
  createPoolTx: string
  firstBuyTx: string | undefined
  initialBuyAmountAudio: string | undefined
  coinMetadata: {
    mint: string
    imageUri: string
    name: string
    symbol: string
    description: string
    walletAddress: string
  }
}

export type LaunchCoinResponse = {
  isError: boolean
  errorMetadata: LaunchCoinErrorMetadata
  newMint: string
  logoUri: string
}

export const LAUNCHPAD_COIN_DECIMALS = 9 // All our launched coins will have 9 decimals

/**
 * Hook for launching a new coin on the launchpad with bonding curve.
 * This creates a new token and optionally makes an initial purchase.
 */
export const useLaunchCoin = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation<LaunchCoinResponse, Error, LaunchCoinParams>({
    mutationFn: async ({
      userId,
      name,
      symbol,
      description,
      walletPublicKey: walletPublicKeyStr,
      initialBuyAmountAudio,
      image
    }: LaunchCoinParams): Promise<LaunchCoinResponse> => {
      const symbolUpper = symbol.toUpperCase()
      const errorMetadata: LaunchCoinErrorMetadata = {
        userId,
        lastStep: '',
        relayResponseReceived: false,
        poolCreateConfirmed: false,
        sdkCoinAdded: false,
        firstBuyConfirmed: false,
        requestedFirstBuy: !!initialBuyAmountAudio,
        createPoolTx: '',
        firstBuyTx: '',
        initialBuyAmountAudio,
        coinMetadata: {
          mint: '',
          imageUri: '',
          name,
          symbol: symbolUpper,
          description,
          walletAddress: walletPublicKeyStr
        }
      }

      try {
        const sdk = await audiusSdk()
        const solanaProvider = appkitModal.getProvider<SolanaProvider>('solana')
        if (!solanaProvider) {
          throw new Error('Missing SolanaProvider')
        }
        if (!walletPublicKeyStr) {
          throw new Error('Missing solana wallet keypair')
        }

        const signAndSendTx = async (transactionSerialized: string) => {
          // Transaction is sent from the backend as a serialized base64 string
          const deserializedTx = VersionedTransaction.deserialize(
            Buffer.from(transactionSerialized, 'base64')
          )

          // Triggers 3rd party wallet to sign the transaction, doesnt send to Solana just yet
          const signature =
            await solanaProvider.signAndSendTransaction(deserializedTx)
          await sdk.services.solanaClient.connection.confirmTransaction(
            signature,
            'confirmed'
          )
          return signature
        }

        const walletPublicKey = new PublicKey(walletPublicKeyStr)

        // Sets up coin TXs and on-chain metadata on relay side
        const res = await sdk.services.solanaRelay.launchCoin({
          name,
          symbol: symbolUpper,
          description,
          walletPublicKey,
          initialBuyAmountAudio,
          image
        })
        const {
          createPoolTx: createPoolTxSerialized,
          firstBuyTx: firstBuyTxSerialized,
          mintPublicKey,
          imageUri
        } = res
        errorMetadata.createPoolTx = createPoolTxSerialized
        errorMetadata.firstBuyTx = firstBuyTxSerialized
        errorMetadata.coinMetadata.mint = mintPublicKey
        errorMetadata.coinMetadata.imageUri = imageUri

        errorMetadata.relayResponseReceived = true
        errorMetadata.lastStep = 'relayResponseReceived'

        /**
         * Pool creation - sign & send TX
         */
        await signAndSendTx(createPoolTxSerialized)
        errorMetadata.poolCreateConfirmed = true
        errorMetadata.lastStep = 'poolCreateConfirmed'

        /*
         * Add coin to Audius database
         * its in a separate try/catch because it's technically non-blocking
         */
        try {
          // Create coin in Audius database
          await sdk.coins.createCoin({
            userId: Id.parse(userId),
            createCoinRequest: {
              mint: mintPublicKey,
              ticker: `$${symbolUpper}`,
              decimals: LAUNCHPAD_COIN_DECIMALS,
              name,
              logoUri: imageUri,
              description
            }
          })
          errorMetadata.sdkCoinAdded = true
          errorMetadata.lastStep = 'sdkCoinAdded'
        } catch (e) {
          if (reportToSentry) {
            reportToSentry({
              error: e instanceof Error ? e : new Error(e as string),
              name: 'SDK Create Coin Failure',
              feature: Feature.ArtistCoins,
              additionalInfo: errorMetadata
            })
          }
        }

        // Perform sol->audio swap & first buy
        if (firstBuyTxSerialized && initialBuyAmountAudio) {
          // First buy
          await signAndSendTx(firstBuyTxSerialized)
          errorMetadata.firstBuyConfirmed = true
          errorMetadata.lastStep = 'firstBuyConfirmed'
        }

        return {
          isError: false,
          newMint: mintPublicKey,
          logoUri: imageUri,
          errorMetadata
        }
      } catch (error) {
        if (reportToSentry) {
          reportToSentry({
            error: error instanceof Error ? error : new Error(error as string),
            name: 'Launch Coin Failure',
            feature: Feature.ArtistCoins,
            additionalInfo: errorMetadata
          })
        }
        return { isError: true, errorMetadata, newMint: '', logoUri: '' }
      }
    },
    onSuccess: (_result, params, _context) => {
      // Invalidate the list of artist coins to add it to the list
      queryClient.invalidateQueries({ queryKey: getArtistCoinsQueryKey() })
      // Invalidate our user - this will refresh their badge info
      // NOTE: this will eventually move to the users metadata
      queryClient.invalidateQueries({
        queryKey: getUserCreatedCoinsQueryKey(params.userId)
      })
    },
    onError: (error, params, _context) => {
      if (reportToSentry) {
        reportToSentry({
          error: error instanceof Error ? error : new Error(error as string),
          name: 'Launch Coin',
          feature: Feature.TanQuery,
          additionalInfo: {
            coinName: params.name,
            coinSymbol: params.symbol,
            initialBuyAmount: params.initialBuyAmountAudio ?? 0
          }
        })
      }
    }
  })
}
