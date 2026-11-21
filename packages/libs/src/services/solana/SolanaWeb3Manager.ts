import { PaymentRouterProgram } from '@audius/spl'
import * as splToken from '@solana/spl-token'
import {
  TOKEN_PROGRAM_ID,
  createTransferCheckedInstruction
} from '@solana/spl-token'
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  Transaction,
  ComputeBudgetProgram
} from '@solana/web3.js'
import * as solanaWeb3 from '@solana/web3.js'
import BN from 'bn.js'
import { sample } from 'lodash'

import { AUDIO_DECIMALS, USDC_DECIMALS, WAUDIO_DECIMALS } from '../../constants'
import { Logger, Nullable, Utils } from '../../utils'
import type { IdentityService } from '../identity'
import type { Web3Manager } from '../web3Manager'

import { SolanaUtils } from './SolanaUtils'
import {
  submitAttestations,
  evaluateAttestations,
  createSender,
  deriveSolanaSenderFromEthAddress,
  SubmitAttestationsConfig as SubmitAttestationsBaseConfig,
  CreateSenderParams as CreateSenderBaseParams
} from './rewards'
import {
  createAssociatedTokenAccount,
  getTokenAccountInfo,
  findAssociatedTokenAddress
} from './tokenAccount'
import { TransactionHandler } from './transactionHandler'
import { createTransferInstructions, transferWAudioBalance } from './transfer'
import { getBankAccountAddress, createUserBankFrom } from './userBank'
import { wAudioFromWeiAudio } from './wAudio'

type EvaluateChallengeAttestationsConfig = {
  challengeId: string
  specifier: string
  recipientEthAddress: string
  oracleEthAddress: string
  tokenAmount: BN
  logger: Logger
}

type SubmitAttestationsConfig = Omit<
  SubmitAttestationsBaseConfig,
  | 'rewardManagerProgramId'
  | 'rewardManagerAccount'
  | 'rewardManagerTokenSource'
  | 'userBankProgramAccount'
  | 'feePayer'
  | 'transactionHandler'
> & { feePayerOverride: Nullable<string> }

type CreateSenderParams = Omit<
  CreateSenderBaseParams,
  | 'rewardManagerProgramId'
  | 'rewardManagerAccount'
  | 'feePayer'
  | 'transactionHandler'
  | 'identityService'
> & { feePayerOverride: Nullable<string> }

export type MintName = 'usdc' | 'audio'
export const DEFAULT_MINT: MintName = 'audio'
export type PurchaseContentType = 'track' | 'album'
export type PurchaseAccess = 'stream' | 'download'

const MEMO_PROGRAM_ID = new PublicKey(
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo'
)

const ZERO_SOL_EPSILON = 0.005
const SOL_PER_LAMPORT = 0.000000001

const DEFAULT_CONNECTION_CONFIRMATION_TIMEOUT_MS = 180 * 1000

export type SolanaWeb3Config = {
  solanaClusterEndpoint: string
  mintAddress: string
  usdcMintAddress: string
  solanaTokenAddress: string
  feePayerAddress: PublicKey
  claimableTokenProgramAddress: string
  rewardsManagerProgramId: string
  rewardsManagerProgramPDA: string
  rewardsManagerTokenPDA: string
  paymentRouterProgramId: string
  useRelay: boolean
  feePayerKeypairs?: Keypair[]
  confirmationTimeout: number
}

export class SolanaWeb3Manager {
  solanaWeb3Config: SolanaWeb3Config
  identityService: Nullable<IdentityService>
  web3Manager: Nullable<Web3Manager>
  solanaWeb3: typeof solanaWeb3
  splToken: typeof splToken
  solanaClusterEndpoint!: string
  transactionHandler!: TransactionHandler
  connections!: Connection[]
  mints!: Record<MintName, PublicKey>
  claimableTokenPDAs!: Record<MintName, PublicKey>
  solanaTokenAddress!: string
  solanaTokenKey!: PublicKey
  feePayerAddress!: PublicKey
  feePayerKey!: PublicKey
  claimableTokenProgramKey!: PublicKey
  rewardManagerProgramId!: PublicKey
  rewardManagerProgramPDA!: PublicKey
  rewardManagerTokenPDA!: PublicKey
  paymentRouterProgramId!: PublicKey

