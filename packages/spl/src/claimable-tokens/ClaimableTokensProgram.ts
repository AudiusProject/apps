import { struct, u8 } from '@solana/buffer-layout'
import { publicKey, u64 } from '@solana/buffer-layout-utils'
import {
  TOKEN_PROGRAM_ID,
  TokenInstruction,
  createSetAuthorityInstruction,
  setAuthorityInstructionData
} from '@solana/spl-token'
import {
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  TransactionInstruction
} from '@solana/web3.js'
import bs58 from 'bs58'

import { ethAddress } from '../layout-utils'

import { ClaimableTokensInstruction } from './constants'
import {
  CreateClaimableTokensAccountParams,
  CreateClaimableTokensAccountInstructionData,
  DecodedCreateClaimableTokensAccountInstruction,
  TransferClaimableTokensUnsignedInstructionData,
  TransferClaimableTokensParams,
  DecodedTransferClaimableTokensInstruction,
  NonceAccountData,
  TransferClaimableTokensSignedInstructionData,
  DecodedClaimableTokenInstruction,
  SetClaimableTokensAuthorityParams,
  SetClaimableTokensAuthorityInstructionData,
  DecodedSetClaimableTokensAuthorityInstruction,
  SetClaimableTokensAuthoritySignedData,
  CloseClaimableTokensAccountInstructionData,
  DecodedCloseClaimableTokensAccountInstruction
} from './types'

const TRANSFER_NONCE_PREFIX = 'N_'
const TRANSFER_NONCE_PREFIX_BYTES = new TextEncoder().encode(
  TRANSFER_NONCE_PREFIX
)

/** @see {@link https://github.com/solana-labs/solana-web3.js/blob/974193946d5e6fade11b96d141f21ebe8f3ff5e2/packages/library-legacy/src/programs/secp256k1.ts#L47C11-L47C11 SECP256K1_INSTRUCTION_LAYOUT} */
const SECP256K1_INSTRUCTION_MESSAGE_DATA_START = 97

/**
 * The Claimable Tokens Program is responsible for the creation and control of
 * "user banks", which are accounts that are owned by the program itself but
 * controlled by users' Ethereum wallet addresses.
 *
 * Unlike normal Associated Token Accounts, the user bank accounts are owned
 * by the program, not a user's wallet. The only way for a user to transfer
 * tokens out of their user bank is by using this program method paired with
 * a signed Secp256k1 instruction from their Ethereum wallet specifying the
 * destination and amount.
 *
 * A user can have multiple user banks, one for each token mint.
 */
export class ClaimableTokensProgram {
  public static readonly programId = new PublicKey(
    'Ewkv3JahEFRKkcJmpoKB7pXbnUHwjAyXiwEo4ZY2rezQ'
  )

  /**
   * The only account the program's Close instruction will send rent to.
   * @see {@link https://github.com/AudiusProject/solana-programs/blob/main/claimable-tokens/program/src/processor.rs DEFAULT_RENT_DESTINATION}
   */
  public static readonly rentDestination = new PublicKey(
    '2HYDf9XvHRKhquxK1z4ETJ8ywueZcqEazyFZdRfLqGcT'
  )

  public static readonly layouts = {
    createAccountInstructionData:
      struct<CreateClaimableTokensAccountInstructionData>([
        u8('instruction'),
        ethAddress('ethAddress')
      ]),
    unsignedTransferInstructionData:
      struct<TransferClaimableTokensUnsignedInstructionData>([
        u8('instruction'),
        ethAddress('sender')
      ]),
    signedTransferInstructionData:
      struct<TransferClaimableTokensSignedInstructionData>([
        publicKey('destination'),
        u64('amount'),
        u64('nonce')
      ]),
    setAuthorityInstructionData:
      struct<SetClaimableTokensAuthorityInstructionData>([u8('instruction')]),
    closeInstructionData: struct<CloseClaimableTokensAccountInstructionData>([
      u8('instruction'),
      ethAddress('ethAddress')
    ]),
    nonceAccountData: struct<NonceAccountData>([u8('version'), u64('nonce')])
  }

  public static createAccountInstruction({
    ethAddress,
    payer,
    mint,
    authority,
    userBank,
    programId = ClaimableTokensProgram.programId,
    tokenProgramId = TOKEN_PROGRAM_ID
  }: CreateClaimableTokensAccountParams) {
    const data = Buffer.alloc(
      ClaimableTokensProgram.layouts.createAccountInstructionData.span
    )
    ClaimableTokensProgram.layouts.createAccountInstructionData.encode(
      { instruction: ClaimableTokensInstruction.Create, ethAddress },
      data
    )
    const keys = [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: userBank, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ]
    return new TransactionInstruction({ keys, programId, data })
  }

  public static decodeCreateAccountInstruction({
    programId,
    keys: [
      payer,
      mint,
      authority,
      userBank,
      rent,
      tokenProgramId,
      systemProgramId
    ],
    data
  }: TransactionInstruction): DecodedCreateClaimableTokensAccountInstruction {
    return {
      programId,
      keys: {
        payer,
        mint,
        authority,
        userBank,
        rent,
        tokenProgramId,
        systemProgramId
      },
      data: ClaimableTokensProgram.layouts.createAccountInstructionData.decode(
        data
      )
    }
  }

