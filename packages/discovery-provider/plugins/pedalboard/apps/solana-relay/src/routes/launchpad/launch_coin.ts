import { createHash } from 'crypto'

import { RewardManagerProgram } from '@audius/spl'
import {
  createGenericFile,
  signerIdentity,
  createSignerFromKeypair,
  sol,
  subtractAmounts,
  isLessThanAmount
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import {
  irysUploader,
  isIrysUploader
} from '@metaplex-foundation/umi-uploader-irys'
import {
  deriveDbcPoolAddress,
  DynamicBondingCurveClient
} from '@meteora-ag/dynamic-bonding-curve-sdk'
import {
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js'
import BN from 'bn.js'
import bs58 from 'bs58'
import { Request, Response } from 'express'
import sharp from 'sharp'

import { config } from '../../config'
import { logger } from '../../logger'
import { getConnection, connections } from '../../utils/connections'
import { sendTransactionWithRetries } from '../../utils/transaction'

import { AUDIO_MINT } from './constants'
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

const MIN_IRYS_BALANCE = sol(0.1) // Min balance to keep in Irys per fee payer
const FUND_TO_IRYS_BALANCE = sol(0.15) // Amount to fund Irys balance to

type FeePayerUmi = {
  umi: ReturnType<typeof createUmi>
}

const feePayerUmis: FeePayerUmi[] = config.solanaFeePayerWallets.map(
  (feePayer, i) => {
    const endpoint = connections[i % connections.length].rpcEndpoint
    const umi = createUmi(endpoint).use(irysUploader())
    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(feePayer.secretKey)
    const signer = createSignerFromKeypair(umi, umiKeypair)
    umi.use(signerIdentity(signer))
    return { umi }
  }
)

const topUpIrysBalances = async () => {
  await Promise.all(
    feePayerUmis.map(async ({ umi }, idx) => {
      try {
        const uploader = umi.uploader
        if (!isIrysUploader(uploader)) return
        const balance = await uploader.getBalance()
        if (isLessThanAmount(balance, MIN_IRYS_BALANCE)) {
          logger.info({
            message: 'Irys balance is less than target balance',
            balance,
            targetBalance: FUND_TO_IRYS_BALANCE
          })
          const required = subtractAmounts(FUND_TO_IRYS_BALANCE, balance)
          logger.info({
            message: 'Required Irys balance',
            required
          })
          if (required.basisPoints > BigInt(0)) {
            await uploader.fund(required, true)
            logger.info({
              message: 'Topped up Irys balance',
              feePayerIndex: idx
            })
          }
        }
      } catch (e) {
        logger.warn({ message: 'Failed to top up Irys balance', idx, e })
      }
    })
  )
}
topUpIrysBalances()
setInterval(topUpIrysBalances, 5 * 60 * 1000)

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
        `Invalid initialBuyAmountAudio. Initial buy amount must be a number > 0. Received: ${initialBuyAmountAudio}`
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

    // The new mint keypair for the coin
    const mintKeypair = await getKeypair(logger)

    // The audius authority is used to create the dbc config
    const audiusAuthorityKeypair = Keypair.fromSecretKey(
      bs58.decode(config.launchpadPartnerSignerPrivateKey)
    )

    // Deterministic token account for reward pool custody (pubkey used in config)
    const rewardManagerState = deriveKeypair(
      'reward-manager',
      mintKeypair.publicKey
    )
    logger.info({
      message: 'Derived reward pool token account',
      mint: mintKeypair.publicKey.toBase58(),
      rewardManagerState: rewardManagerState.publicKey.toBase58()
    })

    // Transaction Execution
    // ------------------------------------------------------------

    // 1. Create Coin Metadata
    logger.info({
      message: 'Creating coin metadata',
      name,
      symbol
    })
    const umi = feePayerUmis[index].umi

    // Resize incoming image to 1000x1000 and convert to png for consistency
    const img = sharp(file.buffer)
    const { width, height } = await img.metadata()
    const resizedBuffer =
      width && height && (width > 1000 || height > 1000)
        ? await img.resize(1000, 1000, { fit: 'inside' }).png().toBuffer()
        : await img.png().toBuffer()

    const umiImageFile = createGenericFile(resizedBuffer, '', {
      tags: [{ name: 'Content-Type', value: 'image/png' }]
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
    logger.info({
      message: 'Coin metadata creator',
      name,
      symbol,
      metadataUri
    })

    // 2. Create a config for the new coin
    const configKeypair = Keypair.generate()
    logger.info({
      message: 'Creating config for new coin',
      name,
      symbol,
      configKeypair: configKeypair.publicKey.toBase58()
    })
    const rewardPoolTokenAuthority = RewardManagerProgram.deriveAuthority({
      programId: RewardManagerProgram.programId,
      rewardManagerState: rewardManagerState.publicKey
    })
    const createConfigTx = await dbcClient.partner.createConfig(
      config.environment === 'prod'
        ? makeCurve({
            payer: audiusAuthorityKeypair,
            configKey: configKeypair,
            partner: launchpadPartnerPublicKey,
            rewardPoolAuthority: rewardPoolTokenAuthority
          })
        : makeTestCurve({
            payer: audiusAuthorityKeypair,
            configKey: configKeypair,
            partner: launchpadPartnerPublicKey,
            rewardPoolAuthority: rewardPoolTokenAuthority
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
    await connection.confirmTransaction({
      signature: createConfigSignature,
      blockhash: createConfigRecentBlockhash.blockhash,
      lastValidBlockHeight: createConfigRecentBlockhash.lastValidBlockHeight
    })
    logger.info({
      message: 'Created config',
      name,
      symbol,
      signature: createConfigSignature
    })

    // 3. Create pool and first buy
    logger.info({
      message: 'Preparing create pool and swap buy transactions',
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

    /*
     * Prepare the transactions to be signed by the client
     * We partially sign so that the user can sign with their wallet and send the transactions
     */
    // Add a no-op memo instruction to get the audius authority to sign
    createPoolTx.add(
      new TransactionInstruction({
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        keys: [
          {
            pubkey: audiusAuthorityKeypair.publicKey,
            isSigner: true,
            isWritable: false
          }
        ],
        data: Buffer.alloc(0)
      })
    )
    createPoolTx.feePayer = walletPublicKey
    createPoolTx.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash
    createPoolTx.partialSign(mintKeypair, audiusAuthorityKeypair)
    if (swapBuyTx) {
      swapBuyTx.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash
      swapBuyTx.feePayer = walletPublicKey
    }

    res.status(200).send({
      mintPublicKey: mintKeypair.publicKey.toBase58(),
      configPublicKey: configKeypair.publicKey.toBase58(),
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

// Deterministically derive a Keypair from the launchpad deterministic secret, label, and mint
const deriveKeypair = (label: string, mint: PublicKey): Keypair => {
  const seedMaterial = Buffer.concat([
    Buffer.from(config.launchpadDeterministicSecret, 'utf8'),
    Buffer.from('audius-launchpad', 'utf8'),
    Buffer.from(label, 'utf8'),
    mint.toBuffer()
  ])
  const seed = createHash('sha256').update(seedMaterial).digest()
  return Keypair.fromSeed(seed)
}

interface ConfirmLaunchCoinRequestBody {
  mintPublicKey: string
  configPublicKey: string
  createPoolTx: string // base64 VersionedTransaction, fully signed
  firstBuyTx?: string // base64 VersionedTransaction, fully signed
}

export const confirmLaunchCoin = async (
  req: Request<unknown, unknown, ConfirmLaunchCoinRequestBody>,
  res: Response
) => {
  try {
    const { mintPublicKey, configPublicKey, createPoolTx, firstBuyTx } =
      req.body
    if (!mintPublicKey || !configPublicKey || !createPoolTx) {
      return res.status(400).send({
        error: 'mintPublicKey, configPublicKey, and createPoolTx are required'
      })
    }

    const connection = getConnection()

    // Deserialize transactions
    const createPoolTransaction = VersionedTransaction.deserialize(
      Buffer.from(createPoolTx, 'base64')
    )
    const swapTransaction = firstBuyTx
      ? VersionedTransaction.deserialize(Buffer.from(firstBuyTx, 'base64'))
      : null

    // 1. Send create pool transaction and wait for confirmation
    const createSig = bs58.encode(createPoolTransaction.signatures[0])
    await sendTransactionWithRetries({
      transaction: createPoolTransaction,
      commitment: 'confirmed',
      sendOptions: {
        skipPreflight: true
      },
      confirmationStrategy: {
        ...(await connection.getLatestBlockhash()),
        signature: createSig
      },
      logger
    })

    // 2. After confirmation, create reward pool using deterministic keys
    const mint = new PublicKey(mintPublicKey)

    const manager = deriveKeypair('manager', mint)
    const rewardManager = deriveKeypair('reward-manager', mint)

    logger.info({
      message: 'Derived reward pool accounts',
      mint: mint.toBase58(),
      manager: manager.publicKey.toBase58(),
      rewardManager: rewardManager.publicKey.toBase58()
    })

    // Pick a random fee payer
    const { solanaFeePayerWallets } = config
    const index = Math.floor(Math.random() * solanaFeePayerWallets.length)
    const feePayer = solanaFeePayerWallets[index]
    const tokenAccount = Keypair.generate()

    const rewardPoolInstructions = await createRewardPool({
      connection,
      feePayer,
      manager,
      rewardManager,
      tokenAccount,
      mint
    })
    const rewardPoolRecentBlockhash = await connection.getLatestBlockhash()
    const rewardPoolMessage = new TransactionMessage({
      recentBlockhash: rewardPoolRecentBlockhash.blockhash,
      instructions: rewardPoolInstructions,
      payerKey: feePayer.publicKey
    })
    const rewardPoolTransaction = new VersionedTransaction(
      rewardPoolMessage.compileToV0Message()
    )
    rewardPoolTransaction.sign([feePayer, manager, rewardManager, tokenAccount])
    const base64tx = Buffer.from(rewardPoolTransaction.serialize()).toString(
      'base64'
    )
    logger.info({
      message: 'Reward pool transaction',
      base64tx
    })
    const rewardSig = bs58.encode(rewardPoolTransaction.signatures[0])
    await sendTransactionWithRetries({
      transaction: rewardPoolTransaction,
      commitment: 'confirmed',
      sendOptions: {
        skipPreflight: true
      },
      confirmationStrategy: {
        ...rewardPoolRecentBlockhash,
        signature: rewardSig
      },
      logger
    })

    // 3. Send the user's first buy transaction if provided
    let swapSig: string | undefined
    if (swapTransaction) {
      swapSig = bs58.encode(swapTransaction.signatures[0])
      await sendTransactionWithRetries({
        transaction: swapTransaction,
        commitment: 'confirmed',
        sendOptions: {
          skipPreflight: true
        },
        confirmationStrategy: {
          ...(await connection.getLatestBlockhash()),
          signature: swapSig
        },
        logger
      })
    }

    const dbcPool = deriveDbcPoolAddress(
      new PublicKey(AUDIO_MINT),
      new PublicKey(mintPublicKey),
      new PublicKey(configPublicKey)
    )
    return res.status(200).send({
      dbcPool,
      createSignature: createSig,
      rewardPoolSignature: rewardSig,
      firstBuySignature: swapSig
    })
  } catch (e) {
    logger.error('Error confirming launch coin')
    logger.error(e)
    res.status(500).send()
  }
}
