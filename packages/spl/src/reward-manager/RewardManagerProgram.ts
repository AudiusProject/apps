import { blob, seq, struct, u8 } from '@solana/buffer-layout'
import { publicKey, u64 } from '@solana/buffer-layout-utils'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  AccountMeta,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  TransactionInstruction
} from '@solana/web3.js'

import { borshString, ethAddress } from '../layout-utils'

import { attestationLayout } from './AttestationLayout'
import { senderAttestationLayout } from './SenderAttestationLayout'
import { RewardManagerInstruction } from './constants'
import {
  Attestation,
  CreateRewardSenderParams,
  CreateRewardSenderPublicParams,
  CreateSenderInstructionData,
  CreateSenderPublicInstructionData,
  DecodedCreateSenderInstruction,
  DecodedCreateSenderPublicInstruction,
  DecodedDeleteSenderPublicInstruction,
  DecodedEvaluateAttestationsInstruction,
  DecodedInitRewardManagerInstruction,
  DecodedRewardManagerInstruction,
  DecodedSubmitAttestationsInstruction,
  EvaluateAttestationsInstructionData,
  EvaluateRewardAttestationsParams,
  InitRewardManagerInstructionData,
  InitRewardManagerParams,
  RewardManagerStateData,
  SubmitAttestationInstructionData,
  SubmitRewardAttestationParams,
  VerifiedMessage,
  AttestationsAccountData,
  type SenderAttestation
} from './types'

const encoder = new TextEncoder()
const SENDER_SEED_PREFIX = 'S_'
const SENDER_SEED_PREFIX_BYTES = encoder.encode(SENDER_SEED_PREFIX)
const ATTESTATIONS_SEED_PREFIX = 'V_'
const ATTESTATIONS_SEED_PREFIX_BYTES = encoder.encode(ATTESTATIONS_SEED_PREFIX)
const DISBURSEMENT_SEED_PREFIX = 'T_'
const DISBURSEMENT_SEED_PREFIX_BYTES = encoder.encode(DISBURSEMENT_SEED_PREFIX)

export class RewardManagerProgram {
  public static readonly programId = new PublicKey(
    'DDZDcYdQFEMwcu2Mwo75yGFjJ1mUQyyXLWzhZLEVFcei'
  )

  public static readonly layouts = {
    initRewardManagerInstructionData: struct<InitRewardManagerInstructionData>([
      u8('instruction'),
      u8('minVotes')
    ]),
    createSenderInstructionData: struct<CreateSenderInstructionData>([
      u8('instruction'),
      ethAddress('senderEthAddress'),
      ethAddress('operatorEthAddress')
    ]),
    createSenderPublicInstructionData:
      struct<CreateSenderPublicInstructionData>([
        u8('instruction'),
        ethAddress('senderEthAddress'),
        ethAddress('operatorEthAddress')
      ]),
    evaluateAttestationsInstructionData:
      struct<EvaluateAttestationsInstructionData>([
        u8('instruction'),
        u64('amount'),
        borshString(32, 'disbursementId'),
        ethAddress('recipientEthAddress')
      ]),
    submitAttestationInstructionData: struct<SubmitAttestationInstructionData>([
      u8('instruction'),
      borshString(32, 'disbursementId')
    ]),
    rewardManagerStateData: struct<RewardManagerStateData>([
      u8('version'),
      publicKey('tokenAccount'),
      publicKey('manager'),
      u8('minVotes')
    ]),
    attestationsAccountData: (maxAttestations: number) =>
      struct<AttestationsAccountData>([
        u8('version'),
        publicKey('rewardManagerState'),
        u8('count'),
        seq(
          struct<VerifiedMessage>([
            ethAddress('senderEthAddress'),
            attestationLayout('attestation'),
            // Though the actual attestation message is only 83 bytes, we allocate
            // 128 bytes for each element of this array on the program side.
            // Thus we add 45 bytes of padding here to be consistent.
            // See: https://github.com/AudiusProject/apps/blob/dde78ad7e26d9f6fb358fef5d240c5c7e2d25c66/solana-programs/reward-manager/program/src/state/verified_messages.rs#L99
            blob(45),
            ethAddress('operator')
          ]),
          maxAttestations,
          'messages'
        )
      ])
  }

