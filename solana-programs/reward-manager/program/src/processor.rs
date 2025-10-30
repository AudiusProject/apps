//! Program state processor

use crate::{
    error::AudiusProgramError,
    instruction::{
        CreateSenderArgs, CreateSenderPublicArgs, EvaluateAttestationsArgs, InitRewardManagerArgs,
        Instructions, SubmitAttestationsArgs,
    },
    state::{
        RewardManager, SenderAccount, VerifiedMessage, VerifiedMessages, ADD_SENDER_MESSAGE_PREFIX,
        DELETE_SENDER_MESSAGE_PREFIX, UNINITIALIZED_VERSION
    },
    utils::*,
};
use borsh::BorshDeserialize;
use solana_program::{
    account_info::next_account_info,
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    program::{invoke, invoke_signed},
    pubkey::Pubkey,
    system_instruction,
    rent::Rent,
    sysvar::Sysvar,
};

/// Sender program account seed
pub const SENDER_SEED_PREFIX: &str = "S_";
/// Transfer program account seed
pub const TRANSFER_SEED_PREFIX: &str = "T_";
/// Verify transfer program account seed
pub const VERIFY_TRANSFER_SEED_PREFIX: &str = "V_";
/// Transfer account space
pub const TRANSFER_ACC_SPACE: usize = 1;

/// Program state handler.
pub struct Processor;

impl Processor {
    /// Transfer all the SOL from source to receiver
    pub fn transfer_all(source: &AccountInfo, receiver: &AccountInfo) -> Result<(), ProgramError> {
        let mut from = source.try_borrow_mut_lamports()?;
        let mut to = receiver.try_borrow_mut_lamports()?;
        **to += **from;
        **from = 0;
        Ok(())
    }

