import {
  createGenericFile,
  signerIdentity,
  createSignerFromKeypair
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys'
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import {
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js'
import BN from 'bn.js'
import { Request, Response } from 'express'

import { config } from '../../config'
import { logger } from '../../logger'
import { getConnection } from '../../utils/connections'
import { sendTransactionWithRetries } from '../../utils/transaction'

import { makeCurve } from './curve'
import { getKeypair } from './getKeypair'
import { createRewardPool } from './reward_pool'

interface LaunchCoinRequestBody {
  name: string
  symbol: string
  walletPublicKey: string
  description: string
  initialBuyAmountAudio?: string // NOTE: should be in big number format (no decimals)
}

const AUDIUS_COIN_URL = (ticker: string) => `https://audius.co/coins/${ticker}`

/**
 * Launches a new coin on the launchpad with bonding curve.
 * The coin is created with a new mint and a new config.
 * Process:
 *  1. Creates metadata for the new coin
 *  2. Create a config for the new coin
 *  3. Create a reward pool for the new coin
 *  4. Return transactions to sign and send from the client
 * @param req Request object containing the coin details
 * @param res Response object containing the coin details
 * @returns Response object containing two transactions
 *  - Pool creation transaction
 *  - First buy transaction
 */
export const launchCoin = async (
  req: Request<unknown, unknown, LaunchCoinRequestBody> & {
    file?: Express.Multer.File
  },
  res: Response
) => {
  try {
    const { solanaFeePayerWallets } = config

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

    const connection = getConnection()
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed')

    const walletPublicKey = new PublicKey(walletPublicKeyStr)

    const mintKeypair = await getKeypair(logger)
    const rewardPoolManager = Keypair.generate()
    const rewardPoolTokenAccount = Keypair.generate()

    // 1. Create Coin Metadata
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

    // 2. Create a config for the new coin
    const configKeypair = Keypair.generate()
    const createConfigTx = await dbcClient.partner.createConfig(
      makeCurve({
        payer: mintKeypair,
        configKey: configKeypair,
        partner: walletPublicKey,
        rewardPoolTokenAccount: rewardPoolTokenAccount.publicKey
      })
    )
    const configRecentBlockhash = await connection.getLatestBlockhash()
    const configMessage = new TransactionMessage({
      recentBlockhash: configRecentBlockhash.blockhash,
      instructions: createConfigTx.instructions,
      payerKey: feePayer.publicKey
    })
    const configTransaction = new VersionedTransaction(
      configMessage.compileToV0Message()
    )
    configTransaction.sign([feePayer, configKeypair])
    await sendTransactionWithRetries({
      transaction: configTransaction,
      commitment: 'confirmed',
      confirmationStrategy: { ...configRecentBlockhash, signature: '' },
      logger
    })

    // 3. Create a reward pool for the new coin
    const rewardPoolTx = await createRewardPool({
      connection,
      rewardManager: rewardPoolManager,
      tokenAccount: rewardPoolTokenAccount,
      feePayer,
      mint: mintKeypair.publicKey
    })
    const rewardPoolRecentBlockhash = await connection.getLatestBlockhash()
    const rewardPoolMessage = new TransactionMessage({
      recentBlockhash: rewardPoolRecentBlockhash.blockhash,
      instructions: rewardPoolTx.instructions,
      payerKey: feePayer.publicKey
    })
    const rewardPoolTransaction = new VersionedTransaction(
      rewardPoolMessage.compileToV0Message()
    )
    await sendTransactionWithRetries({
      transaction: rewardPoolTransaction,
      commitment: 'confirmed',
      confirmationStrategy: { ...rewardPoolRecentBlockhash, signature: '' },
      logger
    })

    // 4. Create pool and first buy
    const { createPoolTx, swapBuyTx } =
      await dbcClient.pool.createPoolWithFirstBuy({
        createPoolParam: {
          config: configKeypair.publicKey,
          name,
          symbol,
          uri: metadataUri,
          poolCreator: walletPublicKey,
          baseMint: mintKeypair.publicKey,
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
     * We partially sign so that the user can sign with their wallet and send the transactions
     */
    createPoolTx.feePayer = walletPublicKey
    createPoolTx.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash
    createPoolTx.partialSign(mintKeypair)
    if (swapBuyTx) {
      swapBuyTx.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash
      swapBuyTx.feePayer = walletPublicKey
    }

    return res.status(200).send({
      mintPublicKey: mintKeypair.publicKey.toBase58(),
      imageUri,
      createPoolTx: Buffer.from(
        createPoolTx.serialize({ requireAllSignatures: false })
      ).toString('base64'),
      firstBuyTx: swapBuyTx
        ? Buffer.from(
            swapBuyTx.serialize({ requireAllSignatures: false })
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
