import { ClaimableTokensProgram } from '@audius/spl'
import {
  TransactionMessage,
  VersionedTransaction,
  Secp256k1Program,
  PublicKey
} from '@solana/web3.js'

import { productionConfig } from '../../../../config/production'
import { mergeConfigWithDefaults } from '../../../../utils/mergeConfigs'
import { mintFixedDecimalMap } from '../../../../utils/mintFixedDecimalMap'
import { parseParams } from '../../../../utils/parseParams'
import type { Mint } from '../../types'
import { BaseSolanaProgramClient } from '../BaseSolanaProgramClient'

import { getDefaultClaimableTokensConfig } from './getDefaultConfig'
import {
  type GetOrCreateUserBankRequest,
  GetOrCreateUserBankSchema,
  type DeriveUserBankRequest,
  type CreateTransferRequest,
  CreateTransferSchema,
  type CreateSecpRequest,
  CreateSecpSchema,
  ClaimableTokensConfig
} from './types'

/**
 * Connected client to the ClaimableTokens Solana program.
 *
 * The ClaimableTokens program is responsible for creation of program-owned
 * associated token accounts that are permissioned to users by their Ethereum
 * hedgehog wallet private keys.
 */
export class ClaimableTokensClient extends BaseSolanaProgramClient {
  /** The program ID of the ClaimableTokensProgram instance. */
  private readonly programId: PublicKey
  /** Map from token mint name to public key address. */
  private readonly mints: Record<Mint, PublicKey>
  /** Map from token mint name to derived user bank authority. */
  private readonly authorities: Record<Mint, PublicKey>

  constructor(config: ClaimableTokensConfig) {
    const configWithDefaults = mergeConfigWithDefaults(
      config,
      getDefaultClaimableTokensConfig(productionConfig)
    )
    super(configWithDefaults, config.solanaWalletAdapter)
    this.programId = configWithDefaults.programId
    this.mints = configWithDefaults.mints
    this.authorities = {
      wAUDIO: ClaimableTokensProgram.deriveAuthority({
        programId: configWithDefaults.programId,
        mint: configWithDefaults.mints.wAUDIO
      }),
      USDC: ClaimableTokensProgram.deriveAuthority({
        programId: configWithDefaults.programId,
        mint: configWithDefaults.mints.USDC
      })
    }
  }

  /**
   * Creates a user bank or returns the existing user bank for a user.
   */
  async getOrCreateUserBank(params: GetOrCreateUserBankRequest) {
    const args = await parseParams(
      'getOrCreateUserBank',
      GetOrCreateUserBankSchema
    )(params)
    const { ethWallet, mint, feePayer: feePayerOverride } = args
    console.log('asdf getFeePayer: ', new Date())

    const feePayer = feePayerOverride ?? (await this.getFeePayer())
    const userBank = await this.deriveUserBank(args)
    const userBankAccount = await this.connection.getAccountInfo(userBank)
    if (!userBankAccount) {
      const createUserBankInstruction =
        ClaimableTokensProgram.createAccountInstruction({
          ethAddress: ethWallet,
          payer: feePayer,
          mint: this.mints[mint],
          authority: this.authorities[mint],
          userBank,
          programId: this.programId
        })
      const confirmationStrategyArgs =
        await this.connection.getLatestBlockhash()
      const message = new TransactionMessage({
        payerKey: feePayer,
        recentBlockhash: confirmationStrategyArgs.blockhash,
        instructions: [createUserBankInstruction]
      }).compileToLegacyMessage()
      const transaction = new VersionedTransaction(message)
      const signature = await this.wallet.sendTransaction(
        transaction,
        this.connection
      )
      const confirmationStrategy = { ...confirmationStrategyArgs, signature }
      await this.connection.confirmTransaction(
        confirmationStrategy,
        'finalized'
      )
      return { userBank, didExist: false }
    }
    return { userBank, didExist: true }
  }

  /**
   * Creates a claimable tokens program transfer instruction using configured
   * program ID, mint addresses, derived nonce, and derived authorities.
   *
   * Must be paired with a matching Secp256k1 instruction.
   * @see {@link createTransferSecpInstruction}
   */
  async createTransferInstruction(params: CreateTransferRequest) {
    const {
      feePayer: feePayerOverride,
      ethWallet,
      mint,
      destination
    } = await parseParams(
      'createTransferInstruction',
      CreateTransferSchema
    )(params)
    const feePayer = feePayerOverride ?? (await this.getFeePayer())
    const source = await this.deriveUserBank({ ethWallet, mint })
    const nonceKey = ClaimableTokensProgram.deriveNonce({
      ethAddress: ethWallet,
      authority: this.authorities[mint],
      programId: this.programId
    })
    return ClaimableTokensProgram.createTransferInstruction({
      payer: feePayer,
      sourceEthAddress: ethWallet,
      sourceUserBank: source,
      destination,
      nonceAccount: nonceKey,
      authority: this.authorities[mint],
      programId: this.programId
    })
  }

  /**
   * Creates a signed Secp256k1 instruction for a claimable tokens transfer
   * using configured program ID, derived nonce, and derived authorities.
   *
   * @see {@link createTransferInstruction}
   */
  async createTransferSecpInstruction(params: CreateSecpRequest) {
    const { ethWallet, destination, amount, mint, instructionIndex, auth } =
      await parseParams(
        'createTransferSecpInstruction',
        CreateSecpSchema
      )(params)

    let nonce = BigInt(0)
    const nonceKey = ClaimableTokensProgram.deriveNonce({
      ethAddress: ethWallet,
      authority: this.authorities[mint],
      programId: this.programId
    })
    const nonceAccount = await this.connection.getAccountInfo(nonceKey)
    const encodedNonceData = nonceAccount?.data
    if (encodedNonceData) {
      const nonceData =
        ClaimableTokensProgram.layouts.nonceAccountData.decode(encodedNonceData)
      nonce = nonceData.nonce
    }
    const data = ClaimableTokensProgram.createSignedTransferInstructionData({
      destination,
      amount: mintFixedDecimalMap[mint](amount).value,
      nonce
    })
    const [signature, recoveryId] = await auth.sign(data)
    return Secp256k1Program.createInstructionWithEthAddress({
      ethAddress: ethWallet,
      message: data,
      signature,
      recoveryId,
      instructionIndex
    })
  }

  /**
   * Derives the user bank of a user from their Ethereum wallet and the token mint.
   *
   * Use {@link getOrCreateUserBank} instead if you want to ensure the userBank exists.
   */
  public async deriveUserBank(params: DeriveUserBankRequest) {
    const { ethWallet, mint } = await parseParams(
      'deriveUserBank',
      GetOrCreateUserBankSchema
    )(params)
    return await ClaimableTokensProgram.deriveUserBank({
      ethAddress: ethWallet,
      claimableTokensPDA: this.authorities[mint]
    })
  }
}
