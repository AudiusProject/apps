import {
  QUERY_KEYS,
  getArtistCreatedCoinQueryKey,
  getConnectedWalletsQueryOptions,
  getCurrentAccountQueryKey,
  getUserQueryKey,
  useQueryContext
} from '@audius/common/api'
import {
  Feature,
  LaunchCoinErrorMetadata,
  LaunchCoinResponse
} from '@audius/common/models'
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
  socialLinks?: string[]
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
      image,
      socialLinks
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

        const signTx = async (
          transactionSerialized: string
        ): Promise<VersionedTransaction> => {
          try {
            const bytes = new Uint8Array(
              Buffer.from(transactionSerialized, 'base64')
            )
            const deserializedTx = VersionedTransaction.deserialize(bytes)
            const tx = await solanaProvider.signTransaction(deserializedTx)
            return tx
          } catch (e) {
            console.error('Error signing transaction', e)
            throw e
          }
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
          configPublicKey,
          imageUri
        } = res
        errorMetadata.createPoolTx = createPoolTxSerialized
        errorMetadata.firstBuyTx = firstBuyTxSerialized
        errorMetadata.coinMetadata.mint = mintPublicKey
        errorMetadata.coinMetadata.imageUri = imageUri

        errorMetadata.relayResponseReceived = true
        errorMetadata.lastStep = 'relayResponseReceived'

        // Sign locally (do not send). Send both to relay confirm endpoint.
        const signedCreatePoolTx = await signTx(createPoolTxSerialized)
        const signedFirstBuyTx = firstBuyTxSerialized
          ? await signTx(firstBuyTxSerialized)
          : undefined

        let confirmRes
        try {
          confirmRes = await sdk.services.solanaRelay.confirmLaunchCoin({
            mintPublicKey: new PublicKey(mintPublicKey),
            configPublicKey: new PublicKey(configPublicKey),
            createPoolTx: signedCreatePoolTx.serialize(),
            firstBuyTx: signedFirstBuyTx?.serialize()
          })
          // Treat a successful response as confirmations completed
          errorMetadata.poolCreateConfirmed = true
          if (firstBuyTxSerialized && initialBuyAmountAudio) {
            errorMetadata.firstBuyConfirmed = !!confirmRes.firstBuySignature
          }
          errorMetadata.lastStep = errorMetadata.firstBuyConfirmed
            ? 'firstBuyConfirmed'
            : 'poolCreateConfirmed'
        } catch (e) {
          if (reportToSentry) {
            reportToSentry({
              error: e instanceof Error ? e : new Error(e as string),
              name: 'Confirm Launch Failure',
              feature: Feature.ArtistCoins,
              additionalInfo: errorMetadata
            })
          }
          throw e
        }

        /*
         * Add coin to Audius database
         * its in a separate try/catch because it's technically non-blocking
         */
        try {
          const sanitizedLinks = Array.from(
            new Set(
              (socialLinks ?? [])
                .map((link) => link?.trim())
                .filter((link): link is string => Boolean(link))
                .map((link) => {
                  try {
                    const url = new URL(link)
                    return url.toString()
                  } catch {
                    return null
                  }
                })
                .filter((link): link is string => Boolean(link))
            )
          ).slice(0, 4)

          // Create coin in Audius database
          await sdk.coins.createCoin({
            userId: Id.parse(userId),
            createCoinRequest: {
              mint: mintPublicKey,
              ticker: `${symbolUpper}`,
              decimals: LAUNCHPAD_COIN_DECIMALS,
              name,
              logoUri: imageUri,
              link1: sanitizedLinks[0],
              link2: sanitizedLinks[1],
              link3: sanitizedLinks[2],
              link4: sanitizedLinks[3]
              // intentionally don't send description to prevent the Artist Coin page from referencing itself
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
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.coins] })
      // Invalidate the user to refresh their badge info
      queryClient.invalidateQueries({
        queryKey: getUserQueryKey(params.userId)
      })
      queryClient.invalidateQueries({
        queryKey: getCurrentAccountQueryKey()
      })
      // Invalidate our user - this will refresh their badge info
      // NOTE: this will eventually move to the users metadata
      queryClient.invalidateQueries({
        queryKey: getArtistCreatedCoinQueryKey(params.userId)
      })
      // The confirmation call will associate the external wallet, so we need to invalidate the connected wallets query
      queryClient.invalidateQueries({
        queryKey: getConnectedWalletsQueryOptions(
          { audiusSdk },
          { userId: params.userId }
        ).queryKey
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