  public static createTransferInstruction({
    payer,
    sourceEthAddress,
    sourceUserBank,
    destination,
    nonceAccount,
    authority,
    programId = ClaimableTokensProgram.programId,
    tokenProgramId = TOKEN_PROGRAM_ID
  }: TransferClaimableTokensParams) {
    const data = Buffer.alloc(
      ClaimableTokensProgram.layouts.unsignedTransferInstructionData.span
    )
    ClaimableTokensProgram.layouts.unsignedTransferInstructionData.encode(
      {
        instruction: ClaimableTokensInstruction.Transfer,
        sender: sourceEthAddress
      },
      data
    )
    const keys = [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: sourceUserBank, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: nonceAccount, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      {
        pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
        isSigner: false,
        isWritable: false
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false }
    ]
    return new TransactionInstruction({ programId, keys, data })
  }

  public static decodeTransferInstruction({
    programId,
    keys: [
      payer,
      sourceUserBank,
      destination,
      nonceAccount,
      authority,
      rent,
      sysvarInstructions,
      systemProgramId,
      tokenProgramId
    ],
    data
  }: TransactionInstruction): DecodedTransferClaimableTokensInstruction {
    return {
      programId,
      keys: {
        payer,
        sourceUserBank,
        destination,
        nonceAccount,
        authority,
        rent,
        sysvarInstructions,
        systemProgramId,
        tokenProgramId
      },
      data: ClaimableTokensProgram.layouts.unsignedTransferInstructionData.decode(
        data
      )
    }
  }

