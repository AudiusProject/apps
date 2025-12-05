#![allow(missing_docs)]
use crate::{
    error::AudiusProgramError,
    state::{VerifiedMessage, TOTAL_VERIFIED_MESSAGES},
    vote_message,
};
use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
};
use std::collections::BTreeSet;

mod signs;
pub use signs::*;

/// Assert `account` is owned by `owner`
pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> ProgramResult {
    if account.owner != owner {
        Err(AudiusProgramError::IncorrectOwner.into())
    } else {
        Ok(())
    }
}

/// Assert unitialized
pub fn assert_uninitialized<T: IsInitialized>(account: &T) -> ProgramResult {
    if account.is_initialized() {
        Err(ProgramError::AccountAlreadyInitialized)
    } else {
        Ok(())
    }
}

/// Assert `account_info`'s key matches `key`
pub fn assert_account_key(account_info: &AccountInfo, key: &Pubkey) -> ProgramResult {
    if *account_info.key != *key {
        Err(ProgramError::InvalidArgument)
    } else {
        Ok(())
    }
}

/// Assert unique senders & operators, and message count <= TOTAL_VERIFIED_MESSAGES
pub fn assert_unique_senders(messages: &[VerifiedMessage]) -> ProgramResult {
    let mut uniq_senders = BTreeSet::new();
    let mut uniq_operators = BTreeSet::new();

    if messages.len() > TOTAL_VERIFIED_MESSAGES {
        return Err(AudiusProgramError::MessagesOverflow.into());
    }

    // Check sender address collision
    if !messages.iter().all(move |x| uniq_senders.insert(x.address)) {
        return Err(AudiusProgramError::RepeatedSenders.into());
    }

    // Check sender operator collision
    if !messages
        .iter()
        .all(move |x| uniq_operators.insert(x.operator))
    {
        return Err(AudiusProgramError::OperatorCollision.into());
    }

    Ok(())
}

/// Assert that each message matches either the valid_message or
/// valid_bot_oracle format, and that at least one message is from the
/// bot oracle
pub fn assert_valid_attestations(
    valid_attestation: &[u8],
    valid_bot_oracle_attestation: &[u8],
    bot_oracle_address: &EthereumAddress,
    messages: &[VerifiedMessage],
) -> ProgramResult {
    let mut oracle_signed = false;

    for VerifiedMessage {
        message, address, ..
    } in messages
    {
        if address == bot_oracle_address {
            if vote_message!(valid_bot_oracle_attestation) != *message {
                return Err(AudiusProgramError::IncorrectMessages.into());
            }

            oracle_signed = true;
        } else if vote_message!(valid_attestation) != *message {
            return Err(AudiusProgramError::IncorrectMessages.into());
        }
    }

    if !oracle_signed {
        return Err(AudiusProgramError::NotEnoughSigners.into());
    }

    Ok(())
}

pub fn assert_initialized<T: IsInitialized>(account: &T) -> ProgramResult {
    if !account.is_initialized() {
        Err(ProgramError::InvalidAccountData)
    } else {
        Ok(())
    }
}

/// Represent compressed ethereum pubkey
pub type EthereumAddress = [u8; 20];

/// Finds a program address, using first 32 bytes of `pubkey` as seed and
/// `program_id` as base
pub fn find_program_address(program_id: &Pubkey, pubkey: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[&pubkey.to_bytes()[..32]], program_id)
}

/// Finds a program address, using first 32 bytes of `pubkey` + `seed` as seed, and
/// `base` as base
pub fn find_program_address_with_seed(
    program_id: &Pubkey,
    base: &Pubkey,
    seed: &[u8],
) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[&base.to_bytes()[..32], seed], program_id)
}

