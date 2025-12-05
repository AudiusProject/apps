//! State transition types
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    msg,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey, hash::Hash,
};

/// Transfer instruction data
/// Size = 32 (Pubkey) + 8 (u64) + 8 (u64)
#[derive(BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq)]
pub struct TransferInstructionData {
    /// Transfer target pub key
    pub target_pubkey: Pubkey,
    /// Amount to transfer
    pub amount: u64,
    /// User level nonce
    pub nonce: u64,
}

/// The message structure for signing a SetAuthority instruction
#[derive(BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq)]
pub struct SignedSetAuthorityData {
    /// A recent blockhash to prevent replays
    pub blockhash: Hash,
    /// The instruction data as a serialized byte array
    pub instruction: Vec<u8>,
    /// The account to act on behalf of
    pub account_pubkey: Pubkey,
}

/// Current program version
pub const PROGRAM_VERSION: u8 = 1;

/// Accounts are created with data zeroed out, so uninitialized state instances
/// will have the version set to 0.
pub const UNINITIALIZED_VERSION: u8 = 0;

/// User nonce account, incremented on each transfer
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct NonceAccount {
    /// Version
    pub version: u8,
    /// Nonce
    pub nonce: u64,
}

impl NonceAccount {
    /// Creates new `NonceAccount`
    pub fn new() -> Self {
        Self {
            version: PROGRAM_VERSION,
            nonce: 0,
        }
    }
}

impl Sealed for NonceAccount {}
impl Pack for NonceAccount {
    // 1 + 8
    const LEN: usize = 9;

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let mut slice = dst;
        self.serialize(&mut slice).unwrap()
    }

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        Self::try_from_slice(src).map_err(|err| {
            msg!("Failed to deserialize");
            msg!(&err.to_string());
            ProgramError::InvalidAccountData
        })
    }
}

impl IsInitialized for NonceAccount {
    fn is_initialized(&self) -> bool {
        self.version != UNINITIALIZED_VERSION
    }
}
