export enum RewardManagerInstruction {
  Init = 0,
  ChangeManagerAccount = 1,
  CreateSender = 2,
  DeleteSender = 3,
  CreateSenderPublic = 4,
  DeleteSenderPublic = 5,
  SubmitAttestation = 6,
  EvaluateAttestations = 7
}

/**
 * Custom error codes from the Reward Manager program
 * @see {@link https://github.com/AudiusProject/apps/blob/2a37bcff1bb1a82efdf187d1723b3457dc0dcb9b/solana-programs/reward-manager/program/src/error.rs solana-programs/reward-manager/program/src/errors.rs}
 */
export enum RewardManagerErrorCode {
  IncorrectOwner = 0,
  SignCollision,
  WrongSigner,
  NotEnoughSigners,
  Secp256InstructionMissing,
  InstructionLoadError,
  RepeatedSenders,
  SignatureVerificationFailed,
  OperatorCollision,
  AlreadySent,
  IncorrectMessages,
  MessagesOverflow,
  MathOverflow,
  InvalidRecipient
}

/**
 * The UI friendly error messages for each error code.
 * @see {@link https://github.com/AudiusProject/apps/blob/2a37bcff1bb1a82efdf187d1723b3457dc0dcb9b/solana-programs/reward-manager/program/src/error.rs solana-programs/reward-manager/program/src/errors.rs}
 */
export const RewardManagerErrorMessages: Record<
  RewardManagerErrorCode,
  string
> = {
  [RewardManagerErrorCode.IncorrectOwner]:
    'Input account owner is not the program address',
  [RewardManagerErrorCode.SignCollision]:
    'Signature with an already met principal',
  [RewardManagerErrorCode.WrongSigner]: 'Unexpected signer met',
  [RewardManagerErrorCode.NotEnoughSigners]: "Isn't enough signers keys",
  [RewardManagerErrorCode.Secp256InstructionMissing]:
    'Secp256 instruction missing',
  [RewardManagerErrorCode.InstructionLoadError]: 'Instruction load error',
  [RewardManagerErrorCode.RepeatedSenders]: 'Repeated sender',
  [RewardManagerErrorCode.SignatureVerificationFailed]:
    'Signature verification failed',
  [RewardManagerErrorCode.OperatorCollision]:
    'Some signers have same operators',
  [RewardManagerErrorCode.AlreadySent]: 'Funds already sent',
  [RewardManagerErrorCode.IncorrectMessages]: 'Incorrect messages',
  [RewardManagerErrorCode.MessagesOverflow]: 'Messages overflow',
  [RewardManagerErrorCode.MathOverflow]: 'Math overflow',
  [RewardManagerErrorCode.InvalidRecipient]: 'Invalid Recipient'
}
