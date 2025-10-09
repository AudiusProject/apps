import {
  createGenericFile,
  signerIdentity,
  createSignerFromKeypair
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys'
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { Request, Response } from 'express'

import { config } from '../../config'
import { logger } from '../../logger'
import { getConnection } from '../../utils/connections'

import { getKeypair } from './getKeypair'

interface LaunchCoinRequestBody {
  name: string
  symbol: string
  walletPublicKey: string
  description: string
  initialBuyAmountAudio?: string // NOTE: should be in big number format (no decimals)
}

const AUDIUS_COIN_URL = (ticker: string) => `https://audius.co/coins/${ticker}`

export const launchCoin = async (
  req: Request<unknown, unknown, LaunchCoinRequestBody> & {
    file?: Express.Multer.File
  },
  res: Response
) => {
  try {
    const { launchpadConfigKey: configKey, solanaFeePayerWallets } = config

    const {
      name,
      symbol,
      description,
      walletPublicKey: walletPublicKeyStr,
      initialBuyAmountAudio
    } = req.body

    // file is the image attached via multer middleware (sent from client as a multipart/form-data request)
    const file = req.file
    if (!file) {
      throw new Error('Image file is required.')
    }

    if (!name || !symbol || !file || !description) {
      throw new Error(
        'Invalid metadata arguments. Name, symbol, image, and description are all required.'
      )
    }

    if (!walletPublicKeyStr) {
      throw new Error(
        'Invalid wallet public key. Wallet public key is required.'
      )
    }

    if (
      initialBuyAmountAudio !== undefined &&
      !new BN(initialBuyAmountAudio).gt(new BN(0))
    ) {
      throw new Error(
        `Invalid initialBuyAmountSol. Initial buy amount must be a number > 0. Received: ${initialBuyAmountAudio}`
      )
    }

    const walletPublicKey = new PublicKey(walletPublicKeyStr)

    const mintKeypair = await getKeypair(logger)
    const mintPublicKey = mintKeypair.publicKey

    const connection = getConnection()
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed')

    // Create Coin Metadata
    const umi = createUmi(connection.rpcEndpoint).use(irysUploader() as any) // note: something is off with the types with the different umi package versions
    // Pick a random fee payer to "own" our new coin metadata and pay for the TX
    const index = Math.floor(Math.random() * solanaFeePayerWallets.length)
    const feePayer = solanaFeePayerWallets[index]
    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(feePayer.secretKey)
    const signer = createSignerFromKeypair(umi, umiKeypair)
    umi.use(signerIdentity(signer))

    const umiImageFile = createGenericFile(file.buffer, '', {
      tags: [{ name: 'Content-Type', value: 'image/jpeg' }]
    })
    const imageUris = await umi.uploader.upload([umiImageFile])
    const imageUri = imageUris[0]
    const metadata = {
      name,
      symbol,
      description,
      image: imageUri,
      external_url: AUDIUS_COIN_URL(symbol),
      attributes: [],
      isMutable: false
    }
    const metadataUri = await umi.uploader.uploadJson(metadata)

    // Set up our pool
    const poolConfig = await dbcClient.pool.createPoolWithFirstBuy({
      createPoolParam: {
        config: new PublicKey(configKey),
        name,
        symbol,
        uri: metadataUri,
        poolCreator: walletPublicKey,
        baseMint: mintPublicKey,
        payer: walletPublicKey
      },
      firstBuyParam: initialBuyAmountAudio
        ? {
            buyer: walletPublicKey,
            receiver: walletPublicKey,
            buyAmount: new BN(initialBuyAmountAudio), // Needs to already be formatted with correct decimals
            minimumAmountOut: new BN(0), // No slippage protection for initial buy
            referralTokenAccount: null // No referral for creator's initial buy
          }
        : undefined
    })

    /*
     * Prepare the transactions to be signed by the client
     */

    // Create pool transaction
    const createPoolTx = poolConfig.createPoolTx
    createPoolTx.feePayer = walletPublicKey
    createPoolTx.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash
    // We need to partial sign with the mint keypair that's only accessible here
    // The client does the final signing with the wallet keypair & will send/confirm the transactions
    createPoolTx.partialSign(mintKeypair)

    // First buy transaction
    const firstBuyTx = poolConfig.swapBuyTx
    if (firstBuyTx) {
      firstBuyTx.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash
      firstBuyTx.feePayer = walletPublicKey
    }

    return res.status(200).send({
      mintPublicKey: mintPublicKey.toBase58(),
      imageUri,
      createPoolTx: Buffer.from(
        createPoolTx.serialize({ requireAllSignatures: false })
      ).toString('base64'),
      firstBuyTx: firstBuyTx
        ? Buffer.from(
            firstBuyTx.serialize({ requireAllSignatures: false })
          ).toString('base64')
        : undefined,
      metadataUri
    })
  } catch (e) {
    logger.error('Error creating coin for launchpad')
    logger.error(e)
    res.status(500).send()
  }
}