  constructor(
    solanaWeb3Config: SolanaWeb3Config,
    identityService: Nullable<IdentityService>,
    web3Manager: Nullable<Web3Manager>
  ) {
    this.solanaWeb3Config = solanaWeb3Config
    this.identityService = identityService
    this.web3Manager = web3Manager

    this.solanaWeb3 = solanaWeb3
    this.splToken = splToken
  }

  getConnection() {
    const connection = sample(this.connections)
    if (!connection) {
      throw new Error('No connections')
    }
    return connection
  }

  async init() {
    const {
      solanaClusterEndpoint,
      mintAddress,
      usdcMintAddress,
      solanaTokenAddress,
      feePayerAddress,
      claimableTokenProgramAddress,
      rewardsManagerProgramId,
      rewardsManagerProgramPDA,
      rewardsManagerTokenPDA,
      paymentRouterProgramId,
      useRelay,
      feePayerKeypairs,
      confirmationTimeout
    } = this.solanaWeb3Config

    this.solanaClusterEndpoint = solanaClusterEndpoint

    this.connections = []
    for (const endpoint of this.solanaClusterEndpoint.split(',')) {
      this.connections.push(
        new Connection(endpoint, {
          confirmTransactionInitialTimeout:
            confirmationTimeout || DEFAULT_CONNECTION_CONFIRMATION_TIMEOUT_MS
        })
      )
    }

    this.transactionHandler = new TransactionHandler({
      connection: this.getConnection(),
      useRelay,
      identityService: this.identityService,
      feePayerKeypairs,
      fallbackConnections: this.connections
    })

    this.mints = {
      audio: SolanaUtils.newPublicKeyNullable(mintAddress),
      usdc: SolanaUtils.newPublicKeyNullable(usdcMintAddress)
    }

    this.solanaTokenAddress = solanaTokenAddress
    this.solanaTokenKey = SolanaUtils.newPublicKeyNullable(solanaTokenAddress)

    if (feePayerAddress) {
      this.feePayerAddress = feePayerAddress
      this.feePayerKey = SolanaUtils.newPublicKeyNullable(feePayerAddress)
    } else if (feePayerKeypairs?.length) {
      this.feePayerAddress = feePayerKeypairs[0]!.publicKey
      this.feePayerKey = SolanaUtils.newPublicKeyNullable(
        feePayerKeypairs[0]?.publicKey as unknown as string
      )
    }

    this.claimableTokenProgramKey = SolanaUtils.newPublicKeyNullable(
      claimableTokenProgramAddress
    )
    const audioPDA = (
      this.claimableTokenProgramKey
        ? (
            await SolanaUtils.findProgramAddressFromPubkey(
              this.claimableTokenProgramKey,
              this.mints.audio
            )
          )[0].toString()
        : null
    ) as string

    const usdcPDA = this.claimableTokenProgramKey
      ? (
          await SolanaUtils.findProgramAddressFromPubkey(
            this.claimableTokenProgramKey,
            this.mints.usdc
          )
        )[0].toString()
      : ''

    this.claimableTokenPDAs = {
      audio: SolanaUtils.newPublicKeyNullable(audioPDA),
      usdc: SolanaUtils.newPublicKeyNullable(usdcPDA)
    }

    this.rewardManagerProgramId = SolanaUtils.newPublicKeyNullable(
      rewardsManagerProgramId
    )
    this.rewardManagerProgramPDA = SolanaUtils.newPublicKeyNullable(
      rewardsManagerProgramPDA
    )
    this.rewardManagerTokenPDA = SolanaUtils.newPublicKeyNullable(
      rewardsManagerTokenPDA
    )
    this.paymentRouterProgramId = SolanaUtils.newPublicKeyNullable(
      paymentRouterProgramId
    )
  }