    /// Process init instruction
    /// Initializes the token account and creates a RewardManager account
    /// with `min_votes`, `token_account_info`, and `manager_info`.
    #[allow(clippy::too_many_arguments)]
    fn process_init_instruction<'a>(
        program_id: &Pubkey,
        reward_manager_info: &AccountInfo<'a>,
        token_account_info: &AccountInfo<'a>,
        mint_info: &AccountInfo<'a>,
        manager_info: &AccountInfo<'a>,
        authority_info: &AccountInfo<'a>,
        _spl_token_info: &AccountInfo<'a>,
        rent: &AccountInfo<'a>,
        min_votes: u8,
    ) -> ProgramResult {
        assert_owned_by(reward_manager_info, program_id)?;

        let mut reward_manager =
            RewardManager::unpack_unchecked(&reward_manager_info.data.borrow())?;
        assert_uninitialized(&reward_manager)?;

        // Find the reward_manager_authority, and test it against
        // `authority_info` to ensure the correct
        // account was passed in.
        let (reward_manager_authority, _) =
            find_program_address(program_id, reward_manager_info.key);
        if reward_manager_authority != *authority_info.key {
            return Err(ProgramError::InvalidAccountData);
        }

        // Initialize the token account
        spl_initialize_account(
            token_account_info.clone(),
            mint_info.clone(),
            authority_info.clone(),
            rent.clone(),
        )?;

        reward_manager = RewardManager::new(*token_account_info.key, *manager_info.key, min_votes);
        RewardManager::pack(reward_manager, *reward_manager_info.data.borrow_mut())?;

        Ok(())
    }

    /// Process change_manager_account instruction.
    /// Changes the `manager` field on the `RewardManager` account,
    /// provided that the transaction is signed by the current manager.
    fn process_change_manager_account<'a>(
        reward_manager_info: &AccountInfo<'a>,
        current_manager_info: &AccountInfo<'a>,
        new_manager_info: &AccountInfo<'a>,
    ) -> ProgramResult {
        // Note: we don't have to assert that we own the `reward_manager` account
        // as we would normally, because in writing to it the runtime
        // enforces ownership
        if !current_manager_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let mut reward_manager = RewardManager::unpack(&reward_manager_info.data.borrow())?;
        assert_account_key(current_manager_info, &reward_manager.manager)?;

        reward_manager.manager = *new_manager_info.key;

        RewardManager::pack(reward_manager, *reward_manager_info.data.borrow_mut())?;

        Ok(())
    }

    /// Process create_sender instruction.
    /// Creates a new `Sender` account, owned by the program.
    /// Must be signed by the `manager_account_info`
    #[allow(clippy::too_many_arguments)]
    fn process_create_sender<'a>(
        program_id: &Pubkey,
        eth_address: EthereumAddress,
        operator: EthereumAddress,
        reward_manager_info: &AccountInfo<'a>,
        manager_account_info: &AccountInfo<'a>,
        authority_info: &AccountInfo<'a>,
        funder_account_info: &AccountInfo<'a>,
        sender_info: &AccountInfo<'a>,
        _sys_prog_info: &AccountInfo<'a>,
        rent_info: &AccountInfo<'a>,
    ) -> ProgramResult {
        if !manager_account_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        assert_owned_by(reward_manager_info, program_id)?;

        let reward_manager = RewardManager::unpack(&reward_manager_info.data.borrow())?;
        assert_account_key(manager_account_info, &reward_manager.manager)?;

        // Derive the sender address from the eth_address and sender_seed_prefix, and assert it matches `sender_info`
        let sender_seed = [SENDER_SEED_PREFIX.as_ref(), eth_address.as_ref()].concat();
        let (reward_manager_authority, derived_sender_address, bump_seed) =
            find_derived_pair(program_id, reward_manager_info.key, sender_seed.as_ref());

        assert_account_key(authority_info, &reward_manager_authority)?;
        assert_account_key(sender_info, &derived_sender_address)?;

        // Create the account
        let signers_seeds = &[
            &reward_manager_authority.to_bytes()[..32],
            &sender_seed.as_slice(),
            &[bump_seed],
        ];

        let rent = Rent::from_account_info(rent_info)?;

        // Calculate if additional lamports are required to store sender info
        // just in case someone is trying to deny its creation.
        let sender_acct_lamports = sender_info.lamports();
        let required_lamports = rent
            .minimum_balance(SenderAccount::LEN)
            .saturating_sub(sender_acct_lamports);

        // Transfer required lamports from payer to sender account if necessary.
        if required_lamports > 0 {
            invoke(
                &system_instruction::transfer(funder_account_info.key, sender_info.key, required_lamports),
                &[
                    funder_account_info.clone(),
                    sender_info.clone()
                ],
            )?;
        }

        invoke_signed(
            &system_instruction::allocate(sender_info.key, SenderAccount::LEN as u64),
            &[sender_info.clone()],
            &[signers_seeds],
        )?;

        invoke_signed(
            &system_instruction::assign(sender_info.key, program_id),
            &[sender_info.clone()],
            &[signers_seeds],
        )?;

        let sender_account = SenderAccount::new(*reward_manager_info.key, eth_address, operator);
        SenderAccount::pack(sender_account, *sender_info.data.borrow_mut())?;

        Ok(())
    }

    /// Process `delete_sender` instruction.
    /// Deletes a sender by transfering all of it's balance to the `refunder_account`.
    /// Must be signed by the `manager_account_info`.
    fn process_delete_sender<'a>(
        program_id: &Pubkey,
        reward_manager_info: &AccountInfo<'a>,
        manager_account_info: &AccountInfo<'a>,
        sender_info: &AccountInfo<'a>,
        refunder_account_info: &AccountInfo<'a>,
        _sys_prog: &AccountInfo<'a>,
    ) -> ProgramResult {
        if !manager_account_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        assert_owned_by(reward_manager_info, program_id)?;
        assert_owned_by(sender_info, program_id)?;

        let reward_manager = RewardManager::unpack(&reward_manager_info.data.borrow())?;
        assert_account_key(manager_account_info, &reward_manager.manager)?;

        let sender_account = SenderAccount::unpack(&sender_info.data.borrow())?;
        assert_account_key(reward_manager_info, &sender_account.reward_manager)?;

        Self::transfer_all(sender_info, refunder_account_info)?;

        Ok(())
    }

    /// Process `delete_sender_public` instruction.
    /// Ensures signers are correct, then deletes the `sender_info`
    /// by transferring its balance to `refunder_info`.
    fn process_delete_sender_public<'a>(
        program_id: &Pubkey,
        reward_manager_info: &AccountInfo<'a>,
        sender_info: &AccountInfo<'a>,
        refunder_info: &AccountInfo<'a>,
        signers_info: Vec<&AccountInfo>,
        instructions_info: &AccountInfo<'a>,
    ) -> ProgramResult {
        assert_owned_by(reward_manager_info, program_id)?;
        assert_owned_by(sender_info, program_id)?;

        let reward_manager = RewardManager::unpack(&reward_manager_info.data.borrow())?;
        let sender_account = SenderAccount::unpack(&sender_info.data.borrow())?;

        // Verify we have a sufficient amount of signers
        if signers_info.len() < reward_manager.min_votes.into() {
            return Err(AudiusProgramError::NotEnoughSigners.into());
        }

        // Verify signers are as expected
        validate_secp_add_delete_sender(
            program_id,
            reward_manager_info.key,
            instructions_info,
            signers_info.clone(),
            signers_info.len(),
            sender_account.eth_address,
            DELETE_SENDER_MESSAGE_PREFIX,
        )?;

        assert_account_key(reward_manager_info, &sender_account.reward_manager)?;

        Self::transfer_all(sender_info, refunder_info)?;

        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    fn process_create_sender_public<'a>(
        program_id: &Pubkey,
        reward_manager_info: &AccountInfo<'a>,
        authority_info: &AccountInfo<'a>,
        funder_info: &AccountInfo<'a>,
        new_sender_info: &AccountInfo<'a>,
        instructions_info: &AccountInfo<'a>,
        rent_info: &AccountInfo<'a>,
        signers_info: Vec<&AccountInfo>,
        eth_address: EthereumAddress,
        operator: EthereumAddress,
    ) -> ProgramResult {
        assert_owned_by(reward_manager_info, program_id)?;

        let reward_manager = RewardManager::unpack(&reward_manager_info.data.borrow())?;

        // Verify we have a sufficient amount of signers
        if signers_info.len() < reward_manager.min_votes.into() {
            return Err(AudiusProgramError::NotEnoughSigners.into());
        }

        // Verify signers are as expected
        validate_secp_add_delete_sender(
            program_id,
            reward_manager_info.key,
            instructions_info,
            signers_info.clone(),
            signers_info.len(),
            eth_address,
            ADD_SENDER_MESSAGE_PREFIX,
        )?;

        // Ensure `new_sender_info` matches `derived_sender_info`, generated
        // from eth address
        let sender_seed = [SENDER_SEED_PREFIX.as_ref(), eth_address.as_ref()].concat();
        let (reward_manager_authority, derived_sender_info, bump_seed) =
            find_derived_pair(program_id, reward_manager_info.key, sender_seed.as_ref());

        assert_account_key(authority_info, &reward_manager_authority)?;
        assert_account_key(new_sender_info, &derived_sender_info)?;

        // Create the new sender account
        let signers_seeds = &[
            &reward_manager_authority.to_bytes()[..32],
            &sender_seed.as_slice(),
            &[bump_seed],
        ];

        let rent = Rent::from_account_info(rent_info)?;

        // Calculate if additional lamports are required to store sender info
        // just in case someone is trying to deny its creation.
        let sender_acct_lamports = new_sender_info.lamports();
        let required_lamports = rent
            .minimum_balance(SenderAccount::LEN)
            .saturating_sub(sender_acct_lamports);

        // Transfer required lamports from payer to sender account if necessary.
        if required_lamports > 0 {
            invoke(
                &system_instruction::transfer(funder_info.key, new_sender_info.key, required_lamports),
                &[
                    funder_info.clone(),
                    new_sender_info.clone()
                ],
            )?;
        }

        invoke_signed(
            &system_instruction::allocate(new_sender_info.key, SenderAccount::LEN as u64),
            &[new_sender_info.clone()],
            &[signers_seeds],
        )?;

        invoke_signed(
            &system_instruction::assign(new_sender_info.key, program_id),
            &[new_sender_info.clone()],
            &[signers_seeds],
        )?;

        let sender_account = SenderAccount::new(*reward_manager_info.key, eth_address, operator);
        SenderAccount::pack(sender_account, *new_sender_info.data.borrow_mut())?;

        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    fn process_submit_attestations<'a>(
        program_id: &Pubkey,
        verified_messages_info: &AccountInfo<'a>,
        reward_manager_info: &AccountInfo<'a>,
        authority_info: &AccountInfo<'a>,
        funder_info: &AccountInfo<'a>,
        rent_info: &AccountInfo<'a>,
        sender_info: &AccountInfo<'a>,
        instruction_info: &AccountInfo<'a>,
        verify_transfer_data: SubmitAttestationsArgs,
    ) -> ProgramResult {
        assert_owned_by(reward_manager_info, program_id)?;
        assert_owned_by(sender_info, program_id)?;

        // Retrieve the sender account, assert that
        // the sender's `reward_manager` is this `reward_manager`.
        let sender_account = SenderAccount::unpack(&sender_info.data.borrow())?;
        assert_account_key(reward_manager_info, &sender_account.reward_manager)?;

        // Derive the verified messages account from the transfer_data and seed prefix,
        // and ensure that the account matches `verified_messages_info` before proceeding.
        let verified_messages_account_seed = [
            VERIFY_TRANSFER_SEED_PREFIX.as_bytes().as_ref(),
            verify_transfer_data.id.as_ref(),
        ]
        .concat();
        let (reward_manager_authority, derived_verified_messages_account, bump_seed) =
            find_derived_pair(
                program_id,
                reward_manager_info.key,
                verified_messages_account_seed.as_ref(),
            );
        assert_account_key(authority_info, &reward_manager_authority)?;
        assert_account_key(verified_messages_info, &derived_verified_messages_account)?;

        // If the verified messages account doesn't exist, create it. Otherwise,
        // ensure that we own it before proceeding.
        let signers_seeds = &[
            &reward_manager_authority.to_bytes()[..32],
            &verified_messages_account_seed.as_slice(),
            &[bump_seed],
        ];
        let rent = Rent::from_account_info(rent_info)?;

        // Calculate if additional lamports are required to store verified_messages_info
        // just in case someone is trying to deny its creation.
        let verified_messages_acct_lamports = verified_messages_info.lamports();
        let required_lamports = rent
            .minimum_balance(VerifiedMessages::LEN)
            .saturating_sub(verified_messages_acct_lamports);

        // Transfer required lamports from payer to verified messages account if necessary.
        if required_lamports > 0 {
            invoke(
                &system_instruction::transfer(funder_info.key, verified_messages_info.key, required_lamports),
                &[
                    funder_info.clone(),
                    verified_messages_info.clone()
                ],
            )?;
        }

        // If the verified messages account is empty / doesn't exist yet, create it.
        let verified_messages_acct_is_empty = verified_messages_info.try_data_is_empty().unwrap_or(true);
        if verified_messages_acct_is_empty {
            invoke_signed(
                &system_instruction::allocate(verified_messages_info.key, VerifiedMessages::LEN as u64),
                &[verified_messages_info.clone()],
                &[signers_seeds],
            )?;

            invoke_signed(
                &system_instruction::assign(verified_messages_info.key, program_id),
                &[verified_messages_info.clone()],
                &[signers_seeds],
            )?;
        } else {
            assert_owned_by(verified_messages_info, program_id)?;
        }

        // Unpack verified messages, initializing it if needed.
        let mut verified_messages =
            VerifiedMessages::unpack_unchecked(&verified_messages_info.data.borrow())?;
        if verified_messages.is_initialized() {
            assert_account_key(reward_manager_info, &verified_messages.reward_manager)?;

            // If messages account is full from previous attempt, reset it
            let reward_manager = RewardManager::unpack(&reward_manager_info.data.borrow())?;
            if verified_messages.messages.len() >= (reward_manager.min_votes + 1) as usize {
                verified_messages.messages.clear()
            }
        } else {
            verified_messages = VerifiedMessages::new(*reward_manager_info.key);
        }

        // Check that that previous instruction was a signed vote message,
        // signed by the `sender_account`'s eth address, adding it to the verified_messages
        // account if so.
        let message =
            validate_secp_submit_attestation(instruction_info, &sender_account.eth_address)?;

        verified_messages.add(VerifiedMessage {
            address: sender_account.eth_address,
            message,
            operator: sender_account.operator,
        });

        // Check unique senders & operators
        assert_unique_senders(&verified_messages.messages)?;

        VerifiedMessages::pack(verified_messages, *verified_messages_info.data.borrow_mut())?;

        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    fn process_evaluate_attestations<'a>(
        program_id: &Pubkey,
        verified_messages_info: &AccountInfo<'a>,
        reward_manager_info: &AccountInfo<'a>,
        reward_manager_authority_info: &AccountInfo<'a>,
        reward_token_source_info: &AccountInfo<'a>,
        reward_token_recipient_or_mint_info: &AccountInfo<'a>,
        transfer_account_info: &AccountInfo<'a>,
        bot_oracle_info: &AccountInfo<'a>,
        payer_info: &AccountInfo<'a>,
        rent_info: &AccountInfo<'a>,
        transfer_data: EvaluateAttestationsArgs,
    ) -> ProgramResult {
        let rent = &Rent::from_account_info(rent_info)?;

        assert_owned_by(verified_messages_info, program_id)?;
        assert_owned_by(reward_manager_info, program_id)?;
        assert_owned_by(bot_oracle_info, program_id)?;

        let reward_manager = RewardManager::unpack(&reward_manager_info.data.borrow())?;

        let mut verified_messages = VerifiedMessages::unpack(&verified_messages_info.data.borrow())?;
        assert_initialized(&verified_messages)?;

        // Ensure the transfer account doesn't yet exist
        let transfer_acct_is_empty = transfer_account_info.try_data_is_empty().unwrap_or(true);
        if !transfer_acct_is_empty {
            return Err(AudiusProgramError::AlreadySent.into());
        }

        // Check signs for minimum required votes, accounting for extra bot oracle
        // attestation
        if verified_messages.messages.len() != (reward_manager.min_votes + 1) as usize {
            return Err(AudiusProgramError::NotEnoughSigners.into());
        }

        let bot_oracle = SenderAccount::unpack(&bot_oracle_info.data.borrow())?;
        assert_account_key(reward_manager_info, &bot_oracle.reward_manager)?;

        // Valid senders message
        let valid_message = [
            transfer_data.eth_recipient.as_ref(),
            b"_",
            transfer_data.amount.to_le_bytes().as_ref(),
            b"_",
            transfer_data.id.as_ref(),
            b"_",
            bot_oracle.eth_address.as_ref(),
        ]
        .concat();

        // Valid bot oracle message
        let valid_bot_oracle_message = [
            transfer_data.eth_recipient.as_ref(),
            b"_",
            transfer_data.amount.to_le_bytes().as_ref(),
            b"_",
            transfer_data.id.as_ref(),
        ]
        .concat();

        // Assert messages are in the expected format
        assert_valid_attestations(
            &valid_message,
            &valid_bot_oracle_message,
            &bot_oracle.eth_address,
            &verified_messages.messages,
        )?;

        if transfer_data.eth_recipient == EthereumAddress::default() {
            msg!("Burning reward tokens as recipient is zero address");
            // Burn the reward
            spl_token_burn(
                program_id,
                &reward_manager_info.key,
                reward_token_source_info,
                reward_token_recipient_or_mint_info,
                reward_manager_authority_info,
                transfer_data.amount,
            )?;
        } else {
            // Assert the rewards_token_recipient_info is indeed the UserBank
            // derived from the transfer_data.eth_recipient
            validate_token_account_derivation(
                &reward_token_source_info,
                &reward_token_recipient_or_mint_info,
                transfer_data.eth_recipient,
            )?;
            // Transfer reward tokens to user
            spl_token_transfer(
                program_id,
                &reward_manager_info.key,
                reward_token_source_info,
                reward_token_recipient_or_mint_info,
                reward_manager_authority_info,
                transfer_data.amount,
            )?;
        }

        // Create the transfer account to represent this disbursement,
        // preventing the same transfer_data from being used twice.
        let transfer_account_seed = [
            TRANSFER_SEED_PREFIX.as_bytes().as_ref(),
            transfer_data.id.as_ref(),
        ]
        .concat();
        let (reward_manager_authority, derived_transfer_account, bump_seed) = find_derived_pair(
            program_id,
            reward_manager_info.key,
            transfer_account_seed.as_ref(),
        );

        assert_account_key(transfer_account_info, &derived_transfer_account)?;

        let signers_seeds = &[
            &reward_manager_authority.to_bytes()[..32],
            &transfer_account_seed.as_slice(),
            &[bump_seed],
        ];

        // Calculate if additional lamports are required to store transfer_account_info
        // just in case someone is trying to deny its creation.
        let transfer_acct_lamports = transfer_account_info.lamports();

        let required_lamports = rent
            .minimum_balance(TRANSFER_ACC_SPACE)
            .saturating_sub(transfer_acct_lamports);

        // Transfer required lamports from payer to transfer account if necessary.
        if required_lamports > 0 {
            invoke(
                &system_instruction::transfer(payer_info.key, transfer_account_info.key, required_lamports),
                &[
                    payer_info.clone(),
                    transfer_account_info.clone()
                ],
            )?;
        }

        // Allocate 1 byte to use transfer_account_info to prevent repeat invocations.
        // This is checked at the beginning of the function in borrow_data.
        invoke_signed(
            &system_instruction::allocate(transfer_account_info.key, TRANSFER_ACC_SPACE as u64),
            &[transfer_account_info.clone()],
            &[signers_seeds],
        )?;

        invoke_signed(
            &system_instruction::assign(transfer_account_info.key, program_id),
            &[transfer_account_info.clone()],
            &[signers_seeds],
        )?;

        // Delete verified messages account by zeroing its rent
        let verified_messages_lamports = verified_messages_info.lamports();
        let payer_lamports = payer_info.lamports();

        **verified_messages_info.lamports.borrow_mut() = 0u64;
        verified_messages.version = UNINITIALIZED_VERSION;
        VerifiedMessages::pack(verified_messages, *verified_messages_info.data.borrow_mut())?;
        **payer_info.lamports.borrow_mut() = payer_lamports
            .checked_add(verified_messages_lamports)
            .ok_or(AudiusProgramError::MathOverflow)?;

        Ok(())
    }

    /// Processes an instruction
    pub fn process_instruction(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        input: &[u8],
    ) -> ProgramResult {
        let instruction = Instructions::try_from_slice(input)?;
        let account_info_iter = &mut accounts.iter();

        match instruction {
            Instructions::InitRewardManager(InitRewardManagerArgs { min_votes }) => {
                msg!("Instruction: InitRewardManager");

                let reward_manager = next_account_info(account_info_iter)?;
                let token_account = next_account_info(account_info_iter)?;
                let mint = next_account_info(account_info_iter)?;
                let manager = next_account_info(account_info_iter)?;
                let authority = next_account_info(account_info_iter)?;
                let _spl_token = next_account_info(account_info_iter)?;
                let rent = next_account_info(account_info_iter)?;

                Self::process_init_instruction(
                    program_id,
                    reward_manager,
                    token_account,
                    mint,
                    manager,
                    authority,
                    _spl_token,
                    rent,
                    min_votes,
                )
            }
            Instructions::ChangeManagerAccount => {
                msg!("Instruction: ChangeManagerAccount");

                let reward_manager = next_account_info(account_info_iter)?;
                let current_authority = next_account_info(account_info_iter)?;
                let new_authority = next_account_info(account_info_iter)?;

                Self::process_change_manager_account(
                    reward_manager,
                    current_authority,
                    new_authority,
                )
            }
            Instructions::CreateSender(CreateSenderArgs {
                eth_address,
                operator,
            }) => {
                msg!("Instruction: CreateSender");

                let reward_manager = next_account_info(account_info_iter)?;
                let manager_account = next_account_info(account_info_iter)?;
                let authority = next_account_info(account_info_iter)?;
                let funder_account = next_account_info(account_info_iter)?;
                let sender = next_account_info(account_info_iter)?;
                let sys_prog = next_account_info(account_info_iter)?;
                let rent = next_account_info(account_info_iter)?;

                Self::process_create_sender(
                    program_id,
                    eth_address,
                    operator,
                    reward_manager,
                    manager_account,
                    authority,
                    funder_account,
                    sender,
                    sys_prog,
                    rent,
                )
            }
            Instructions::DeleteSender => {
                msg!("Instruction: DeleteSender");

                let reward_manager = next_account_info(account_info_iter)?;
                let manager_account = next_account_info(account_info_iter)?;
                let sender = next_account_info(account_info_iter)?;
                let refunder = next_account_info(account_info_iter)?;
                let sys_prog = next_account_info(account_info_iter)?;

                Self::process_delete_sender(
                    program_id,
                    reward_manager,
                    manager_account,
                    sender,
                    refunder,
                    sys_prog,
                )
            }
            Instructions::CreateSenderPublic(CreateSenderPublicArgs {
                eth_address,
                operator,
            }) => {
                msg!("Instruction: CreateSenderPublic");

                let reward_manager = next_account_info(account_info_iter)?;
                let authority = next_account_info(account_info_iter)?;
                let funder = next_account_info(account_info_iter)?;
                let new_sender = next_account_info(account_info_iter)?;
                let instructions_info = next_account_info(account_info_iter)?;
                let rent = next_account_info(account_info_iter)?;
                let _system_program = next_account_info(account_info_iter)?;
                let signers = account_info_iter.collect::<Vec<&AccountInfo>>();

                Self::process_create_sender_public(
                    program_id,
                    reward_manager,
                    authority,
                    funder,
                    new_sender,
                    instructions_info,
                    rent,
                    signers,
                    eth_address,
                    operator,
                )
            }
            Instructions::DeleteSenderPublic => {
                msg!("Instruction: DeleteSenderPublic");
                let reward_manager = next_account_info(account_info_iter)?;
                let sender_account = next_account_info(account_info_iter)?;
                let refunder = next_account_info(account_info_iter)?;
                let instructions_info = next_account_info(account_info_iter)?;
                let signers = account_info_iter.collect::<Vec<&AccountInfo>>();

                Self::process_delete_sender_public(
                    program_id,
                    reward_manager,
                    sender_account,
                    refunder,
                    signers,
                    instructions_info,
                )
            }
            Instructions::SubmitAttestations(SubmitAttestationsArgs { id }) => {
                msg!("Instruction: SubmitAttestations");

                let verified_messages = next_account_info(account_info_iter)?;
                let reward_manager = next_account_info(account_info_iter)?;
                let authority = next_account_info(account_info_iter)?;
                let funder_info = next_account_info(account_info_iter)?;
                let sender = next_account_info(account_info_iter)?;
                let rent_info = next_account_info(account_info_iter)?;
                let instructions_info = next_account_info(account_info_iter)?;
                let _system_program_id = next_account_info(account_info_iter)?;

                Self::process_submit_attestations(
                    program_id,
                    verified_messages,
                    reward_manager,
                    authority,
                    funder_info,
                    rent_info,
                    sender,
                    instructions_info,
                    SubmitAttestationsArgs { id },
                )
            }
            Instructions::EvaluateAttestations(EvaluateAttestationsArgs {
                amount,
                id,
                eth_recipient,
            }) => {
                msg!("Instruction: Transfer");

                let verified_messages_info = next_account_info(account_info_iter)?;
                let reward_manager_info = next_account_info(account_info_iter)?;
                let reward_manager_authority_info = next_account_info(account_info_iter)?;
                let reward_token_source_info = next_account_info(account_info_iter)?;
                let reward_token_recipient_info = next_account_info(account_info_iter)?;
                let transfer_account_info = next_account_info(account_info_iter)?;
                let bot_oracle_info = next_account_info(account_info_iter)?;
                let payer_info = next_account_info(account_info_iter)?;
                let rent_info = next_account_info(account_info_iter)?;
                let _token_program_id = next_account_info(account_info_iter)?;
                let _system_program_id = next_account_info(account_info_iter)?;

                Self::process_evaluate_attestations(
                    program_id,
                    verified_messages_info,
                    reward_manager_info,
                    reward_manager_authority_info,
                    reward_token_source_info,
                    reward_token_recipient_info,
                    transfer_account_info,
                    bot_oracle_info,
                    payer_info,
                    rent_info,
                    EvaluateAttestationsArgs {
                        amount,
                        id,
                        eth_recipient,
                    },
                )
            }
        }
    }
}
