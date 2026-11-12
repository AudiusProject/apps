import {
  RewardManagerInstruction,
  RewardManagerErrorCode,
  RewardManagerProgram,
  RewardManagerErrorMessages
} from '@audius/spl'
import type { RewardManagerStateData } from '@audius/spl/dist/types/reward-manager/types'
import { SendTransactionOptions } from '@solana/wallet-adapter-base'
import {
  Secp256k1Program,
  SendTransactionError,
  Transaction,
  VersionedTransaction,
  type PublicKey
} from '@solana/web3.js'

import { productionConfig } from '../../../../config/production'
import { mergeConfigWithDefaults } from '../../../../utils/mergeConfigs'
import { parseParams } from '../../../../utils/parseParams'
import type { LoggerService } from '../../../Logger'
import { CustomInstructionError } from '../CustomInstructionError'
import { SolanaClient } from '../SolanaClient'

import { getDefaultRewardManagerClentConfig } from './getDefaultConfig'
import {
  CreateEvaluateAttestationsInstructionRequest,
  CreateEvaluateAttestationsInstructionSchema,
  CreateSubmitAttestationInstructionSchema,
  type CreateSubmitAttestationRequest,
  type RewardManagerClientConfig,
  CreateSenderInstructionRequest,
  CreateSenderInstructionSchema,
  CreateSubmitAttestationSecpInstructionRequest,
  CreateSubmitAttestationSecpInstructionSchema,
  GetSubmittedAttestationsRequest,
  GetSubmittedAttestationsSchema
} from './types'

export class RewardManagerError extends Error {
  override name = 'RewardManagerError'
  public code: number
  public instructionName: string
  public customErrorName?: string
  constructor({
    code,
    instructionName,
    cause
  }: {
    code: number
    instructionName: string
    cause?: Error
  }) {
    super(
      RewardManagerErrorMessages[code as RewardManagerErrorCode] ??
        `Unknown error: ${code}`,
      { cause }
    )
    this.code = code
    this.instructionName = instructionName
    this.customErrorName = RewardManagerErrorCode[code]
  }
}

/**
 * Connected client to the Solana RewardManager program.
 *
 * The RewardManager program is in charge of disbursing the community awards
 * based on attestations from N uniquely owned validator nodes and an anti abuse
 * oracle node.
 */
export class RewardManagerClient {
  public readonly lookupTable: PublicKey

  private readonly client: SolanaClient
  private readonly programId: PublicKey
  private readonly rewardManagerStateAccount: PublicKey
  private readonly authority: PublicKey
  private rewardManagerState: RewardManagerStateData | null = null
  private readonly logger: LoggerService

  constructor(config: RewardManagerClientConfig) {
    const configWithDefaults = mergeConfigWithDefaults(
      config,
      getDefaultRewardManagerClentConfig(productionConfig)
    )
    this.lookupTable = configWithDefaults.rewardManagerLookupTable
    this.client = configWithDefaults.solanaClient
    this.programId = configWithDefaults.programId
    this.rewardManagerStateAccount = configWithDefaults.rewardManagerState
    this.authority = RewardManagerProgram.deriveAuthority({
      programId: configWithDefaults.programId,
      rewardManagerState: configWithDefaults.rewardManagerState
    })
    this.logger = configWithDefaults.logger.createPrefixedLogger(
      '[reward-manager-client]'
    )
  }

  public async createSenderInstruction(params: CreateSenderInstructionRequest) {
    const args = await parseParams(
      'createSenderInstruction',
      CreateSenderInstructionSchema
    )(params)
    const {
      manager,
      sender: senderEthAddress,
      operator: operatorEthAddress,
      feePayer: feePayerOverride
    } = args
    const feePayer = feePayerOverride ?? (await this.client.getFeePayer())
    const sender = RewardManagerProgram.deriveSender({
      ethAddress: senderEthAddress,
      programId: this.programId,
      authority: this.authority
    })

    return RewardManagerProgram.createSenderInstruction({
      operatorEthAddress,
      senderEthAddress,
      rewardManagerState: this.rewardManagerStateAccount,
      manager,
      authority: this.authority,
      payer: feePayer,
      sender,
      rewardManagerProgramId: this.programId
    })
  }

  public async createSubmitAttestationInstruction(
    params: CreateSubmitAttestationRequest
  ) {
    const args = await parseParams(
      'createSubmitAttestationInstruction',
      CreateSubmitAttestationInstructionSchema
    )(params)
    const {
      challengeId,
      specifier,
      senderEthAddress,
      feePayer: feePayerOverride
    } = args
    const disbursementId = this.makeDisbursementId(challengeId, specifier)
    const feePayer = feePayerOverride ?? (await this.client.getFeePayer())
    const sender = RewardManagerProgram.deriveSender({
      ethAddress: senderEthAddress,
      programId: this.programId,
      authority: this.authority
    })
    const attestations = RewardManagerProgram.deriveAttestations({
      disbursementId,
      programId: this.programId,
      authority: this.authority
    })
    return RewardManagerProgram.createSubmitAttestationInstruction({
      disbursementId,
      attestations,
      rewardManagerState: this.rewardManagerStateAccount,
      authority: this.authority,
      payer: feePayer,
      sender,
      rewardManagerProgramId: this.programId
    })
  }