  async doesUserbankExist({
    ethAddress,
    mint = DEFAULT_MINT
  }: {
    ethAddress?: string
    mint?: MintName
  } = {}) {
    const userbank = await this.deriveUserBank({ ethAddress, mint })
    const tokenAccount = await this.getTokenAccountInfo(userbank.toString())
    return !!tokenAccount
  }

  async createUserBank({
    feePayerOverride,
    ethAddress,
    mint = DEFAULT_MINT
  }: {
    feePayerOverride: string
    ethAddress?: string
    mint: MintName
  }) {
    if (!this.web3Manager) {
      throw new Error(
        'A web3Manager is required for this solanaWeb3Manager method'
      )
    }

    return await createUserBankFrom({
      ethAddress: ethAddress ?? this.web3Manager.getWalletAddress(),
      claimableTokenPDAKey: this.claimableTokenPDAs[mint],
      feePayerKey:
        SolanaUtils.newPublicKeyNullable(feePayerOverride) || this.feePayerKey,
      mintKey: this.mints[mint],
      solanaTokenProgramKey: this.solanaTokenKey,
      claimableTokenProgramKey: this.claimableTokenProgramKey,
      transactionHandler: this.transactionHandler
    })
  }

  async createUserBankIfNeeded({
    feePayerOverride,
    ethAddress,
    mint = DEFAULT_MINT
  }: {
    feePayerOverride: string
    ethAddress?: string
    mint?: MintName
  }): Promise<
    | { error: string; errorCode: string | number | null }
    | {
        didExist: boolean
        userbank: PublicKey
      }
  > {
    const didExist = await this.doesUserbankExist({ ethAddress, mint })
    if (!didExist) {
      const response = await this.createUserBank({
        feePayerOverride,
        ethAddress,
        mint
      })
      if (response.error) {
        return {
          error: response.error,
          errorCode: response.errorCode
        }
      }
    }

    const derived = await this.deriveUserBank({ ethAddress, mint })
    return { userbank: derived, didExist }
  }

  async createAssociatedTokenAccount(
    solanaAddress: string,
    mint: MintName = DEFAULT_MINT
  ) {
    await createAssociatedTokenAccount({
      feePayerKey: this.feePayerKey,
      solanaWalletKey: new PublicKey(solanaAddress),
      mintKey: this.mints[mint],
      solanaTokenProgramKey: this.solanaTokenKey,
      connection: this.getConnection(),
      identityService: this.identityService
    })
  }

  async findAssociatedTokenAddress(
    solanaAddress: string,
    mint: MintName = DEFAULT_MINT
  ) {
    return await findAssociatedTokenAddress({
      solanaWalletKey: new PublicKey(solanaAddress),
      mintKey: this.mints[mint],
      solanaTokenProgramKey: this.solanaTokenKey
    })
  }

  async deriveUserBank({
    ethAddress,
    mint = DEFAULT_MINT
  }: {
    ethAddress?: string
    mint?: MintName
  } = {}) {
    if (!ethAddress && !this.web3Manager) {
      throw new Error(
        'A web3Manager is required for this solanaWeb3Manager method'
      )
    }

    const derivationSourceAddress =
      ethAddress ?? this.web3Manager!.getWalletAddress()

    const bank = await getBankAccountAddress(
      derivationSourceAddress,
      this.claimableTokenPDAs[mint],
      this.solanaTokenKey
    )
    return bank
  }

  async getTokenAccountInfo(
    solanaAddress: string,
    commitment?: solanaWeb3.Commitment
  ) {
    try {
      const res = await getTokenAccountInfo({
        tokenAccountAddressKey: new PublicKey(solanaAddress),
        connection: this.getConnection(),
        commitment
      })
      return res
    } catch (e) {
      return null
    }
  }

