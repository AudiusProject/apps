#![cfg(feature = "test-bpf")]
mod utils;

use audius_reward_manager::{
    instruction,
    processor::{TRANSFER_ACC_SPACE, TRANSFER_SEED_PREFIX},
    state::VERIFIED_MESSAGES_LEN,
    utils::{find_derived_pair, EthereumAddress},
    vote_message,
};
use libsecp256k1::{SecretKey};
use rand::Rng;
use solana_program::{
    instruction::Instruction, program_pack::Pack, pubkey::Pubkey
};
use solana_program_test::*;
use solana_sdk::{
    signer::Signer, signature::Keypair,
    transaction::Transaction,
};
use std::{mem::MaybeUninit};
use utils::*;

// Test a burn can be completed successfully
#[tokio::test]
async fn success_burn() {
    let TestConstants {
        reward_manager,
        oracle_priv_key,
        mut context,
        transfer_id,
        oracle_derived_address,
        rent,
        mut rng,
        manager_account,
        mint,
        eth_oracle_address,
        tokens_amount,
        token_account,
        ..
    } = setup_test_environment().await;

    // shadow the recipient eth key with the zero address
    let recipient_eth_key: EthereumAddress = [0u8; 20];

    // rebuild the messages that embed the recipient address (match how setup did it)
    let bot_oracle_message = vote_message!([
        recipient_eth_key.as_ref(),
        b"_",
        tokens_amount.to_le_bytes().as_ref(),
        b"_",
        transfer_id.as_ref(),
    ]
    .concat());

    let senders_message = vote_message!([
        recipient_eth_key.as_ref(),
        b"_",
        tokens_amount.to_le_bytes().as_ref(),
        b"_",
        transfer_id.as_ref(),
        b"_",
        eth_oracle_address.as_ref(),
    ]
    .concat());

    // Generate data and create senders
    let keys: [[u8; 32]; 3] = rng.gen();
    let operators: [EthereumAddress; 3] = rng.gen();
    let mut signers: [Pubkey; 3] = unsafe { MaybeUninit::zeroed().assume_init() };
    for (i, key) in keys.iter().enumerate() {
        let derived_address = create_sender_from(
            &reward_manager,
            &manager_account,
            &mut context,
            key,
            operators[i],
        )
        .await;
        signers[i] = derived_address;
    }

    let mut instructions = Vec::<Instruction>::new();

    // Add 3 messages and AAO
    for item in keys.iter().enumerate() {
        let priv_key = SecretKey::parse(item.1).unwrap();
        let inst =
            new_secp256k1_instruction_2_0(&priv_key, senders_message.as_ref(), (2 * item.0) as u8);
        instructions.push(inst);
        instructions.push(
            instruction::submit_attestations(
                &audius_reward_manager::id(),
                &reward_manager.pubkey(),
                &signers[item.0],
                &context.payer.pubkey(),
                transfer_id.to_string(),
            )
            .unwrap(),
        );
    }

    let oracle_sign = new_secp256k1_instruction_2_0(
        &oracle_priv_key,
        bot_oracle_message.as_ref(),
        (keys.len() * 2) as u8,
    );
    instructions.push(oracle_sign);
    instructions.push(
        instruction::submit_attestations(
            &audius_reward_manager::id(),
            &reward_manager.pubkey(),
            &oracle_derived_address,
            &context.payer.pubkey(),
            transfer_id.to_string(),
        )
        .unwrap(),
    );

    let tx = Transaction::new_signed_with_payer(
        &instructions,
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await.unwrap();

    let transfer_account = get_transfer_account(&reward_manager, transfer_id);
    let verified_messages_account = get_messages_account(&reward_manager, transfer_id);
    let verified_messages_data = get_account(&mut context, &verified_messages_account)
        .await
        .unwrap();
    assert_eq!(
        verified_messages_data.lamports,
        rent.minimum_balance(VERIFIED_MESSAGES_LEN)
    );

    let inst = instruction::evaluate_attestations(
        &audius_reward_manager::id(),
        &verified_messages_account,
        &reward_manager.pubkey(),
        &token_account.pubkey(),
        &mint.pubkey(),
        &oracle_derived_address,
        &context.payer.pubkey(),
        10_000u64,
        transfer_id.to_string(),
        recipient_eth_key,
    )
    .unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[inst],
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await.unwrap();

    let transfer_account_data = get_account(&mut context, &transfer_account).await.unwrap();

    // Assert that we have spent the lamports to make TRANSFER_ACC_SPACE.
    // We should have remaining only the amount necessary for the solana account (space = 0).
    assert_eq!(
        transfer_account_data.lamports,
        rent.minimum_balance(TRANSFER_ACC_SPACE)
    );
    assert_eq!(transfer_account_data.data.len(), TRANSFER_ACC_SPACE);

    // Assert that we wiped the verified messages account
    let verified_messages_data = get_account(&mut context, &verified_messages_account).await;
    assert!(verified_messages_data.is_none());

    // Assert that the mint's supply was reduced by the burned amount
    let mint_account_data = get_account(&mut context, &mint.pubkey()).await.unwrap();
    let mint_account = spl_token::state::Mint::unpack(&mint_account_data.data.as_slice()).unwrap();
    assert_eq!(mint_account.supply, 0u64);
}

// Helpers
fn get_transfer_account(reward_manager: &Keypair, transfer_id: &str) -> Pubkey {
    let (_, transfer_derived_address, _) = find_derived_pair(
        &audius_reward_manager::id(),
        &reward_manager.pubkey(),
        [
            TRANSFER_SEED_PREFIX.as_bytes().as_ref(),
            transfer_id.as_ref(),
        ]
        .concat()
        .as_ref(),
    );
    transfer_derived_address
}
