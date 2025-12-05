//! Error types

use num_derive::FromPrimitive;
use num_traits::FromPrimitive;
use solana_program::{
    decode_error::DecodeError,
    msg,
    program_error::{PrintProgramError, ProgramError},
};
use thiserror::Error;

/// Errors that may be returned by the Claimable-tokens program.
#[derive(Clone, Debug, Eq, Error, FromPrimitive, PartialEq)]
pub enum ClaimableProgramError {
    /// Signature verification failed
    #[error("Signature verification failed")]
    SignatureVerificationFailed,
    /// Secp256 instruction losing
    #[error("Secp256 instruction losing")]
    Secp256InstructionLosing,
    /// Instruction load error
    #[error("Instruction load error")]
    InstructionLoadError,
    /// User nonce verification error
    #[error("Nonce verification failed")]
    NonceVerificationError,
    /// Invalid signature data
    #[error("Invalid signature data")]
    InvalidSignatureData,
}
impl From<ClaimableProgramError> for ProgramError {
    fn from(e: ClaimableProgramError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
impl<T> DecodeError<T> for ClaimableProgramError {
    fn type_of() -> &'static str {
        "ClaimableProgramError"
    }
}

impl PrintProgramError for ClaimableProgramError {
    fn print<E>(&self)
    where
        E: 'static + std::error::Error + DecodeError<E> + PrintProgramError + FromPrimitive,
    {
        msg!(&self.to_string())
    }
}

/// Convert ProgramError to ClaimableProgramError
pub fn to_claimable_tokens_error(_e: ProgramError) -> ClaimableProgramError {
    ClaimableProgramError::InstructionLoadError
}