  async getWAudioBalance(solanaAddress: string | PublicKey) {
    const pubkey = new PublicKey(solanaAddress)
    try {
      const account = await this.getConnection().getAccountInfo(pubkey)
      let tokenAccount = null
      if (account && account.owner.equals(TOKEN_PROGRAM_ID)) {
        console.debug('Found token account', pubkey.toBase58())
        tokenAccount = splToken.unpackAccount(pubkey, account)
      } else if (
        !account ||
        account.owner.equals(solanaWeb3.SystemProgram.programId)
      ) {
        console.debug('Getting associated token account for', pubkey.toBase58())
        const tokenAccountAddress = splToken.getAssociatedTokenAddressSync(
          this.mints.audio,
          pubkey,
          true
        )
        tokenAccount = await splToken.getAccount(
          this.getConnection(),
          tokenAccountAddress
        )
      }

      if (tokenAccount) {
        if (!tokenAccount.mint.equals(this.mints.audio)) {
          throw new Error(
            `Invalid mint for wAudio token account for ${pubkey.toBase58()}: Expected ${this.mints.audio.toBase58()} found ${tokenAccount.mint.toBase58()}`
          )
        }
        const decimals = AUDIO_DECIMALS - WAUDIO_DECIMALS
        return tokenAccount.amount * BigInt('1'.padEnd(decimals + 1, '0'))
      } else {
        console.debug('No token accounts found for', solanaAddress)
        return BigInt(0)
      }
    } catch (e) {
      if (e instanceof splToken.TokenAccountNotFoundError) {
        console.debug('Token account does not exist', pubkey.toBase58(), e)
        return BigInt(0)
      }
      console.error('getWAudioBalance Error:', e)
      return null
    }
  }

  async transferWAudio(recipientSolanaAddress: string, amount: BN) {
    if (!this.web3Manager) {
      throw new Error(
        'A web3Manager is required for this solanaWeb3Manager method'
      )
    }

    let tokenAccountInfo = await this.getTokenAccountInfo(
      recipientSolanaAddress
    )
    if (!tokenAccountInfo) {
      console.info('Provided recipient solana address was not a token account')
      const associatedTokenAccount = await this.findAssociatedTokenAddress(
        recipientSolanaAddress
      )
      tokenAccountInfo = await this.getTokenAccountInfo(
        associatedTokenAccount.toString()
      )

      if (!tokenAccountInfo) {
        console.info(
          'Provided recipient solana address has no associated token account, creating'
        )
        await this.createAssociatedTokenAccount(recipientSolanaAddress)
      }
      recipientSolanaAddress = associatedTokenAccount.toString()
    }

    console.info(
      `Transfering ${amount.toString()} wei $AUDIO to ${recipientSolanaAddress}`
    )

    const wAudioAmount = wAudioFromWeiAudio(amount)

    const ethAddress = this.web3Manager.getWalletAddress()
    const senderSolanaAddress = await getBankAccountAddress(
      ethAddress,
      this.claimableTokenPDAs.audio,
      this.solanaTokenKey
    )
    return await transferWAudioBalance({
      amount: wAudioAmount,
      senderEthAddress: ethAddress,
      feePayerKey: this.feePayerKey,
      senderEthPrivateKey:
        this.web3Manager.getOwnerWalletPrivateKey() as unknown as string,
      senderSolanaAddress,
      recipientSolanaAddress,
      claimableTokenPDA: this.claimableTokenPDAs.audio,
      solanaTokenProgramKey: this.solanaTokenKey,
      claimableTokenProgramKey: this.claimableTokenProgramKey,
      connection: this.getConnection(),
      mintKey: this.mints.audio,
      transactionHandler: this.transactionHandler
    })
  }