/// Derives an address based on the `reward_manager_authority` and `seed`, where
/// `reward_manager_authority` is itself derived from the `reward_manager` pubkey.
pub fn find_derived_pair(
    program_id: &Pubkey,
    reward_manager: &Pubkey,
    seed: &[u8],
) -> (Pubkey, Pubkey, u8) {
    let (reward_manager_authority, _) = find_program_address(program_id, reward_manager);
    let (derived_address, bump_seed) =
        find_program_address_with_seed(program_id, &reward_manager_authority, seed);

    (reward_manager_authority, derived_address, bump_seed)
}

/// Initialize SPL account instruction.
pub fn spl_initialize_account<'a>(
    account: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    authority: AccountInfo<'a>,
    rent: AccountInfo<'a>,
) -> ProgramResult {
    let ix = spl_token::instruction::initialize_account(
        &spl_token::id(),
        account.key,
        mint.key,
        authority.key,
    )?;

    invoke(&ix, &[account, mint, authority, rent])
}

/// Transfer tokens with program address
#[allow(clippy::too_many_arguments)]
pub fn spl_token_transfer<'a>(
    program_id: &Pubkey,
    reward_manager: &Pubkey,
    source: &AccountInfo<'a>,
    destination: &AccountInfo<'a>,
    authority: &AccountInfo<'a>,
    amount: u64,
) -> ProgramResult {
    let bump_seed = find_program_address(program_id, reward_manager).1;

    let authority_signature_seeds = [&reward_manager.to_bytes()[..32], &[bump_seed]];
    let signers = &[&authority_signature_seeds[..]];

    let tx = spl_token::instruction::transfer(
        &spl_token::id(),
        source.key,
        destination.key,
        authority.key,
        &[],
        amount,
    )?;
    invoke_signed(
        &tx,
        &[source.clone(), destination.clone(), authority.clone()],
        signers,
    )
}

// Burn tokens with program address
#[allow(clippy::too_many_arguments)]
pub fn spl_token_burn<'a>(
    program_id: &Pubkey,
    reward_manager: &Pubkey,
    source: &AccountInfo<'a>,
    mint: &AccountInfo<'a>,
    authority: &AccountInfo<'a>,
    amount: u64,
) -> ProgramResult {
    let bump_seed = find_program_address(program_id, reward_manager).1;

    let authority_signature_seeds = [&reward_manager.to_bytes()[..32], &[bump_seed]];
    let signers = &[&authority_signature_seeds[..]];

    let tx = spl_token::instruction::burn(
        &spl_token::id(),
        source.key,
        mint.key,
        authority.key,
        &[],
        amount,
    )?;
    invoke_signed(
        &tx,
        &[source.clone(), mint.clone(), authority.clone()],
        signers,
    )
}

/// Create account
#[allow(clippy::too_many_arguments)]
pub fn create_account<'a>(
    program_id: &Pubkey,
    from: AccountInfo<'a>,
    to: AccountInfo<'a>,
    space: usize,
    signers_seeds: &[&[&[u8]]],
    rent: &Rent,
) -> ProgramResult {
    let ix = system_instruction::create_account(
        from.key,
        to.key,
        rent.minimum_balance(space),
        space as u64,
        program_id,
    );

    invoke_signed(&ix, &[from, to], signers_seeds)
}

/// Validates that the UserBank derived from `recipient_info` matches the provided `eth_address`.
/// Uses the `mint` associated with the `reward_token_source_info` token account.
pub fn validate_token_account_derivation(
    reward_token_source_info: &AccountInfo,
    recipient_info: &AccountInfo,
    eth_address: EthereumAddress,
) -> ProgramResult {
    let token_account_info =
        spl_token::state::Account::unpack(&reward_token_source_info.data.borrow())?;
    let claimable_tokens_id = claimable_tokens::id();
    let mint = token_account_info.mint;
    let (base_pubkey, _) = find_program_address_with_seed(&claimable_tokens_id, &mint, &[]);
    let seed = bs58::encode(eth_address).into_string();
    let res = Pubkey::create_with_seed(&base_pubkey, seed.as_str(), &spl_token::id())?;
    if res != *recipient_info.key {
        return Err(AudiusProgramError::InvalidRecipient.into());
    }

    Ok(())
}
