//! Instruction types

use crate::{
    processor::{SENDER_SEED_PREFIX, TRANSFER_SEED_PREFIX, VERIFY_TRANSFER_SEED_PREFIX},
    utils::{find_derived_pair, find_program_address, EthereumAddress},
};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    instruction::{AccountMeta, Instruction},
    program_error::ProgramError,
    pubkey::Pubkey,
    system_program, sysvar,
};

/// `InitRewardManager` instruction args
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct InitRewardManagerArgs {
    /// Number of signer votes required for sending rewards
    pub min_votes: u8,
}

/// `CreateSender` instruction args
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct CreateSenderArgs {
    /// Ethereum address
    pub eth_address: EthereumAddress,
    /// Sender operator
    pub operator: EthereumAddress,
}

/// `CreateSenderPublic` instruction args
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct CreateSenderPublicArgs {
    /// Ethereum address
    pub eth_address: EthereumAddress,
    /// Sender operator
    pub operator: EthereumAddress,
}

/// Verify `Transfer` instruction args
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct SubmitAttestationsArgs {
    /// ID generated on backend
    pub id: String,
}

/// `Transfer` instruction args
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct EvaluateAttestationsArgs {
    /// Amount to transfer
    pub amount: u64,
    /// ID generated on backend
    pub id: String,
    /// Recipient's Eth address
    pub eth_recipient: EthereumAddress,
}

/// Instruction definition
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub enum Instructions {
    ///   Initialize Reward manager
    ///
    ///   0. `[writable]` Reward manager - Account that will be initialized as Reward manager.
    ///   1. `[writable]` Token account - The new account that to be initialized as the token account.
    ///   2. `[]` Mint with which the new token account will be associated on initialization.
    ///   3. `[]` Manager account to be set as the Reward manager.
    ///   4. `[]` Reward manager authority.
    ///   5. `[]` Token program
    ///   6. `[]` Rent sysvar
    InitRewardManager(InitRewardManagerArgs),

    ///   Change RewardManager manager account
    ///
    ///   0. `[writable]` Reward manager
    ///   1. `[signer]` Current manager
    ///   2. `[]` New manager
    ChangeManagerAccount,

    ///   Admin method creating new authorized sender
    ///
    ///   0. `[]` Reward manager
    ///   1. `[signer]` Manager account
    ///   2. `[]` Reward manager authority
    ///   3. `[]` Funder account
    ///   4. `[]` Addidable sender
    ///   5. `[]` System program id
    ///   6. `[]` Rent sysvar
    CreateSender(CreateSenderArgs),

    ///   Admin method for removing sender
    ///  
    ///   0. `[]` Reward manager
    ///   1. `[signer]` Manager account
    ///   2. `[]` Reward manager authority
    ///   3. `[writable]` Removed sender
    ///   4. `[]` Refunder account
    DeleteSender,

    ///   Add sender with other senders attesting as proof
    ///
    /// 0. `[]` Reward manager
    /// 1. `[]` Reward manager authority
    /// 2. `[signer]` Funder
    /// 3. `[writable]` new_sender
    /// 4. `[]` Instruction info
    /// 5. `[]` Rent sysvar
    /// 6. `[]` System program id
    /// 7. `[]` Bunch of old senders which prove adding new one
    /// ...
    CreateSenderPublic(CreateSenderPublicArgs),

    ///   Delete sender with other senders attesting as proof
    ///
    ///   0. `[]` Reward manager
    ///   1. `[writable]` Sender account to delete
    ///   2. `[writable]` Refunder account
    ///   3. `[]` Instruction info
    ///   4. `[]` Bunch of senders which prove removing another one
    DeleteSenderPublic,

    ///   Submit attestations
    ///
    ///   0. `[writable]` Verified messages - New or existing account PDA storing verified messages
    ///   1. `[]` Reward manager
    ///   2. `[]` Reward manager authority
    ///   3. `[signer]` Funder
    ///   4. `[]` Sender
    ///   5. `[]` Sysvar rent
    ///   6. `[]` Instruction info
    ///   7. `[]` System program id
    SubmitAttestations(SubmitAttestationsArgs),

    ///   Evaluate attestations, transferring tokens to token recipient
    ///
    ///   0. `[writable]` Verified messages - New or existing account PDA storing verified messages
    ///   1. `[]` Reward manager
    ///   2. `[]` Reward manager authority
    ///   3. `[writable]` Reward token source
    ///   4. `[writable]` Reward token recipient (or token mint if burning)
    ///   5. `[writable]` Transfer account - the account which represents a successful transfer
    ///   6. `[]` Bot oracle - the ethereum public address of the oracle
    ///   7. `[signer]` Payer
    ///   8. `[]` Sysvar rent
    ///   9. `[]` Token program id
    ///  10. `[]` System program id
    EvaluateAttestations(EvaluateAttestationsArgs),
}