  async purchaseContent({
    id,
    type,
    blocknumber,
    extraAmount = 0,
    splits,
    purchaserUserId,
    purchaseAccess
  }: {
    id: number
    type: PurchaseContentType
    splits: Record<string, number | BN>
    extraAmount?: number | BN
    blocknumber: number
    purchaserUserId: number
    purchaseAccess: PurchaseAccess
  }) {
    if (!this.web3Manager) {
      throw new Error(
        'A web3Manager is required for this solanaWeb3Manager method'
      )
    }
    if (Object.values(splits).length !== 1) {
      throw new Error(
        'Purchasing content only supports a single split. Specifying more splits coming soon!'
      )
    }

    const totalAmount = Object.values(splits).reduce<BN>(
      (sum, split) => (split instanceof BN ? sum.add(split) : sum.addn(split)),
      extraAmount instanceof BN ? extraAmount : new BN(extraAmount)
    )

    const senderEthAddress = this.web3Manager.getWalletAddress()
    const senderSolanaAddress = await getBankAccountAddress(
      senderEthAddress,
      this.claimableTokenPDAs.usdc,
      this.solanaTokenKey
    )

    const instructions = await createTransferInstructions({
      amount: totalAmount,
      feePayerKey: this.feePayerKey,
      senderEthAddress,
      senderEthPrivateKey:
        this.web3Manager.getOwnerWalletPrivateKey() as unknown as string,
      senderSolanaAddress,
      recipientSolanaAddress: Object.keys(splits)[0]!,
      claimableTokenPDA: this.claimableTokenPDAs.usdc,
      solanaTokenProgramKey: this.solanaTokenKey,
      claimableTokenProgramKey: this.claimableTokenProgramKey,
      connection: this.getConnection(),
      mintKey: this.mints.usdc
    })

    const data = `${type}:${id}:${blocknumber}:${purchaserUserId}:${purchaseAccess}`

    const memoInstruction = new TransactionInstruction({
      keys: [
        {
          pubkey: new PublicKey(this.feePayerKey),
          isSigner: true,
          isWritable: true
        }
      ],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(data)
    })

    return await this.transactionHandler.handleTransaction({
      instructions: [
        ...instructions,
        memoInstruction,
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 100000
        })
      ],
      skipPreflight: true,
      feePayerOverride: this.feePayerKey
    })
  }

  async getPurchaseContentWithPaymentRouterInstructions({
    id,
    type,
    blocknumber,
    extraAmount = 0,
    splits,
    purchaserUserId,
    senderAccount,
    purchaseAccess
  }: {
    id: number
    type: PurchaseContentType
    splits: Record<string, number | BN>
    extraAmount?: number | BN
    blocknumber: number
    purchaserUserId: number
    senderAccount: PublicKey
    purchaseAccess: PurchaseAccess
  }) {
    if (!this.web3Manager) {
      throw new Error(
        'A web3Manager is required for this solanaWeb3Manager method'
      )
    }
    if (Object.values(splits).length !== 1) {
      throw new Error(
        'Purchasing content only supports a single split. Specifying more splits coming soon!'
      )
    }

    const recipientAmounts: Record<string, bigint> = Object.entries(
      splits
    ).reduce(
      (acc, [key, value]) => {
        acc[key] =
          (value instanceof BN ? BigInt(value.toString()) : BigInt(value)) +
          (extraAmount instanceof BN
            ? BigInt(extraAmount.toString())
            : BigInt(extraAmount))
        return acc
      },
      {} as Record<string, bigint>
    )

    const [paymentRouterPda, paymentRouterPdaBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from('payment_router')],
        this.paymentRouterProgramId
      )

    const paymentRouterTokenAccount = await this.findAssociatedTokenAddress(
      paymentRouterPda.toString(),
      'usdc'
    )
    const paymentRouterTokenAccountInfo = this.getTokenAccountInfo(
      paymentRouterTokenAccount.toString()
    )
    if (paymentRouterTokenAccountInfo === null) {
      throw new Error('Payment Router balance PDA token account does not exist')
    }

    const senderTokenAccount = await this.findAssociatedTokenAddress(
      senderAccount.toString(),
      'usdc'
    )

    const amounts = Object.values(recipientAmounts)
    const totalAmount = amounts.reduce(
      (acc, current) => acc + current,
      BigInt(0)
    )

    const transferInstruction = createTransferCheckedInstruction(
      senderTokenAccount,
      this.mints.usdc,
      paymentRouterTokenAccount,
      senderAccount,
      Number(totalAmount),
      USDC_DECIMALS
    )

    const paymentRouterInstruction =
      await PaymentRouterProgram.createRouteInstruction({
        sender: paymentRouterTokenAccount,
        senderOwner: paymentRouterPda,
        paymentRouterPdaBump,
        recipients: Object.keys(recipientAmounts).map(
          (key) => new PublicKey(key)
        ),
        amounts,
        totalAmount,
        tokenProgramId: TOKEN_PROGRAM_ID,
        programId: this.paymentRouterProgramId
      })

    const data = `${type}:${id}:${blocknumber}:${purchaserUserId}:${purchaseAccess}`

    const memoInstruction = new TransactionInstruction({
      keys: [
        {
          pubkey: senderAccount,
          isSigner: true,
          isWritable: true
        }
      ],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(data)
    })

    const instructions = [
      transferInstruction,
      paymentRouterInstruction,
      memoInstruction,
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 100000
      })
    ]
    return instructions
  }

  async purchaseContentWithPaymentRouter({
    id,
    type,
    blocknumber,
    extraAmount = 0,
    splits,
    purchaserUserId,
    senderKeypair,
    skipSendAndReturnTransaction,
    purchaseAccess
  }: {
    id: number
    type: PurchaseContentType
    splits: Record<string, number | BN>
    extraAmount?: number | BN
    blocknumber: number
    purchaserUserId: number
    senderKeypair: Keypair
    skipSendAndReturnTransaction?: boolean
    purchaseAccess: PurchaseAccess
  }) {
    const instructions =
      await this.getPurchaseContentWithPaymentRouterInstructions({
        id,
        type,
        blocknumber,
        extraAmount,
        splits,
        purchaserUserId,
        senderAccount: senderKeypair.publicKey,
        purchaseAccess
      })
    const recentBlockhash = (await this.getConnection().getLatestBlockhash())
      .blockhash

    const transaction = new Transaction({
      feePayer: this.feePayerKey,
      recentBlockhash
    }).add(...instructions)
    transaction.partialSign(senderKeypair)
    if (skipSendAndReturnTransaction) {
      return transaction
    }
    const signatures = transaction.signatures
      .filter((s) => s.signature !== null)
      .map((s) => ({
        signature: s.signature!, // safe from filter
        publicKey: s.publicKey.toString()
      }))

    return await this.transactionHandler.handleTransaction({
      instructions,
      skipPreflight: true,
      feePayerOverride: this.feePayerKey,
      signatures,
      recentBlockhash
    })
  }

  async submitChallengeAttestations({
    attestations,
    oracleAttestation,
    challengeId,
    specifier,
    recipientEthAddress,
    tokenAmount,
    instructionsPerTransaction,
    logger = console,
    feePayerOverride = null
  }: SubmitAttestationsConfig) {
    return await submitAttestations({
      rewardManagerProgramId: this.rewardManagerProgramId,
      rewardManagerAccount: this.rewardManagerProgramPDA,
      attestations,
      oracleAttestation,
      challengeId,
      specifier,
      feePayer:
        SolanaUtils.newPublicKeyNullable(feePayerOverride) ?? this.feePayerKey,
      recipientEthAddress,
      tokenAmount,
      transactionHandler: this.transactionHandler,
      instructionsPerTransaction,
      logger
    })
  }

  async evaluateChallengeAttestations({
    challengeId,
    specifier,
    recipientEthAddress,
    oracleEthAddress,
    tokenAmount,
    logger = console,
    feePayerOverride = null
  }: EvaluateChallengeAttestationsConfig & {
    feePayerOverride: Nullable<string>
  }) {
    return await evaluateAttestations({
      rewardManagerProgramId: this.rewardManagerProgramId,
      rewardManagerAccount: this.rewardManagerProgramPDA,
      rewardManagerTokenSource: this.rewardManagerTokenPDA,
      challengeId,
      specifier,
      recipientEthAddress,
      userBankProgramAccount: this.claimableTokenPDAs.audio,
      oracleEthAddress,
      feePayer:
        SolanaUtils.newPublicKeyNullable(feePayerOverride) ?? this.feePayerKey,
      tokenAmount,
      transactionHandler: this.transactionHandler,
      logger
    })
  }

  async createSender({
    senderEthAddress,
    operatorEthAddress,
    attestations,
    feePayerOverride = null
  }: CreateSenderParams) {
    return await createSender({
      rewardManagerProgramId: this.rewardManagerProgramId,
      rewardManagerAccount: this.rewardManagerProgramPDA,
      senderEthAddress,
      feePayer:
        SolanaUtils.newPublicKeyNullable(feePayerOverride) ?? this.feePayerKey,
      operatorEthAddress,
      attestations,
      identityService: this.identityService,
      transactionHandler: this.transactionHandler
    })
  }

  async getBalance({ publicKey }: { publicKey: PublicKey }) {
    const lamports = await this.getConnection().getBalance(publicKey)
    return lamports * SOL_PER_LAMPORT
  }

  async hasBalance({
    publicKey,
    epsilon = ZERO_SOL_EPSILON
  }: {
    publicKey: PublicKey
    epsilon?: number
  }) {
    const balance = await this.getBalance({ publicKey })
    return balance > epsilon
  }

  async getSolBalance(address: string) {
    const publicKey = new PublicKey(address)
    const balance = await this.getBalance({ publicKey })
    const balanceBN = Utils.toBN(balance * LAMPORTS_PER_SOL)
    return balanceBN
  }

  async getSlot() {
    return await this.getConnection().getSlot('processed')
  }

  async getRandomFeePayer() {
    return await this.identityService?.getRandomFeePayer()
  }

  async getIsDiscoveryNodeRegistered(senderEthAddress: string) {
    const derivedSenderSolanaAddress = await deriveSolanaSenderFromEthAddress(
      senderEthAddress,
      this.rewardManagerProgramId,
      this.rewardManagerProgramPDA
    )

    const res = await this.getConnection().getAccountInfo(
      derivedSenderSolanaAddress
    )
    return !!res
  }

  async findProgramAddress(programId: PublicKey, pubkey: PublicKey) {
    return await PublicKey.findProgramAddress(
      [pubkey.toBytes().slice(0, 32)],
      programId
    )
  }

  async findDerivedAddress(
    programId: PublicKey,
    base: PublicKey,
    seed: Buffer | Uint8Array
  ) {
    return await PublicKey.findProgramAddress(
      [base.toBytes().slice(0, 32), seed],
      programId
    )
  }

  async findDerivedPair(
    programId: PublicKey,
    adminAccount: PublicKey,
    seed: Buffer | Uint8Array
  ) {
    programId = SolanaUtils.newPublicKeyNullable(programId)
    adminAccount = SolanaUtils.newPublicKeyNullable(adminAccount)

    const [baseAuthorityAccount] = await this.findProgramAddress(
      programId,
      adminAccount
    )
    const derivedAddressInfo = await this.findDerivedAddress(
      programId,
      baseAuthorityAccount,
      seed
    )

    const derivedAddress = derivedAddressInfo[0]
    const bumpSeed = derivedAddressInfo[1]

    return { baseAuthorityAccount, derivedAddress, bumpSeed }
  }

  async deriveEthWalletFromAddress(accountEthAddress: Buffer) {
    let encodedEthAddress = Buffer.from(accountEthAddress).toString('hex')

    if (!encodedEthAddress.startsWith('0x')) {
      encodedEthAddress = '0x' + encodedEthAddress
    }

    return encodedEthAddress
  }

  async createTransferInstructionsFromCurrentUser({
    amount,
    feePayerKey,
    senderSolanaAddress,
    recipientSolanaAddress,
    mint = DEFAULT_MINT,
    instructionIndex = 0
  }: {
    amount: BN
    senderSolanaAddress: PublicKey
    recipientSolanaAddress: string
    mint: MintName
    feePayerKey: PublicKey
    instructionIndex?: number
  }) {
    const instructions = await createTransferInstructions({
      amount,
      feePayerKey,
      senderEthAddress: this.web3Manager?.getWalletAddress(),
      senderEthPrivateKey:
        this.web3Manager!.getOwnerWalletPrivateKey() as unknown as string,
      senderSolanaAddress,
      recipientSolanaAddress,
      claimableTokenPDA: this.claimableTokenPDAs[mint],
      solanaTokenProgramKey: this.solanaTokenKey,
      claimableTokenProgramKey: this.claimableTokenProgramKey,
      connection: this.getConnection(),
      mintKey: this.mints[mint],
      instructionIndex
    })
    return [
      ...instructions,
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 100000
      })
    ]
  }
}
