import type {
  AccountMeta,
  PublicKey,
  TransactionInstruction
} from '@solana/web3.js'

enum AssociatedTokenInstruction {
  Create = 0,
  CreateIdempotent = 1,
  RecoverNested = 2
}

type DecodedCreateAssociatedTokenAccountInstruction = {
  programId: PublicKey
  keys: {
    payer: AccountMeta
    associatedToken: AccountMeta
    owner: AccountMeta
    mint: AccountMeta
    systemProgramId: AccountMeta
    tokenProgramId: AccountMeta
  }
  data: { instruction: AssociatedTokenInstruction.Create }
}

type DecodedCreateAssociatedTokenAccountIdempotentInstruction = {
  programId: PublicKey
  keys: {
    payer: AccountMeta
    associatedToken: AccountMeta
    owner: AccountMeta
    mint: AccountMeta
    systemProgramId: AccountMeta
    tokenProgramId: AccountMeta
  }
  data: { instruction: AssociatedTokenInstruction.CreateIdempotent }
}

type DecodedRecoverNestedInstruction = {
  programId: PublicKey
  keys: {
    nestedAssociatedToken: AccountMeta
    nestedMint: AccountMeta
    destinationAssociatedToken: AccountMeta
    ownerAssociatedToken: AccountMeta
    ownerMint: AccountMeta
    owner: AccountMeta
    tokenProgramId: AccountMeta
  }
  data: { instruction: AssociatedTokenInstruction.RecoverNested }
}

type DecodedAssociatedTokenInstruction =
  | DecodedCreateAssociatedTokenAccountInstruction
  | DecodedCreateAssociatedTokenAccountIdempotentInstruction
  | DecodedRecoverNestedInstruction

const decodeCreateAssociatedTokenAccountInstruction = ({
  programId,
  keys: [payer, associatedToken, owner, mint, systemProgramId, tokenProgramId],
  data
}: TransactionInstruction): DecodedCreateAssociatedTokenAccountInstruction => ({
  programId,
  keys: {
    payer,
    associatedToken,
    owner,
    mint,
    systemProgramId,
    tokenProgramId
  },
  data: { instruction: data[0] as AssociatedTokenInstruction.Create }
})

const decodeCreateAssociatedTokenAccountIdempotentInstruction = ({
  programId,
  keys: [payer, associatedToken, owner, mint, systemProgramId, tokenProgramId],
  data
}: TransactionInstruction): DecodedCreateAssociatedTokenAccountIdempotentInstruction => ({
  programId,
  keys: {
    payer,
    associatedToken,
    owner,
    mint,
    systemProgramId,
    tokenProgramId
  },
  data: { instruction: data[0] as AssociatedTokenInstruction.CreateIdempotent }
})

const decodeRecoverNestedInstruction = ({
  programId,
  keys: [
    nestedAssociatedToken,
    nestedMint,
    destinationAssociatedToken,
    ownerAssociatedToken,
    ownerMint,
    owner,
    tokenProgramId
  ],
  data
}: TransactionInstruction): DecodedRecoverNestedInstruction => ({
  programId,
  keys: {
    nestedAssociatedToken,
    nestedMint,
    destinationAssociatedToken,
    ownerAssociatedToken,
    ownerMint,
    owner,
    tokenProgramId
  },
  data: { instruction: data[0] as AssociatedTokenInstruction.RecoverNested }
})

export const decodeAssociatedTokenAccountInstruction = (
  instruction: TransactionInstruction
) => {
  switch (instruction.data[0]) {
    case null:
    case undefined:
    case AssociatedTokenInstruction.Create:
      return decodeCreateAssociatedTokenAccountInstruction(instruction)
    case AssociatedTokenInstruction.CreateIdempotent:
      return decodeCreateAssociatedTokenAccountIdempotentInstruction(
        instruction
      )
    case AssociatedTokenInstruction.RecoverNested:
      return decodeRecoverNestedInstruction(instruction)
    default:
      throw new Error('Invalid Associated Token Program Instruction')
  }
}

export const isCreateAssociatedTokenAccountInstruction = (
  decoded: DecodedAssociatedTokenInstruction
): decoded is DecodedCreateAssociatedTokenAccountInstruction =>
  decoded.data.instruction === AssociatedTokenInstruction.Create ||
  decoded.data.instruction === null ||
  decoded.data.instruction === undefined

export const isCreateAssociatedTokenAccountIdempotentInstruction = (
  decoded: DecodedAssociatedTokenInstruction
): decoded is DecodedCreateAssociatedTokenAccountIdempotentInstruction =>
  decoded.data.instruction === AssociatedTokenInstruction.CreateIdempotent

export const isRecoverNestedInstruction = (
  decoded: DecodedAssociatedTokenInstruction
): decoded is DecodedRecoverNestedInstruction =>
  decoded.data.instruction === AssociatedTokenInstruction.RecoverNested