  public static createInitInstruction({
    rewardManagerState,
    tokenAccount,
    mint,
    manager,
    minVotes,
    rewardManagerProgramId = RewardManagerProgram.programId
  }: InitRewardManagerParams) {
    const data = Buffer.alloc(
      RewardManagerProgram.layouts.initRewardManagerInstructionData.span
    )
    RewardManagerProgram.layouts.initRewardManagerInstructionData.encode(
      {
        instruction: RewardManagerInstruction.Init,
        minVotes
      },
      data
    )

    const authority = RewardManagerProgram.deriveAuthority({
      programId: rewardManagerProgramId,
      rewardManagerState
    })

    const keys: AccountMeta[] = [
      { pubkey: rewardManagerState, isSigner: false, isWritable: true },
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: manager, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
    ]
    return new TransactionInstruction({
      programId: rewardManagerProgramId,
      keys,
      data
    })
  }

  public static decodeInitInstruction({
    programId,
    keys: [
      rewardManagerState,
      tokenAccount,
      mint,
      manager,
      authority,
      tokenProgram,
      rent
    ],
    data
  }: TransactionInstruction): DecodedInitRewardManagerInstruction {
    return {
      programId,
      keys: {
        rewardManagerState,
        tokenAccount,
        mint,
        manager,
        authority,
        tokenProgram,
        rent
      },
      data: RewardManagerProgram.layouts.initRewardManagerInstructionData.decode(
        data
      )
    }
  }

  public static createSenderInstruction({
    senderEthAddress,
    operatorEthAddress,
    rewardManagerState,
    manager,
    authority,
    payer,
    sender,
    rewardManagerProgramId = RewardManagerProgram.programId
  }: CreateRewardSenderParams) {
    const data = Buffer.alloc(
      RewardManagerProgram.layouts.createSenderInstructionData.span
    )
    RewardManagerProgram.layouts.createSenderInstructionData.encode(
      {
        instruction: RewardManagerInstruction.CreateSender,
        senderEthAddress,
        operatorEthAddress
      },
      data
    )
    const keys: AccountMeta[] = [
      { pubkey: rewardManagerState, isSigner: false, isWritable: false },
      { pubkey: manager, isSigner: true, isWritable: false },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: false },
      { pubkey: sender, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
    ]
    return new TransactionInstruction({
      programId: rewardManagerProgramId,
      keys,
      data
    })
  }

  public static decodeCreateSenderInstruction({
    programId,
    keys: [
      rewardManagerState,
      manager,
      authority,
      payer,
      sender,
      systemProgramId,
      rent
    ],
    data
  }: TransactionInstruction): DecodedCreateSenderInstruction {
    return {
      programId,
      keys: {
        rewardManagerState,
        manager,
        authority,
        payer,
        sender,
        systemProgramId,
        rent
      },
      data: RewardManagerProgram.layouts.createSenderInstructionData.decode(
        data
      )
    }
  }

  public static createSenderPublicInstruction({
    senderEthAddress,
    operatorEthAddress,
    rewardManagerState,
    authority,
    payer,
    sender,
    existingSenders,
    rewardManagerProgramId
  }: CreateRewardSenderPublicParams) {
    const data = Buffer.alloc(
      RewardManagerProgram.layouts.createSenderPublicInstructionData.span
    )
    RewardManagerProgram.layouts.createSenderPublicInstructionData.encode(
      {
        instruction: RewardManagerInstruction.CreateSenderPublic,
        senderEthAddress,
        operatorEthAddress
      },
      data
    )
    const keys = [
      { pubkey: rewardManagerState, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: sender, isSigner: false, isWritable: true },
      {
        pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
        isSigner: false,
        isWritable: false
      },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ...existingSenders.map((pubkey) => ({
        pubkey,
        isSigner: false,
        isWritable: false
      }))
    ]
    return new TransactionInstruction({
      programId: rewardManagerProgramId,
      keys,
      data
    })
  }

