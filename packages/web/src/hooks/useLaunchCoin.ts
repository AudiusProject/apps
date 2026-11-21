import {
  QUERY_KEYS,
  getArtistCreatedFanClubQueryKey,
  getConnectedWalletsQueryOptions,
  getCurrentAccountQueryKey,
  getUserQueryKey,
  uploadBackdropImage,
  useQueryContext
} from '@audius/common/api'
import {
  LaunchCoinErrorMetadata,
  LaunchCoinResponse
} from '@audius/common/models'
import { Id } from '@audius/sdk'
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react'
import { PublicKey, VersionedTransaction } from '@solana/web3.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { appkitModal } from 'app/ReownAppKitModal'

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
  bannerImageFile?: File | null
  bannerImageUrl?: string
}

export const LAUNCHPAD_COIN_DECIMALS = 9

export const useLaunchCoin = () => {
  const { audiusSdk } = useQueryContext()
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
      socialLinks,
      bannerImageFile,
      bannerImageUrl
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
          errorMetadata.poolCreateConfirmed = true
          if (firstBuyTxSerialized && initialBuyAmountAudio) {
            errorMetadata.firstBuyConfirmed = !!confirmRes.firstBuySignature
          }
          errorMetadata.lastStep = errorMetadata.firstBuyConfirmed
            ? 'firstBuyConfirmed'
            : 'poolCreateConfirmed'
        } catch (e) {
          console.error(
            'Confirm Launch Failure',
            e instanceof Error ? e : new Error(e as string)
          )
          throw e
        }

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

          let resolvedBannerImageUrl = bannerImageUrl
          if (bannerImageFile) {
            resolvedBannerImageUrl = await uploadBackdropImage(
              sdk,
              bannerImageFile
            )
          }

          await sdk.coins.createCoin({
            userId: Id.parse(userId),
            createCoinRequest: {
              mint: mintPublicKey,
              ticker: `${symbolUpper}`,
              decimals: LAUNCHPAD_COIN_DECIMALS,
              name,
              logoUri: imageUri,
              ...(resolvedBannerImageUrl
                ? { bannerImageUrl: resolvedBannerImageUrl }
                : {}),
              link1: sanitizedLinks[0],
              link2: sanitizedLinks[1],
              link3: sanitizedLinks[2],
              link4: sanitizedLinks[3]
              // intentionally don't send description to prevent the Fan Club page from referencing itself
            }
          })
          errorMetadata.sdkCoinAdded = true
          errorMetadata.lastStep = 'sdkCoinAdded'
        } catch (e) {
          console.error(
            'SDK Create Coin Failure',
            e instanceof Error ? e : new Error(e as string)
          )
        }

        return {
          isError: false,
          newMint: mintPublicKey,
          logoUri: imageUri,
          errorMetadata
        }
      } catch (error) {
        console.error(
          'Launch Coin Failure',
          error instanceof Error ? error : new Error(error as string)
        )
        return { isError: true, errorMetadata, newMint: '', logoUri: '' }
      }
    },
    onSuccess: (_result, params, _context) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.coins] })
      queryClient.invalidateQueries({
        queryKey: getUserQueryKey(params.userId)
      })
      queryClient.invalidateQueries({
        queryKey: getCurrentAccountQueryKey()
      })
      queryClient.invalidateQueries({
        queryKey: getArtistCreatedFanClubQueryKey(params.userId)
      })
      queryClient.invalidateQueries({
        queryKey: getConnectedWalletsQueryOptions(
          { audiusSdk },
          { userId: params.userId }
        ).queryKey
      })
    },
    onError: (error, params, _context) => {
      console.error(
        'Launch Coin',
        error instanceof Error ? error : new Error(error as string)
      )
    }
  })
}
