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
  SystemProgram,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js'
import BN from 'bn.js'
import bs58 from 'bs58'
import { Request, Response } from 'express'

import { config } from '../../config'
import { logger } from '../../logger'
import { getConnection } from '../../utils/connections'
import { sendTransactionWithRetries } from '../../utils/transaction'

import { makeCurve, makeTestCurve } from './curve'
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
 *  3. Return transactions to sign and send from the client
 *  4. Spawning a process to create a reward pool for the new coin in the background
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

    // Account / Keypair Setup
    // ------------------------------------------------------------
    // The wallet public key is the creator of the coin
    const walletPublicKey = new PublicKey(walletPublicKeyStr)

    // The launchpad partner (or fee claiming) for the coin
    const launchpadPartnerPublicKey = new PublicKey(
      config.launchpadPartnerPublicKey
    )

    // Pick a random fee payer to pay for Tx's
    // It also "owns" our new coin metadata and pay for the TX
    const index = Math.floor(Math.random() * solanaFeePayerWallets.length)
    const feePayer = solanaFeePayerWallets[index]

    // The new mint keypair for the coin
    const mintKeypair = await getKeypair(logger)

    // The audius authority is used to create the dbc config
    const audiusAuthorityKeypair = Keypair.fromSecretKey(
      bs58.decode(config.launchpadPartnerSignerPrivateKey)
    )

    // This is the token account to custody the reward pool tokens
    // It is used as the leftover receiver in the dbc config
    const rewardPoolTokenAccount = Keypair.generate()

    // Transaction Execution
    // ------------------------------------------------------------

    // 1. Create Coin Metadata
    logger.info('Creating coin metadata', { name, symbol })
    const umi = createUmi(connection.rpcEndpoint).use(irysUploader() as any) // note: something is off with the types with the different umi package versions
    // Pick a random fee payer to "own" our new coin metadata and pay for the TX
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
    logger.info('Coin metadata creator', { name, symbol, metadataUri })

    // 2. Create a config for the new coin
    const configKeypair = Keypair.generate()
    logger.info('Creating config for new coin', {
      name,
      symbol,
      configKeypair: configKeypair.publicKey.toBase58()
    })
    const createConfigTx = await dbcClient.partner.createConfig(
      config.environment === 'prod'
        ? makeCurve({
            payer: audiusAuthorityKeypair,
            configKey: configKeypair,
            partner: launchpadPartnerPublicKey,
            rewardPoolTokenAccount: rewardPoolTokenAccount.publicKey
          })
        : makeTestCurve({
            payer: audiusAuthorityKeypair,
            configKey: configKeypair,
            partner: launchpadPartnerPublicKey,
            rewardPoolTokenAccount: rewardPoolTokenAccount.publicKey
          })
    )
    const createConfigRecentBlockhash = await connection.getLatestBlockhash()
    const createConfigMessage = new TransactionMessage({
      recentBlockhash: createConfigRecentBlockhash.blockhash,
      instructions: [...createConfigTx.instructions],
      payerKey: audiusAuthorityKeypair.publicKey
    })
    const createConfigTransaction = new VersionedTransaction(
      createConfigMessage.compileToV0Message()
    )
    createConfigTransaction.sign([
      configKeypair, // the keypair the config is deployed to
      audiusAuthorityKeypair // the audius authority
    ])
    const createConfigSignature = await sendTransactionWithRetries({
      transaction: createConfigTransaction,
      commitment: 'confirmed',
      confirmationStrategy: {
        ...createConfigRecentBlockhash,
        signature: bs58.encode(createConfigTransaction.signatures[0])
      },
      logger
    })
    logger.info('Created config', {
      name,
      symbol,
      signature: createConfigSignature
    })

    // 3. Create pool and first buy
    logger.info('Preparing create pool and swap buy transactions', {
      name,
      symbol
    })
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

    // 4. Create a reward pool for the new coin
    logger.info('Creating reward pool for new coin', { name, symbol })
    const manager = Keypair.generate()
    const rewardManager = Keypair.generate()
    const rewardPoolTx = await createRewardPool({
      connection,
      tokenAccount: rewardPoolTokenAccount,
      feePayer,
      manager,
      rewardManager,
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
    rewardPoolTransaction.sign([
      rewardPoolTokenAccount,
      feePayer,
      manager,
      rewardManager
    ])
    const rewardPoolSignature = await sendTransactionWithRetries({
      transaction: rewardPoolTransaction,
      commitment: 'confirmed',
      confirmationStrategy: {
        ...rewardPoolRecentBlockhash,
        signature: bs58.encode(rewardPoolTransaction.signatures[0])
      },
      logger
    })
    logger.info('Created reward pool', {
      name,
      symbol,
      signature: rewardPoolSignature
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