  /**
   * Creates a SetAuthority instruction, which changes an SPL Token authority
   * of a user bank.
   *
   * Must be immediately preceded by a Secp256k1 instruction signed by the
   * user's Ethereum wallet over the data from
   * {@link createSignedSetAuthorityData}.
   */
  public static createSetAuthorityInstruction({
    userBank,
    authority,
    programId = ClaimableTokensProgram.programId,
    tokenProgramId = TOKEN_PROGRAM_ID
  }: SetClaimableTokensAuthorityParams) {
    const data = Buffer.alloc(
      ClaimableTokensProgram.layouts.setAuthorityInstructionData.span
    )
    ClaimableTokensProgram.layouts.setAuthorityInstructionData.encode(
      { instruction: ClaimableTokensInstruction.SetAuthority },
      data
    )
    const keys = [
      { pubkey: userBank, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: false },
      {
        pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
        isSigner: false,
        isWritable: false
      },
      {
        pubkey: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
        isSigner: false,
        isWritable: false
      },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false }
    ]
    return new TransactionInstruction({ programId, keys, data })
  }

  public static decodeSetAuthorityInstruction({
    programId,
    keys: [
      userBank,
      authority,
      sysvarInstructions,
      recentBlockhashes,
      tokenProgramId
    ],
    data
  }: TransactionInstruction): DecodedSetClaimableTokensAuthorityInstruction {
    return {
      programId,
      keys: {
        userBank,
        authority,
        sysvarInstructions,
        recentBlockhashes,
        tokenProgramId
      },
      data: ClaimableTokensProgram.layouts.setAuthorityInstructionData.decode(
        data
      )
    }
  }

  public static decodeCloseInstruction({
    programId,
    keys: [userBank, authority, destination, tokenProgramId],
    data
  }: TransactionInstruction): DecodedCloseClaimableTokensAccountInstruction {
    return {
      programId,
      keys: {
        userBank,
        authority,
        destination,
        tokenProgramId
      },
      data: ClaimableTokensProgram.layouts.closeInstructionData.decode(data)
    }
  }

  /**
   * Encodes the message the user's Ethereum wallet signs to authorize a
   * SetAuthority instruction. Matches the program's Borsh-serialized
   * SignedSetAuthorityData: the blockhash, the SPL Token SetAuthority
   * instruction data as a Vec<u8>, and the user bank.
   */
  public static createSignedSetAuthorityData({
    blockhash,
    userBank,
    authorityType,
    newAuthority,
    tokenProgramId = TOKEN_PROGRAM_ID
  }: SetClaimableTokensAuthoritySignedData & { tokenProgramId?: PublicKey }) {
    // Only the data is used, so the current authority is irrelevant
    const tokenInstructionData = createSetAuthorityInstruction(
      userBank,
      userBank,
      authorityType,
      newAuthority,
      [],
      tokenProgramId
    ).data
    const length = Buffer.alloc(4)
    length.writeUInt32LE(tokenInstructionData.length)
    return Buffer.concat([
      Buffer.from(bs58.decode(blockhash)),
      length,
      tokenInstructionData,
      userBank.toBuffer()
    ])
  }

  /**
   * Decodes the signed message of the Secp256k1 instruction preceding a
   * SetAuthority instruction.
   * @see {@link createSignedSetAuthorityData}
   */
  public static decodeSignedSetAuthorityData(
    data: Uint8Array
  ): SetClaimableTokensAuthoritySignedData {
    const buffer = Buffer.from(data)
    const tokenInstructionLength = buffer.readUInt32LE(32)
    const tokenInstructionEnd = 36 + tokenInstructionLength
    if (buffer.length !== tokenInstructionEnd + 32) {
      throw new Error('Invalid SetAuthority signed data length')
    }
    const tokenInstructionData = buffer.subarray(36, tokenInstructionEnd)
    if (tokenInstructionData.length !== setAuthorityInstructionData.span) {
      throw new Error('Invalid SetAuthority token instruction length')
    }
    const decoded = setAuthorityInstructionData.decode(tokenInstructionData)
    if (decoded.instruction !== TokenInstruction.SetAuthority) {
      throw new Error('Signed token instruction is not SetAuthority')
    }
    return {
      blockhash: bs58.encode(buffer.subarray(0, 32)),
      userBank: new PublicKey(buffer.subarray(tokenInstructionEnd)),
      authorityType: decoded.authorityType,
      newAuthority: decoded.newAuthorityOption ? decoded.newAuthority : null
    }
  }

  public static decodeInstruction(
    instruction: TransactionInstruction
  ): DecodedClaimableTokenInstruction {
    switch (instruction.data[0]) {
      case ClaimableTokensInstruction.Create:
        return ClaimableTokensProgram.decodeCreateAccountInstruction(
          instruction
        )
      case ClaimableTokensInstruction.Transfer:
        return ClaimableTokensProgram.decodeTransferInstruction(instruction)
      case ClaimableTokensInstruction.SetAuthority:
        return ClaimableTokensProgram.decodeSetAuthorityInstruction(instruction)
      case ClaimableTokensInstruction.Close:
        return ClaimableTokensProgram.decodeCloseInstruction(instruction)
      default:
        throw new Error('Invalid Claimable Token Program Instruction')
    }
  }

  public static isCreateAccountInstruction(
    decoded: DecodedClaimableTokenInstruction
  ): decoded is DecodedCreateClaimableTokensAccountInstruction {
    return decoded.data.instruction === ClaimableTokensInstruction.Create
  }

  public static isTransferInstruction(
    decoded: DecodedClaimableTokenInstruction
  ): decoded is DecodedTransferClaimableTokensInstruction {
    return decoded.data.instruction === ClaimableTokensInstruction.Transfer
  }

  public static isSetAuthorityInstruction(
    decoded: DecodedClaimableTokenInstruction
  ): decoded is DecodedSetClaimableTokensAuthorityInstruction {
    return decoded.data.instruction === ClaimableTokensInstruction.SetAuthority
  }

  public static isCloseInstruction(
    decoded: DecodedClaimableTokenInstruction
  ): decoded is DecodedCloseClaimableTokensAccountInstruction {
    return decoded.data.instruction === ClaimableTokensInstruction.Close
  }

  public static createSignedTransferInstructionData({
    destination,
    amount,
    nonce
  }: TransferClaimableTokensSignedInstructionData) {
    const data = Buffer.alloc(
      ClaimableTokensProgram.layouts.signedTransferInstructionData.span
    )
    ClaimableTokensProgram.layouts.signedTransferInstructionData.encode(
      {
        destination,
        amount,
        nonce
      },
      data
    )
    return data
  }

  public static decodeSignedTransferInstructionData(
    instruction: TransactionInstruction
  ) {
    return ClaimableTokensProgram.layouts.signedTransferInstructionData.decode(
      Uint8Array.from(instruction.data).slice(
        SECP256K1_INSTRUCTION_MESSAGE_DATA_START
      )
    )
  }

  public static deriveNonce({
    ethAddress: wallet,
    programId,
    authority
  }: {
    ethAddress: string
    programId: PublicKey
    authority: PublicKey
  }) {
    const ethAdddressData = ethAddress()
    const buffer = Buffer.alloc(ethAdddressData.span)
    ethAdddressData.encode(wallet, buffer)
    const seed = Uint8Array.from([...TRANSFER_NONCE_PREFIX_BYTES, ...buffer])
    return PublicKey.findProgramAddressSync(
      [authority.toBytes().slice(0, 32), seed],
      programId
    )[0]
  }

  public static async deriveUserBank({
    ethAddress: wallet,
    claimableTokensPDA,
    tokenProgramId = TOKEN_PROGRAM_ID
  }: {
    ethAddress: string
    claimableTokensPDA: PublicKey
    tokenProgramId?: PublicKey
  }) {
    const ethAddressData = ethAddress()
    const buffer = Buffer.alloc(ethAddressData.span)
    ethAddressData.encode(wallet, buffer)
    const seed = bs58.encode(buffer)
    return await PublicKey.createWithSeed(
      claimableTokensPDA,
      seed,
      tokenProgramId
    )
  }

  public static deriveAuthority = ({
    programId,
    mint
  }: {
    programId: PublicKey
    mint: PublicKey
  }) => {
    return PublicKey.findProgramAddressSync(
      [mint.toBytes().slice(0, 32)],
      programId
    )[0]
  }
}