  public async createSubmitAttestationSecpInstruction(
    params: CreateSubmitAttestationSecpInstructionRequest
  ) {
    const args = await parseParams(
      'createSubmitAttestationSecpInstruction',
      CreateSubmitAttestationSecpInstructionSchema
    )(params)
    const {
      recipientEthAddress,
      challengeId,
      specifier,
      amount,
      senderEthAddress,
      senderSignature,
      instructionIndex,
      antiAbuseOracleEthAddress
    } = args

    const disbursementId = this.makeDisbursementId(challengeId, specifier)
    const { signature, recoveryId } =
      RewardManagerProgram.encodeSignature(senderSignature)

    const data = RewardManagerProgram.encodeAttestation({
      disbursementId,
      recipientEthAddress,
      amount,
      antiAbuseOracleEthAddress
    })

    return Secp256k1Program.createInstructionWithEthAddress({
      ethAddress: senderEthAddress,
      message: data,
      signature,
      recoveryId,
      instructionIndex
    })
  }

  public async createEvaluateAttestationsInstruction(
    params: CreateEvaluateAttestationsInstructionRequest
  ) {
    const args = await parseParams(
      'createEvaluateAttestationsInstruction',
      CreateEvaluateAttestationsInstructionSchema
    )(params)
    const {
      challengeId,
      specifier,
      recipientEthAddress,
      destinationUserBank,
      antiAbuseOracleEthAddress,
      amount,
      feePayer: feePayerOverride
    } = args
    const disbursementId = this.makeDisbursementId(challengeId, specifier)
    const feePayer = feePayerOverride ?? (await this.client.getFeePayer())
    const state = await this.getRewardManagerState()
    const disbursementAccount = RewardManagerProgram.deriveDisbursement({
      disbursementId,
      programId: this.programId,
      authority: this.authority
    })
    const attestations = RewardManagerProgram.deriveAttestations({
      disbursementId,
      programId: this.programId,
      authority: this.authority
    })
    const antiAbuseOracle = RewardManagerProgram.deriveSender({
      ethAddress: antiAbuseOracleEthAddress,
      programId: this.programId,
      authority: this.authority
    })
    return RewardManagerProgram.createEvaluateAttestationsInstruction({
      disbursementId,
      recipientEthAddress,
      amount,
      attestations,
      rewardManagerState: this.rewardManagerStateAccount,
      authority: this.authority,
      rewardManagerTokenSource: state.tokenAccount,
      destinationUserBank,
      disbursementAccount,
      antiAbuseOracle,
      payer: feePayer,
      rewardManagerProgramId: this.programId
    })
  }

  public async getSubmittedAttestations(
    params: GetSubmittedAttestationsRequest
  ) {
    const args = await parseParams(
      'getSubmittedAttestations',
      GetSubmittedAttestationsSchema
    )(params)
    const { challengeId, specifier } = args
    const disbursementId = this.makeDisbursementId(challengeId, specifier)
    const attestationsAccount = RewardManagerProgram.deriveAttestations({
      disbursementId,
      programId: this.programId,
      authority: this.authority
    })
    const connection = await this.client.getConnection()
    const accountInfo = await connection.getAccountInfo(attestationsAccount)
    if (!accountInfo) {
      return null
    }
    const rewardManagerState = await this.getRewardManagerState()
    // Min Votes = discovery votes, +1 for AAO oracle
    const maxAttestations = rewardManagerState.minVotes + 1
    return RewardManagerProgram.decodeAttestationsAccountData(
      maxAttestations,
      accountInfo.data
    )
  }

  private makeDisbursementId(challengeId: string, specifier: string) {
    return `${challengeId}:${specifier}`
  }

  public async getRewardManagerState() {
    if (!this.rewardManagerState) {
      const connection = await this.client.getConnection()
      const state = await connection.getAccountInfo(
        this.rewardManagerStateAccount
      )
      if (state) {
        this.rewardManagerState = RewardManagerProgram.decodeRewardManagerState(
          state.data
        )
      } else {
        throw new Error('Failed to get reward manager account state.')
      }
    }
    return this.rewardManagerState
  }

  /**
   * Override the sendTransaction method to provide some more friendly errors
   * back to the consumer for RewardManager instructions
   */
  public async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    sendOptions?: SendTransactionOptions | undefined
  ): Promise<string> {
    try {
      return await this.client.sendTransaction(transaction, sendOptions)
    } catch (e) {
      if (e instanceof SendTransactionError) {
        try {
          const error = CustomInstructionError.parseSendTransactionError(e)
          if (error) {
            const instructions = await this.client.getInstructions(transaction)
            const instruction = instructions[error.instructionIndex]
            if (instruction && instruction.programId.equals(this.programId)) {
              const decodedInstruction =
                RewardManagerProgram.decodeInstruction(instruction)
              throw new RewardManagerError({
                code: error.code,
                instructionName:
                  RewardManagerInstruction[
                    decodedInstruction.data.instruction
                  ] ?? 'Unknown',
                cause: e
              })
            }
          }
        } catch (nestedError) {
          if (nestedError instanceof RewardManagerError) {
            throw nestedError
          } else {
            // If failed to provide user friendly error, surface original error
            this.logger.warn(
              'Failed to parse RewardManagerError error',
              nestedError
            )
          }
        }
      }
      throw e
    }
  }
}