/// Create `InitRewardManager` instruction
pub fn init(
    program_id: &Pubkey,
    reward_manager: &Pubkey,
    token_account: &Pubkey,
    mint: &Pubkey,
    manager: &Pubkey,
    min_votes: u8,
) -> Result<Instruction, ProgramError> {
    let init_data = Instructions::InitRewardManager(InitRewardManagerArgs { min_votes });
    let data = init_data.try_to_vec()?;

    let (reward_manager_authority, _) = find_program_address(program_id, reward_manager);

    let accounts = vec![
        AccountMeta::new(*reward_manager, false),
        AccountMeta::new(*token_account, false),
        AccountMeta::new_readonly(*mint, false),
        AccountMeta::new_readonly(*manager, false),
        AccountMeta::new_readonly(reward_manager_authority, false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
    ];
    Ok(Instruction {
        program_id: *program_id,
        accounts,
        data,
    })
}

/// Create `ChangeManagerAccount` instruction
pub fn change_manager_authority(
    program_id: &Pubkey,
    reward_manager: &Pubkey,
    current_authority: &Pubkey,
    new_authority: &Pubkey,
) -> Result<Instruction, ProgramError> {
    let data = Instructions::ChangeManagerAccount.try_to_vec()?;

    let accounts = vec![
        AccountMeta::new(*reward_manager, false),
        AccountMeta::new_readonly(*current_authority, true),
        AccountMeta::new_readonly(*new_authority, false),
    ];

    Ok(Instruction {
        program_id: *program_id,
        accounts,
        data,
    })
}

/// Create `CreateSender` instruction
pub fn create_sender(
    program_id: &Pubkey,
    reward_manager: &Pubkey,
    manager_account: &Pubkey,
    funder_account: &Pubkey,
    eth_address: EthereumAddress,
    operator: EthereumAddress,
) -> Result<Instruction, ProgramError> {
    let create_data = Instructions::CreateSender(CreateSenderArgs {
        eth_address,
        operator,
    });
    let data = create_data.try_to_vec()?;

    let (reward_manager_authority, derived_address, _) = find_derived_pair(
        program_id,
        reward_manager,
        [SENDER_SEED_PREFIX.as_ref(), eth_address.as_ref()]
            .concat()
            .as_ref(),
    );

    let accounts = vec![
        AccountMeta::new_readonly(*reward_manager, false),
        AccountMeta::new_readonly(*manager_account, true),
        AccountMeta::new_readonly(reward_manager_authority, false),
        AccountMeta::new(*funder_account, true),
        AccountMeta::new(derived_address, false),
        AccountMeta::new_readonly(system_program::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
    ];

    Ok(Instruction {
        program_id: *program_id,
        accounts,
        data,
    })
}

/// Create `DeleteSender` instruction
pub fn delete_sender(
    program_id: &Pubkey,
    reward_manager: &Pubkey,
    manager_account: &Pubkey,
    refunder_account: &Pubkey,
    eth_address: EthereumAddress,
) -> Result<Instruction, ProgramError> {
    let delete_data = Instructions::DeleteSender;
    let data = delete_data.try_to_vec()?;

    let (_, derived_address, _) = find_derived_pair(
        program_id,
        reward_manager,
        [SENDER_SEED_PREFIX.as_ref(), eth_address.as_ref()]
            .concat()
            .as_ref(),
    );

    let accounts = vec![
        AccountMeta::new_readonly(*reward_manager, false),
        AccountMeta::new_readonly(*manager_account, true),
        AccountMeta::new(derived_address, false),
        AccountMeta::new(*refunder_account, false),
        AccountMeta::new_readonly(system_program::id(), false),
    ];

    Ok(Instruction {
        program_id: *program_id,
        accounts,
        data,
    })
}

/// Create `CreateSenderPublic` instruction
pub fn create_sender_public<'a, I>(
    program_id: &Pubkey,
    reward_manager: &Pubkey,
    funder: &Pubkey,
    eth_address: EthereumAddress,
    operator: EthereumAddress,
    signers: I,
) -> Result<Instruction, ProgramError>
where
    I: IntoIterator<Item = &'a Pubkey>,
{
    let data = Instructions::CreateSenderPublic(CreateSenderPublicArgs {
        eth_address,
        operator,
    })
    .try_to_vec()?;

    let (reward_manager_authority, derived_address, _) = find_derived_pair(
        program_id,
        reward_manager,
        [SENDER_SEED_PREFIX.as_ref(), eth_address.as_ref()]
            .concat()
            .as_ref(),
    );

    let mut accounts = vec![
        AccountMeta::new_readonly(*reward_manager, false),
        AccountMeta::new_readonly(reward_manager_authority, false),
        AccountMeta::new(*funder, true),
        AccountMeta::new(derived_address, false),
        AccountMeta::new_readonly(sysvar::instructions::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(system_program::id(), false),
    ];
    let iter = signers
        .into_iter()
        .map(|i| AccountMeta::new_readonly(*i, false));
    accounts.extend(iter);

    Ok(Instruction {
        program_id: *program_id,
        accounts,
        data,
    })
}

/// Create `DeleteSenderPublic` instruction
pub fn delete_sender_public<'a, I>(
    program_id: &Pubkey,
    reward_manager: &Pubkey,
    refunder_account: &Pubkey,
    eth_address: EthereumAddress,
    signers: I,
) -> Result<Instruction, ProgramError>
where
    I: IntoIterator<Item = &'a Pubkey>,
{
    let data = Instructions::DeleteSenderPublic.try_to_vec()?;

    let (_, derived_address, _) = find_derived_pair(
        program_id,
        reward_manager,
        [SENDER_SEED_PREFIX.as_ref(), eth_address.as_ref()]
            .concat()
            .as_ref(),
    );

    let mut accounts = vec![
        AccountMeta::new_readonly(*reward_manager, false),
        AccountMeta::new(derived_address, false),
        AccountMeta::new(*refunder_account, false),
        AccountMeta::new_readonly(sysvar::instructions::id(), false),
    ];
    let iter = signers
        .into_iter()
        .map(|i| AccountMeta::new_readonly(*i, false));
    accounts.extend(iter);

    Ok(Instruction {
        program_id: *program_id,
        accounts,
        data,
    })
}

/// Create `SubmitAttestations` instruction
pub fn submit_attestations(
    program_id: &Pubkey,
    reward_manager: &Pubkey,
    sender: &Pubkey,
    funder: &Pubkey,
    id: String,
) -> Result<Instruction, ProgramError> {
    let data =
        Instructions::SubmitAttestations(SubmitAttestationsArgs { id: id.clone() }).try_to_vec()?;

    let (reward_manager_authority, verified_messages, _) = find_derived_pair(
        program_id,
        reward_manager,
        [VERIFY_TRANSFER_SEED_PREFIX.as_bytes().as_ref(), id.as_ref()]
            .concat()
            .as_ref(),
    );

    let accounts = vec![
        AccountMeta::new(verified_messages, false),
        AccountMeta::new_readonly(*reward_manager, false),
        AccountMeta::new_readonly(reward_manager_authority, false),
        AccountMeta::new(*funder, true),
        AccountMeta::new_readonly(*sender, false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(sysvar::instructions::id(), false),
        AccountMeta::new_readonly(system_program::id(), false),
    ];

    Ok(Instruction {
        program_id: *program_id,
        accounts,
        data,
    })
}

/// Create `Evaluate attestation` instruction
#[allow(clippy::too_many_arguments)]
pub fn evaluate_attestations(
    program_id: &Pubkey,
    verified_messages: &Pubkey,
    reward_manager: &Pubkey,
    reward_token_source: &Pubkey,
    reward_token_recipient_or_mint: &Pubkey,
    bot_oracle: &Pubkey,
    payer: &Pubkey,
    amount: u64,
    id: String,
    eth_recipient: [u8; 20],
) -> Result<Instruction, ProgramError> {
    let data = Instructions::EvaluateAttestations(EvaluateAttestationsArgs {
        amount,
        id: id.clone(),
        eth_recipient,
    })
    .try_to_vec()?;

    let (reward_manager_authority, derived_address, _) = find_derived_pair(
        program_id,
        reward_manager,
        [TRANSFER_SEED_PREFIX.as_bytes().as_ref(), id.as_ref()]
            .concat()
            .as_ref(),
    );

    let accounts = vec![
        AccountMeta::new(*verified_messages, false),
        AccountMeta::new_readonly(*reward_manager, false),
        AccountMeta::new_readonly(reward_manager_authority, false),
        AccountMeta::new(*reward_token_source, false),
        AccountMeta::new(*reward_token_recipient_or_mint, false),
        AccountMeta::new(derived_address, false),
        AccountMeta::new_readonly(*bot_oracle, false),
        AccountMeta::new(*payer, true),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(system_program::id(), false),
    ];

    Ok(Instruction {
        program_id: *program_id,
        accounts,
        data,
    })
}
