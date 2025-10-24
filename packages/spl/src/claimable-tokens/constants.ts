export enum ClaimableTokensInstruction {
  Create = 0,
  Transfer = 1
}

/**
 * Custom error codes from the Claimable Tokens program
 * @see {@link https://github.com/AudiusProject/apps/blob/2a37bcff1bb1a82efdf187d1723b3457dc0dcb9b/solana-programs/claimable-tokens/program/src/error.rs solana-programs/claimable-tokens/program/src/error.rs}
 */
export enum ClaimableTokensErrorCode {
  SignatureVerificationFailed = 0,
  Secp256InstructionLosing,
  InstructionLoadError,
  NonceVerificationError
}

/**
 * The UI friendly error messages for each error code.
 * @see {@link https://github.com/AudiusProject/apps/blob/2a37bcff1bb1a82efdf187d1723b3457dc0dcb9b/solana-programs/claimable-tokens/program/src/error.rs solana-programs/claimable-tokens/program/src/error.rs}
 */
export const ClaimableTokensErrorMessages: Record<
  ClaimableTokensErrorCode,
  string
> = {
  [ClaimableTokensErrorCode.SignatureVerificationFailed]:
    'Signature verification failed',
  [ClaimableTokensErrorCode.Secp256InstructionLosing]:
    'Secp256 instruction losing',
  [ClaimableTokensErrorCode.InstructionLoadError]: 'Instruction load error',
  [ClaimableTokensErrorCode.NonceVerificationError]: 'Nonce verification failed'
}