  public static decodeCreateSenderPublicInstruction({
    programId,
    keys: [
      rewardManagerState,
      authority,
      payer,
      sender,
      sysvarInstructions,
      rent,
      systemProgramId,
      ...existingSenders
    ],
    data
  }: TransactionInstruction): DecodedCreateSenderPublicInstruction {
    return {
      programId,
      keys: {
        rewardManagerState,
        authority,
        payer,
        sender,
        sysvarInstructions,
        rent,
        systemProgramId,
        existingSenders
      },
      data: RewardManagerProgram.layouts.createSenderPublicInstructionData.decode(
        data
      )
    }
  }

  public static decodeDeleteSenderPublicInstruction({
    programId,
    keys: [
      rewardManagerState,
      sender,
      refunder,
      sysvarInstructions,
      ...existingSenders
    ]
  }: TransactionInstruction): DecodedDeleteSenderPublicInstruction {
    return {
      programId,
      keys: {
        rewardManagerState,
        sender,
        refunder,
        sysvarInstructions,
        existingSenders
      },
      data: {
        instruction: RewardManagerInstruction.DeleteSenderPublic
      }
    }
  }

  public static createSubmitAttestationInstruction = ({
    disbursementId,
    attestations,
    rewardManagerState,
    authority,
    payer,
    sender,
    rewardManagerProgramId = RewardManagerProgram.programId
  }: SubmitRewardAttestationParams) => {
    const b = Buffer.alloc(this.layouts.submitAttestationInstructionData.span)
    const length = this.layouts.submitAttestationInstructionData.encode(
      {
        instruction: RewardManagerInstruction.SubmitAttestation,
        disbursementId
      },
      b
    )
    const data = b.subarray(0, length)
    const keys: AccountMeta[] = [
      { pubkey: attestations, isSigner: false, isWritable: true },
      { pubkey: rewardManagerState, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: sender, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      {
        pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
        isSigner: false,
        isWritable: false
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ]
    return new TransactionInstruction({
      programId: rewardManagerProgramId,
      keys,
      data
    })
  }

  public static decodeSubmitAttestationInstruction({
    programId,
    keys: [
      attestations,
      rewardManagerState,
      authority,
      payer,
      sender,
      rent,
      sysvarInstructions,
      systemProgramId
    ],
    data
  }: TransactionInstruction): DecodedSubmitAttestationsInstruction {
    return {
      programId,
      keys: {
        attestations,
        rewardManagerState,
        authority,
        payer,
        sender,
        rent,
        sysvarInstructions,
        systemProgramId
      },
      data: RewardManagerProgram.layouts.submitAttestationInstructionData.decode(
        data
      )
    }
  }

  public static createEvaluateAttestationsInstruction = ({
    disbursementId,
    recipientEthAddress,
    amount,
    attestations,
    rewardManagerState,
    authority,
    rewardManagerTokenSource,
    destinationUserBank,
    disbursementAccount,
    antiAbuseOracle,
    payer,
    tokenProgramId = TOKEN_PROGRAM_ID,
    rewardManagerProgramId = RewardManagerProgram.programId
  }: EvaluateRewardAttestationsParams) => {
    const b = Buffer.alloc(
      RewardManagerProgram.layouts.evaluateAttestationsInstructionData.span
    )
    const length =
      RewardManagerProgram.layouts.evaluateAttestationsInstructionData.encode(
        {
          instruction: RewardManagerInstruction.EvaluateAttestations,
          disbursementId,
          amount,
          recipientEthAddress
        },
        b
      )
    const data = b.subarray(0, length)
    const keys: AccountMeta[] = [
      { pubkey: attestations, isSigner: false, isWritable: true },
      { pubkey: rewardManagerState, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: rewardManagerTokenSource, isSigner: false, isWritable: true },
      { pubkey: destinationUserBank, isSigner: false, isWritable: true },
      { pubkey: disbursementAccount, isSigner: false, isWritable: true },
      { pubkey: antiAbuseOracle, isSigner: false, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ]
    return new TransactionInstruction({
      programId: rewardManagerProgramId,
      keys,
      data
    })
  }

  public static decodeEvaluateAttestationsInstruction({
    programId,
    keys: [
      attestations,
      rewardManagerState,
      authority,
      rewardManagerTokenSource,
      destinationUserbank,
      disbursementAccount,
      antiAbuseOracle,
      payer,
      rent,
      tokenProgramId,
      systemProgramId
    ],
    data
  }: TransactionInstruction): DecodedEvaluateAttestationsInstruction {
    return {
      programId,
      keys: {
        attestations,
        rewardManagerState,
        authority,
        rewardManagerTokenSource,
        destinationUserbank,
        disbursementAccount,
        antiAbuseOracle,
        payer,
        rent,
        tokenProgramId,
        systemProgramId
      },
      data: RewardManagerProgram.layouts.evaluateAttestationsInstructionData.decode(
        data
      )
    }
  }

  public static decodeInstruction(
    instruction: TransactionInstruction
  ): DecodedRewardManagerInstruction {
    switch (instruction.data[0]) {
      case RewardManagerInstruction.Init:
        return RewardManagerProgram.decodeInitInstruction(instruction)
      case RewardManagerInstruction.ChangeManagerAccount:
        throw new Error('Not Implemented')
      case RewardManagerInstruction.CreateSender:
        return RewardManagerProgram.decodeCreateSenderInstruction(instruction)
      case RewardManagerInstruction.DeleteSender:
        throw new Error('Not Implemented')
      case RewardManagerInstruction.CreateSenderPublic:
        return RewardManagerProgram.decodeCreateSenderPublicInstruction(
          instruction
        )
      case RewardManagerInstruction.DeleteSenderPublic:
        return RewardManagerProgram.decodeDeleteSenderPublicInstruction(
          instruction
        )
      case RewardManagerInstruction.SubmitAttestation:
        return RewardManagerProgram.decodeSubmitAttestationInstruction(
          instruction
        )
      case RewardManagerInstruction.EvaluateAttestations:
        return RewardManagerProgram.decodeEvaluateAttestationsInstruction(
          instruction
        )
      default:
        throw new Error('Invalid RewardManager Instruction')
    }
  }

  public static isInitInstruction(
    decoded: DecodedRewardManagerInstruction
  ): decoded is DecodedInitRewardManagerInstruction {
    return decoded.data.instruction === RewardManagerInstruction.Init
  }

  public static isCreateSenderInstruction(
    decoded: DecodedRewardManagerInstruction
  ): decoded is DecodedCreateSenderInstruction {
    return decoded.data.instruction === RewardManagerInstruction.CreateSender
  }

  public static isCreateSenderPublicInstruction(
    decoded: DecodedRewardManagerInstruction
  ): decoded is DecodedCreateSenderPublicInstruction {
    return (
      decoded.data.instruction === RewardManagerInstruction.CreateSenderPublic
    )
  }

  public static isDeleteSenderPublicInstruction(
    decoded: DecodedRewardManagerInstruction
  ): decoded is DecodedDeleteSenderPublicInstruction {
    return (
      decoded.data.instruction === RewardManagerInstruction.DeleteSenderPublic
    )
  }

  public static isSubmitAttestationInstruction(
    decoded: DecodedRewardManagerInstruction
  ): decoded is DecodedSubmitAttestationsInstruction {
    return (
      decoded.data.instruction === RewardManagerInstruction.SubmitAttestation
    )
  }

  public static isEvaluateAttestationsInstruction(
    decoded: DecodedRewardManagerInstruction
  ): decoded is DecodedEvaluateAttestationsInstruction {
    return (
      decoded.data.instruction === RewardManagerInstruction.EvaluateAttestations
    )
  }

  public static encodeAttestation(attestation: Attestation) {
    const data = Buffer.alloc(attestationLayout().span)
    const span = attestationLayout().encode(attestation, data)
    return data.subarray(0, span)
  }

  public static decodeAttestation(data: Buffer | Uint8Array) {
    return attestationLayout().decode(data)
  }

  public static decodeAttestationsAccountData(
    maxAttestations: number,
    data: Buffer | Uint8Array
  ) {
    const decoded = this.layouts
      .attestationsAccountData(maxAttestations)
      .decode(data)
    decoded.messages = decoded.messages.slice(0, decoded.count)
    for (let i = 0; i < decoded.messages.length; i++) {
      if (
        decoded.messages[i].attestation.antiAbuseOracleEthAddress ===
        '0x0000000000000000000000000000000000000000'
      ) {
        decoded.messages[i].attestation.antiAbuseOracleEthAddress = null
      }
    }
    return decoded
  }

  public static deriveAuthority({
    programId,
    rewardManagerState
  }: {
    programId: PublicKey
    rewardManagerState: PublicKey
  }) {
    return PublicKey.findProgramAddressSync(
      [rewardManagerState.toBytes().slice(0, 32)],
      programId
    )[0]
  }

  public static deriveSender({
    ethAddress: wallet,
    programId,
    authority
  }: {
    ethAddress: string
    programId: PublicKey
    authority: PublicKey
  }) {
    const ethAddressData = ethAddress(wallet)
    const buffer = Buffer.alloc(ethAddressData.span)
    ethAddressData.encode(wallet, buffer)
    const seed = Uint8Array.from([...SENDER_SEED_PREFIX_BYTES, ...buffer])
    return PublicKey.findProgramAddressSync(
      [authority.toBytes().slice(0, 32), seed],
      programId
    )[0]
  }

  public static deriveAttestations({
    disbursementId,
    programId,
    authority
  }: {
    disbursementId: string
    programId: PublicKey
    authority: PublicKey
  }) {
    const encoder = new TextEncoder()
    const seed = Uint8Array.from([
      ...ATTESTATIONS_SEED_PREFIX_BYTES,
      ...encoder.encode(disbursementId)
    ])
    return PublicKey.findProgramAddressSync(
      [authority.toBytes().slice(0, 32), seed],
      programId
    )[0]
  }

  public static deriveDisbursement({
    disbursementId,
    programId,
    authority
  }: {
    disbursementId: string
    programId: PublicKey
    authority: PublicKey
  }) {
    const encoder = new TextEncoder()
    const seed = Uint8Array.from([
      ...DISBURSEMENT_SEED_PREFIX_BYTES,
      ...encoder.encode(disbursementId)
    ])
    return PublicKey.findProgramAddressSync(
      [authority.toBytes().slice(0, 32), seed],
      programId
    )[0]
  }

  public static encodeSignature(signature: string) {
    const recoveryIdString = signature.slice(-2)
    const recoveryIdBuffer = Buffer.from(recoveryIdString, 'hex')
    const strippedSignature = signature
      .substring(0, signature.length - 2)
      .replace('0x', '')
      .padStart(128, '0')
      .substring(0, 128)
    const signatureBuffer = Buffer.from(strippedSignature, 'hex')
    return {
      signature: signatureBuffer,
      recoveryId: recoveryIdBuffer.readInt8()
    }
  }

  public static decodeRewardManagerState(accountData: Uint8Array | Buffer) {
    return RewardManagerProgram.layouts.rewardManagerStateData.decode(
      accountData
    )
  }

  public static encodeSenderAttestation(attestation: SenderAttestation) {
    const data = Buffer.alloc(senderAttestationLayout().span)
    const span = senderAttestationLayout().encode(attestation, data)
    return data.subarray(0, span)
  }
}
