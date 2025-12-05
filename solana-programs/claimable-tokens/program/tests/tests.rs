#![cfg(feature = "test-bpf")]

use claimable_tokens::error::ClaimableProgramError;
use claimable_tokens::instruction::CreateTokenAccount;
use claimable_tokens::state::{NonceAccount, TransferInstructionData};
use claimable_tokens::utils::program::{
    find_address_pair, find_nonce_address, EthereumAddress, NONCE_ACCOUNT_PREFIX,
};
use claimable_tokens::*;
use libsecp256k1::{PublicKey, SecretKey};

use rand::prelude::ThreadRng;
use rand::{thread_rng, Rng};
use sha3::Digest;
use solana_program::instruction::{Instruction, InstructionError};
use solana_program::secp256k1_program;
use solana_program::{program_pack::Pack, pubkey::Pubkey, system_instruction};
use solana_program_test::*;

use borsh::BorshSerialize;
use solana_sdk::transaction::TransactionError;
use solana_sdk::{
    account::Account,
    feature_set::FeatureSet,
    secp256k1_instruction::{
        construct_eth_pubkey, new_secp256k1_instruction, SecpSignatureOffsets,
    },
    signature::{Keypair, Signer},
    transaction::Transaction,
    transport::TransportError,
};
use std::sync::Arc;

// Construct_eth_pubkey
pub fn program_test() -> ProgramTest {
    ProgramTest::new(
        "claimable_tokens",
        id(),
        processor!(processor::Processor::process_instruction),
    )
}

// Initialize common test variables in one place
pub fn init_test_variables() -> (
    ThreadRng,
    [u8; 32],
    SecretKey,
    PublicKey,
    Keypair,
    Keypair,
    Keypair,
    [u8; 20],
) {
    let mut rng = thread_rng();
    let key: [u8; 32] = rng.gen();
    let priv_key = SecretKey::parse(&key).unwrap();
    let secp_pubkey = PublicKey::from_secret_key(&priv_key);
    let eth_address = construct_eth_pubkey(&secp_pubkey);
    let mint_account = Keypair::new();
    let mint_authority = Keypair::new();
    let user_token_account = Keypair::new();
    return (
        rng,
        key,
        priv_key,
        secp_pubkey,
        mint_account,
        mint_authority,
        user_token_account,
        eth_address,
    );
}

fn assert_custom_error(
    res: Result<(), TransportError>,
    instruction_index: u8,
    audius_error: ClaimableProgramError,
) {
    match res {
        Err(TransportError::TransactionError(TransactionError::InstructionError(
            idx,
            InstructionError::Custom(v),
        ))) => {
            assert_eq!(idx, instruction_index);
            assert_eq!(v, audius_error as u32);
        }
        _ => panic!("Expected error not found"),
    }
}

async fn get_user_account_nonce(context: &mut ProgramTestContext, account: &Pubkey) -> u64 {
    let nonce_acct_info = get_account(context, &account).await;
    if nonce_acct_info.is_none() {
        return 0;
    }
    let nonce_acct_data = NonceAccount::unpack(&nonce_acct_info.unwrap().data.as_slice()).unwrap();
    return nonce_acct_data.nonce;
}

pub async fn get_account(
    program_context: &mut ProgramTestContext,
    pubkey: &Pubkey,
) -> Option<Account> {
    program_context
        .banks_client
        .get_account(*pubkey)
        .await
        .expect("account not found")
}

async fn create_token_account(
    program_context: &mut ProgramTestContext,
    account: &Keypair,
    account_rent: u64,
    mint: &Pubkey,
    owner: &Pubkey,
) -> Result<(), TransportError> {
    let instructions = vec![
        system_instruction::create_account(
            &program_context.payer.pubkey(),
            &account.pubkey(),
            account_rent,
            spl_token::state::Account::LEN as u64,
            &spl_token::id(),
        ),
        spl_token::instruction::initialize_account(
            &spl_token::id(),
            &account.pubkey(),
            mint,
            owner,
        )
        .unwrap(),
    ];

    let mut transaction =
        Transaction::new_with_payer(&instructions, Some(&program_context.payer.pubkey()));

    transaction.sign(
        &[&program_context.payer, account],
        program_context.last_blockhash,
    );
    program_context
        .banks_client
        .process_transaction(transaction)
        .await?;
    Ok(())
}

async fn create_mint(
    program_context: &mut ProgramTestContext,
    mint_account: &Keypair,
    mint_rent: u64,
    authority: &Pubkey,
) -> Result<(), TransportError> {
    let instructions = vec![
        system_instruction::create_account(
            &program_context.payer.pubkey(),
            &mint_account.pubkey(),
            mint_rent,
            spl_token::state::Mint::LEN as u64,
            &spl_token::id(),
        ),
        spl_token::instruction::initialize_mint(
            &spl_token::id(),
            &mint_account.pubkey(),
            authority,
            None,
            0,
        )
        .unwrap(),
    ];

    let mut transaction =
        Transaction::new_with_payer(&instructions, Some(&program_context.payer.pubkey()));

    transaction.sign(
        &[&program_context.payer, mint_account],
        program_context.last_blockhash,
    );
    program_context
        .banks_client
        .process_transaction(transaction)
        .await?;
    Ok(())
}

pub async fn mint_tokens_to(
    program_context: &mut ProgramTestContext,
    mint: &Pubkey,
    destination: &Pubkey,
    authority: &Keypair,
    amount: u64,
) -> Result<(), TransportError> {
    let mut transaction = Transaction::new_with_payer(
        &[spl_token::instruction::mint_to(
            &spl_token::id(),
            mint,
            destination,
            &authority.pubkey(),
            &[&authority.pubkey()],
            amount,
        )
        .unwrap()],
        Some(&program_context.payer.pubkey()),
    );
    transaction.sign(
        &[&program_context.payer, authority],
        program_context.last_blockhash,
    );
    program_context
        .banks_client
        .process_transaction(transaction)
        .await?;
    Ok(())
}

async fn init_user_bank(
    program_context: &mut ProgramTestContext,
    mint: &Pubkey,
    eth_address: EthereumAddress,
) -> Result<(), TransportError> {
    let mut transaction = Transaction::new_with_payer(
        &[instruction::init(
            &id(),
            &program_context.payer.pubkey(),
            mint,
            instruction::CreateTokenAccount { eth_address },
        )
        .unwrap()],
        Some(&program_context.payer.pubkey()),
    );

    transaction.sign(&[&program_context.payer], program_context.last_blockhash);
    program_context
        .banks_client
        .process_transaction(transaction)
        .await
}

// Helper function
async fn prepare_transfer(
    program_context: &mut ProgramTestContext,
    mint_account: Keypair,
    rent: solana_program::rent::Rent,
    mint_authority: Keypair,
    eth_address: EthereumAddress,
    user_token_account: &Keypair,
) -> (Pubkey, Pubkey, u64) {
    create_mint(
        program_context,
        &mint_account,
        rent.minimum_balance(spl_token::state::Mint::LEN),
        &mint_authority.pubkey(),
    )
    .await
    .unwrap();

    // Calculate the PDA for this ethereum public key and mint
    let pair = find_address_pair(&id(), &mint_account.pubkey(), eth_address).unwrap();
    // Initialize account
    init_user_bank(program_context, &mint_account.pubkey(), eth_address)
        .await
        .unwrap();
    // Mint tokens to the user PDA
    let tokens_amount = 10_000;
    mint_tokens_to(
        program_context,
        &mint_account.pubkey(),
        &pair.derive.address,
        &mint_authority,
        tokens_amount,
    )
    .await
    .unwrap();
    // Initialize a separate token account for testing associated with the same mint
    let user_token_account_authority = Keypair::new();
    create_token_account(
        program_context,
        user_token_account,
        rent.minimum_balance(spl_token::state::Account::LEN),
        &mint_account.pubkey(),
        &user_token_account_authority.pubkey(),
    )
    .await
    .unwrap();

    // Return base, derive, token amount
    (pair.base.address, pair.derive.address, tokens_amount)
}

// Initialize a user token account
#[tokio::test]
async fn init_instruction() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        _priv_key,
        _secp_pubkey,
        mint_account,
        mint_authority,
        _user_token_account,
        eth_address,
    ) = init_test_variables();

    create_mint(
        &mut program_context,
        &mint_account,
        rent.minimum_balance(spl_token::state::Mint::LEN),
        &mint_authority.pubkey(),
    )
    .await
    .unwrap();

    let pair = find_address_pair(&id(), &mint_account.pubkey(), eth_address).unwrap();

    init_user_bank(&mut program_context, &mint_account.pubkey(), eth_address)
        .await
        .unwrap();

    let token_account_data = get_account(&mut program_context, &pair.derive.address)
        .await
        .unwrap();
    // check that token account is initialized
    let token_account =
        spl_token::state::Account::unpack(&token_account_data.data.as_slice()).unwrap();

    assert_eq!(token_account.mint, mint_account.pubkey());
}

// Test SetAuthority instruction signed by the ethereum key for the token account
#[tokio::test]
async fn set_authority_instruction() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        priv_key,
        _secp_pubkey,
        mint_account,
        mint_authority,
        _user_token_account,
        eth_address,
    ) = init_test_variables();

    // prepare transfer creates mint, PDA and mints tokens to PDA (so token account exists)
    let (base_acc, derive_acc, _tokens_amount) = prepare_transfer(
        &mut program_context,
        mint_account,
        rent,
        mint_authority,
        eth_address,
        &Keypair::new(),
    )
    .await;

    // Choose a new authority pubkey to set
    let new_authority = Keypair::new().pubkey();

    // Build the SPL Token SetAuthority instruction bytes
    use solana_program::program_option::COption;
    let spl_set_auth = spl_token::instruction::TokenInstruction::SetAuthority {
        authority_type: spl_token::instruction::AuthorityType::AccountOwner,
        new_authority: COption::Some(new_authority),
    };
    let packed = spl_set_auth.pack();

    // Construct SignedSetAuthorityData with recent blockhash
    use claimable_tokens::state::SignedSetAuthorityData;
    let signed = SignedSetAuthorityData {
        blockhash: program_context.last_blockhash,
        instruction: packed.to_vec(),
        account_pubkey: derive_acc,
    };
    let message = signed.try_to_vec().expect("serialize signed set authority");

    // create secp instruction signing the message with the priv_key
    let secp_inst = new_secp256k1_instruction(&priv_key, &message);

    // Program instruction to set authority
    let set_auth_inst = instruction::set_authority(&id(), &derive_acc, &base_acc).unwrap();

    // send transaction: secp first, then program instruction
    let mut tx = Transaction::new_with_payer(
        &[secp_inst, set_auth_inst],
        Some(&program_context.payer.pubkey()),
    );
    tx.sign(&[&program_context.payer], program_context.last_blockhash);
    program_context
        .banks_client
        .process_transaction(tx)
        .await
        .expect("set_authority tx failed");

    // Verify the token account's owner changed to new_authority
    let token_account_data = get_account(&mut program_context, &derive_acc)
        .await
        .unwrap();
    let token_account = spl_token::state::Account::unpack(&token_account_data.data.as_slice()).unwrap();

    assert_eq!(token_account.owner, new_authority);
}


// Ensure a signature for one token account cannot be used for another token account
#[tokio::test]
async fn set_authority_bound_to_specific_account() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        priv_key,
        _secp_pubkey,
        mint_account_a,
        mint_authority_a,
        _user_token_account_a,
        eth_address,
    ) = init_test_variables();

    // Create a second mint and authority for the second token account
    let mint_account_b = Keypair::new();
    let mint_authority_b = Keypair::new();

    // prepare first token account (mint A)
    let (_base_a, derive_a, _tokens_a) = prepare_transfer(
        &mut program_context,
        mint_account_a,
        rent,
        mint_authority_a,
        eth_address,
        &Keypair::new(),
    )
    .await;

    // prepare second token account (mint B) for the SAME ethereum address
    let (_base_b, derive_b, _tokens_b) = prepare_transfer(
        &mut program_context,
        mint_account_b,
        rent,
        mint_authority_b,
        eth_address,
        &Keypair::new(),
    )
    .await;

    // Build SPL SetAuthority payload that is explicitly bound to derive_a
    use solana_program::program_option::COption;
    let new_authority = Keypair::new().pubkey();
    let spl_set_auth = spl_token::instruction::TokenInstruction::SetAuthority {
        authority_type: spl_token::instruction::AuthorityType::AccountOwner,
        new_authority: COption::Some(new_authority),
    };
    let packed = spl_set_auth.pack();

    use claimable_tokens::state::SignedSetAuthorityData;
    let signed = SignedSetAuthorityData {
        blockhash: program_context.last_blockhash,
        instruction: packed.to_vec(),
        account_pubkey: derive_a, // bound to account A
    };
    let message = signed.try_to_vec().expect("serialize signed set authority");

    // create secp instruction signing the message with the priv_key
    let secp_inst = new_secp256k1_instruction(&priv_key, &message);

    // But call set_authority for derive_b (account B) -- should fail
    let set_auth_inst = instruction::set_authority(&id(), &derive_b, &find_address_pair(&id(), &derive_b, eth_address).unwrap().base.address).unwrap();

    let mut tx = Transaction::new_with_payer(&[secp_inst, set_auth_inst], Some(&program_context.payer.pubkey()));
    tx.sign(&[&program_context.payer], program_context.last_blockhash);
    let res = program_context.banks_client.process_transaction(tx).await;

    // Expect InvalidSignatureData at instruction index 1
    assert_custom_error(res, 1, ClaimableProgramError::InvalidSignatureData);
}

// Verify that someone cannot block an account creation
#[tokio::test]
async fn create_account_with_seed_denial() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        _priv_key,
        _secp_pubkey,
        mint_account,
        mint_authority,
        _user_token_account,
        eth_address,
    ) = init_test_variables();

    let mint_pubkey = mint_account.pubkey();
    create_mint(
        &mut program_context,
        &mint_account,
        rent.minimum_balance(spl_token::state::Mint::LEN),
        &mint_authority.pubkey(),
    )
    .await
    .unwrap();

    // Derive account to create
    let pair = find_address_pair(&id(), &mint_pubkey, eth_address).unwrap();
    let account_to_create = pair.derive.address;

    // Transfer 1 lamport to account to be created to potentially deny its creation
    let send_lamports_instruction =
        system_instruction::transfer(&program_context.payer.pubkey(), &account_to_create, 1);
    let mut send_lamports_transaction = Transaction::new_with_payer(
        &[send_lamports_instruction],
        Some(&program_context.payer.pubkey()),
    );
    send_lamports_transaction.sign(&[&program_context.payer], program_context.last_blockhash);
    program_context
        .banks_client
        .process_transaction(send_lamports_transaction)
        .await
        .unwrap();

    // Send a transaction to create a token account
    let create_token_account_instruction = instruction::init(
        &id(),
        &program_context.payer.pubkey(),
        &mint_pubkey,
        CreateTokenAccount { eth_address },
    )
    .unwrap();
    let mut create_token_account_transaction = Transaction::new_with_payer(
        &[create_token_account_instruction],
        Some(&program_context.payer.pubkey()),
    );
    create_token_account_transaction
        .sign(&[&program_context.payer], program_context.last_blockhash);
    program_context
        .banks_client
        .process_transaction(create_token_account_transaction)
        .await
        .unwrap();
}

// Transfer ALL tokens from an existing account
#[tokio::test]
async fn transfer_all_instruction() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        priv_key,
        _secp_pubkey,
        mint_account,
        mint_authority,
        user_token_account,
        eth_address,
    ) = init_test_variables();
    let mint_pubkey = mint_account.pubkey();

    let (base_acc, user_bank_account, tokens_amount) = prepare_transfer(
        &mut program_context,
        mint_account,
        rent,
        mint_authority,
        eth_address,
        &user_token_account,
    )
    .await;

    // Query current balance
    let mut bank_token_account_data = get_account(&mut program_context, &user_bank_account)
        .await
        .unwrap();
    let mut bank_token_account =
        spl_token::state::Account::unpack(&bank_token_account_data.data.as_slice()).unwrap();
    println!(
        "{:?} current balance = {:?} ",
        bank_token_account.amount, user_bank_account
    );

    let nonce_acct_seed = [NONCE_ACCOUNT_PREFIX.as_ref(), eth_address.as_ref()].concat();
    let (_, nonce_account, _) = find_nonce_address(&id(), &mint_pubkey, &nonce_acct_seed);

    let current_user_nonce = get_user_account_nonce(&mut program_context, &nonce_account).await;
    let transfer_instr_data = TransferInstructionData {
        target_pubkey: user_token_account.pubkey(),
        amount: bank_token_account.amount,
        nonce: current_user_nonce,
    };

    let encoded = transfer_instr_data.try_to_vec().unwrap();
    let secp256_program_instruction = new_secp256k1_instruction(&priv_key, &encoded);

    // Transfer ALL tokens
    let mut transaction = Transaction::new_with_payer(
        &[
            secp256_program_instruction,
            instruction::transfer(
                &id(),
                &program_context.payer.pubkey(),
                &user_bank_account,
                &user_token_account.pubkey(),
                &nonce_account,
                &base_acc,
                eth_address.clone(),
            )
            .unwrap(),
        ],
        Some(&program_context.payer.pubkey()),
    );

    transaction.sign(&[&program_context.payer], program_context.last_blockhash);
    program_context
        .banks_client
        .process_transaction(transaction)
        .await
        .unwrap();

    bank_token_account_data = get_account(&mut program_context, &user_bank_account)
        .await
        .unwrap();
    bank_token_account =
        spl_token::state::Account::unpack(&bank_token_account_data.data.as_slice()).unwrap();
    // check that program sent all the tokens from bank token account to user token account
    assert_eq!(bank_token_account.amount, 0);

    let user_token_account_data = get_account(&mut program_context, &user_token_account.pubkey())
        .await
        .unwrap();
    let user_token_account =
        spl_token::state::Account::unpack(&user_token_account_data.data.as_slice()).unwrap();

    assert_eq!(user_token_account.amount, tokens_amount);
}

// This test attemps to manipulate the offsets of a single SECP instruction
// in order to insert a maliciously signed signature message at the address
// read by the program. The real eth address is inserted at the expected offset (12)
// and the fields signed with the attacker's secret key are followed, hence every
// offset being increased by 20.
// In order to prevent this exploit, the program has been modified to manually
// check the offset of each field such that they match the expected values and such
// manipulation cannot pass validation.
#[tokio::test]
async fn transfer_with_amount_instruction_secp_offsets_exploit() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        _priv_key,
        _secp_pubkey,
        mint_account,
        mint_authority,
        user_token_account,
        eth_address,
    ) = init_test_variables();
    let mint_pubkey = mint_account.pubkey();
    let (base_acc, user_bank_account, tokens_amount) = prepare_transfer(
        &mut program_context,
        mint_account,
        rent,
        mint_authority,
        eth_address,
        &user_token_account,
    )
    .await;

    let transfer_amount = rand::thread_rng().gen_range(1..tokens_amount);
    let nonce_acct_seed = [NONCE_ACCOUNT_PREFIX.as_ref(), eth_address.as_ref()].concat();
    let (_, nonce_account, _) = find_nonce_address(&id(), &mint_pubkey, &nonce_acct_seed);

    let current_user_nonce = get_user_account_nonce(&mut program_context, &nonce_account).await;
    let transfer_instr_data = TransferInstructionData {
        target_pubkey: user_token_account.pubkey(),
        amount: transfer_amount,
        nonce: current_user_nonce,
    };

    let message = transfer_instr_data.try_to_vec().unwrap();

    let malicious_sk = libsecp256k1::SecretKey::random(&mut rand_073::thread_rng());
    let malicious_pk = libsecp256k1::PublicKey::from_secret_key(&malicious_sk);
    let malicious_eth_pubkey = construct_eth_pubkey(&malicious_pk);

    let real_eth_pubkey = eth_address;
    // All offsets bumped by 20 bc we load the
    // valid eth signature first
    let eth_addr_offset = 32;
    let eth_sig_offset = 52;
    let msg_offset = 117;

    let secp_offsets_struct = SecpSignatureOffsets {
        eth_address_instruction_index: 0,
        message_instruction_index: 0,
        signature_instruction_index: 0,
        eth_address_offset: eth_addr_offset as u16,
        message_data_offset: msg_offset as u16,
        message_data_size: message.len() as u16,
        signature_offset: eth_sig_offset as u16,
    };

    let mut secp_instr_data = vec![];

    let mut hasher = sha3::Keccak256::new();
    hasher.update(message.clone());
    let fake_message_hash = hasher.finalize();
    let mut fake_message_hash_arr = [0u8; 32];
    fake_message_hash_arr.copy_from_slice(&fake_message_hash.as_slice());
    let fake_message = libsecp256k1::Message::parse(&fake_message_hash_arr);
    let (fake_signature, fake_recovery_id) = libsecp256k1::sign(&fake_message, &malicious_sk);
    let fake_signature_arr = fake_signature.serialize();

    secp_instr_data.push(1u8); // count
    secp_instr_data.append(&mut bincode::serialize(&secp_offsets_struct).unwrap());
    // First place the real pubkey, which our processor tries to validate
    secp_instr_data.extend_from_slice(&real_eth_pubkey);
    // Next, place the malicious pubkey
    secp_instr_data.extend_from_slice(&malicious_eth_pubkey);
    // Append dummy signature data
    secp_instr_data.extend_from_slice(&fake_signature_arr);
    secp_instr_data.push(fake_recovery_id.serialize());
    // Append the real message
    secp_instr_data.append(&mut message.to_vec());

    let fake_secp_instruction_1 = Instruction {
        program_id: secp256k1_program::id(),
        accounts: vec![],
        data: secp_instr_data.clone(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[fake_secp_instruction_1],
        Some(&program_context.payer.pubkey()),
        &[&program_context.payer],
        program_context.last_blockhash,
    );
    // Confirm fake instruction passes verification
    let feature_set = Arc::new(FeatureSet::all_enabled());
    assert!(tx.verify_precompiles(&feature_set).is_ok());
    assert!(program_context
        .banks_client
        .process_transaction(tx)
        .await
        .is_ok());

    let fake_secp_instruction_2 = Instruction {
        program_id: secp256k1_program::id(),
        accounts: vec![],
        data: secp_instr_data.clone(),
    };
    let mut transaction = Transaction::new_with_payer(
        &[
            fake_secp_instruction_2,
            instruction::transfer(
                &id(),
                &program_context.payer.pubkey(),
                &user_bank_account,
                &user_token_account.pubkey(),
                &nonce_account,
                &base_acc,
                eth_address.clone(),
            )
            .unwrap(),
        ],
        Some(&program_context.payer.pubkey()),
    );

    assert!(transaction.verify_precompiles(&feature_set).is_ok());

    transaction.sign(&[&program_context.payer], program_context.last_blockhash);
    let tx_result = program_context
        .banks_client
        .process_transaction(transaction)
        .await;

    assert!(tx_result.is_err());
}

// This test explicitly exercises the vulnerability in which an attacker
// submits 2 SECP instructions along with the transfer instruction
// The 1st is a valid recovery signed by a malicious secret key
// The 2nd is a spoofed SecpSignatureOffsets struct with all 'index'
// fields pointed at the 1st instruction with dummy values in the other fields
// By explicitly checking that struct index values match the instruction index
// this vulnerability is prevented.
// Note that prior to changes, this was indeed possible to spoof.
#[tokio::test]
async fn transfer_with_amount_instruction_secp_index_exploit() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        _priv_key,
        _secp_pubkey,
        mint_account,
        mint_authority,
        user_token_account,
        eth_address,
    ) = init_test_variables();
    let mint_pubkey = mint_account.pubkey();
    let (base_acc, user_bank_account, tokens_amount) = prepare_transfer(
        &mut program_context,
        mint_account,
        rent,
        mint_authority,
        eth_address,
        &user_token_account,
    )
    .await;

    let transfer_amount = rand::thread_rng().gen_range(1..tokens_amount);
    let nonce_acct_seed = [NONCE_ACCOUNT_PREFIX.as_ref(), eth_address.as_ref()].concat();
    let (_, nonce_account, _) = find_nonce_address(&id(), &mint_pubkey, &nonce_acct_seed);

    let current_user_nonce = get_user_account_nonce(&mut program_context, &nonce_account).await;
    let transfer_instr_data = TransferInstructionData {
        target_pubkey: user_token_account.pubkey(),
        amount: transfer_amount,
        nonce: current_user_nonce,
    };

    // Use real message
    let message = transfer_instr_data.try_to_vec().unwrap();

    let fake_sk = libsecp256k1::SecretKey::random(&mut rand_073::thread_rng());
    let eth_addr_offset = 12;
    let eth_sig_offset = 32;
    let msg_offset = 97;

    // Create signature offsets struct pointing to the wrong index (0)
    let dummy_instr_data_ind = 0;
    let secp_offsets_struct = SecpSignatureOffsets {
        eth_address_instruction_index: dummy_instr_data_ind,
        message_instruction_index: dummy_instr_data_ind,
        signature_instruction_index: dummy_instr_data_ind,
        eth_address_offset: eth_addr_offset as u16,
        message_data_offset: msg_offset as u16,
        message_data_size: message.len() as u16,
        signature_offset: eth_sig_offset as u16,
    };

    let mut secp_instr_data = vec![];
    secp_instr_data.push(1u8); // count
    secp_instr_data.append(&mut bincode::serialize(&secp_offsets_struct).unwrap());
    // Here's where we put the real pubkey, which our processor tries to validate
    secp_instr_data.extend_from_slice(&eth_address);
    // Append dummy signature data
    let mut dummy_sig = (0..65).collect();
    secp_instr_data.append(&mut dummy_sig);
    // Append the real message
    secp_instr_data.append(&mut message.to_vec());

    // Sign the real message expected by the program with the fake secret key
    // Ensures recovery step passes
    let dummy2 = new_secp256k1_instruction(&fake_sk, &message);

    let fake_secp_instruction = Instruction {
        program_id: secp256k1_program::id(),
        accounts: vec![],
        data: secp_instr_data.clone(),
    };

    let mut transaction = Transaction::new_with_payer(
        &[
            dummy2,
            fake_secp_instruction,
            instruction::transfer(
                &id(),
                &program_context.payer.pubkey(),
                &user_bank_account,
                &user_token_account.pubkey(),
                &nonce_account,
                &base_acc,
                eth_address.clone(),
            )
            .unwrap(),
        ],
        Some(&program_context.payer.pubkey()),
    );

    let feature_set = Arc::new(FeatureSet::all_enabled());
    assert!(transaction.verify_precompiles(&feature_set).is_ok());

    transaction.sign(&[&program_context.payer], program_context.last_blockhash);
    let tx_result = program_context
        .banks_client
        .process_transaction(transaction)
        .await;

    assert!(tx_result.is_err());

    let bank_token_account_data = get_account(&mut program_context, &user_bank_account)
        .await
        .unwrap();
    let bank_token_account =
        spl_token::state::Account::unpack(&bank_token_account_data.data.as_slice()).unwrap();
    // check that program failed to send by validating data
    assert_eq!(bank_token_account.amount, tokens_amount);
    let user_token_account_data = get_account(&mut program_context, &user_token_account.pubkey())
        .await
        .unwrap();
    let user_token_account =
        spl_token::state::Account::unpack(&user_token_account_data.data.as_slice()).unwrap();
    assert_eq!(user_token_account.amount, 0);
}

// Test to verify nonce incrementing across multiple transfers
#[tokio::test]
async fn transfer_nonce_increment() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        priv_key,
        _secp_pubkey,
        mint_account,
        mint_authority,
        user_token_account,
        eth_address,
    ) = init_test_variables();

    let mint_pubkey = mint_account.pubkey();
    let (base_acc, user_bank_account, tokens_amount) = prepare_transfer(
        &mut program_context,
        mint_account,
        rent,
        mint_authority,
        eth_address,
        &user_token_account,
    )
    .await;
    // Transfer a single token for reuse
    let transfer_amount = 1;
    let nonce_acct_seed = [NONCE_ACCOUNT_PREFIX.as_ref(), eth_address.as_ref()].concat();
    let (_, nonce_account, _) = find_nonce_address(&id(), &mint_pubkey, &nonce_acct_seed);

    let num_transfers = 5;
    let mut i = 0;
    let mut outgoing_account_balance = tokens_amount;

    while i < num_transfers {
        let current_user_nonce = get_user_account_nonce(&mut program_context, &nonce_account).await;
        let transfer_instr_data = TransferInstructionData {
            target_pubkey: user_token_account.pubkey(),
            amount: transfer_amount,
            nonce: current_user_nonce,
        };

        let encoded = transfer_instr_data.try_to_vec().unwrap();
        let secp256_program_instruction = new_secp256k1_instruction(&priv_key, &encoded);

        let instructions = [
            secp256_program_instruction.clone(),
            instruction::transfer(
                &id(),
                &program_context.payer.pubkey(),
                &user_bank_account,
                &user_token_account.pubkey(),
                &nonce_account,
                &base_acc,
                eth_address.clone(),
            )
            .unwrap(),
        ];

        let mut transaction =
            Transaction::new_with_payer(&instructions, Some(&program_context.payer.pubkey()));

        transaction.sign(&[&program_context.payer], program_context.last_blockhash);
        program_context
            .banks_client
            .process_transaction(transaction)
            .await
            .unwrap();

        let current_user_nonce = get_user_account_nonce(&mut program_context, &nonce_account).await;
        assert_eq!(transfer_instr_data.nonce + 1, current_user_nonce);

        // Verify transfer occurred
        let bank_token_account_data = get_account(&mut program_context, &user_bank_account)
            .await
            .unwrap();
        let bank_token_account =
            spl_token::state::Account::unpack(&bank_token_account_data.data.as_slice()).unwrap();
        // check that program sent required number tokens from bank token account to user token account
        assert_eq!(
            bank_token_account.amount,
            outgoing_account_balance - transfer_amount
        );
        outgoing_account_balance = bank_token_account.amount;
        println!("Nonce incremented to {:?}", current_user_nonce);
        println!("Outgoing account balance = {:?}", outgoing_account_balance);

        i += 1;
    }
    let final_user_nonce = get_user_account_nonce(&mut program_context, &nonce_account).await;
    assert_eq!(5, final_user_nonce);
}

// Verify that identical instructions cannot be reused 2x
// Increasing on-chain nonce should prevent a replay attack
#[tokio::test]
async fn transfer_replay_instruction() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        priv_key,
        _secp_pubkey,
        mint_account,
        mint_authority,
        user_token_account,
        eth_address,
    ) = init_test_variables();

    let mint_pubkey = mint_account.pubkey();
    let (base_acc, user_bank_account, tokens_amount) = prepare_transfer(
        &mut program_context,
        mint_account,
        rent,
        mint_authority,
        eth_address,
        &user_token_account,
    )
    .await;
    let transfer_amount = rand::thread_rng().gen_range(1..tokens_amount);
    let nonce_acct_seed = [NONCE_ACCOUNT_PREFIX.as_ref(), eth_address.as_ref()].concat();
    let (_, nonce_account, _) = find_nonce_address(&id(), &mint_pubkey, &nonce_acct_seed);

    let current_user_nonce = get_user_account_nonce(&mut program_context, &nonce_account).await;
    let transfer_instr_data = TransferInstructionData {
        target_pubkey: user_token_account.pubkey(),
        amount: transfer_amount,
        nonce: current_user_nonce,
    };

    let encoded = transfer_instr_data.try_to_vec().unwrap();
    let secp256_program_instruction = new_secp256k1_instruction(&priv_key, &encoded);

    let instructions = [
        secp256_program_instruction.clone(),
        instruction::transfer(
            &id(),
            &program_context.payer.pubkey(),
            &user_bank_account,
            &user_token_account.pubkey(),
            &nonce_account,
            &base_acc,
            eth_address.clone(),
        )
        .unwrap(),
    ];

    let mut transaction =
        Transaction::new_with_payer(&instructions, Some(&program_context.payer.pubkey()));

    let recent_blockhash = program_context.last_blockhash;
    transaction.sign(&[&program_context.payer], recent_blockhash);
    program_context
        .banks_client
        .process_transaction(transaction)
        .await
        .unwrap();

    let user_nonce = get_user_account_nonce(&mut program_context, &nonce_account).await;
    assert_eq!(transfer_instr_data.nonce + 1, user_nonce);

    let bank_token_account_data = get_account(&mut program_context, &user_bank_account)
        .await
        .unwrap();
    let bank_token_account =
        spl_token::state::Account::unpack(&bank_token_account_data.data.as_slice()).unwrap();
    // check that program sent required number tokens from bank token account to user token account
    assert_eq!(bank_token_account.amount, tokens_amount - transfer_amount);

    let user_token_account_data = get_account(&mut program_context, &user_token_account.pubkey())
        .await
        .unwrap();
    let user_token_account =
        spl_token::state::Account::unpack(&user_token_account_data.data.as_slice()).unwrap();

    assert_eq!(user_token_account.amount, transfer_amount);

    // Replay the same transaction with the same blockhash and signature
    let mut transaction2 =
        Transaction::new_with_payer(&instructions, Some(&program_context.payer.pubkey()));
    transaction2.sign(&[&program_context.payer], recent_blockhash);
    program_context
        .banks_client
        .process_transaction(transaction2)
        .await;
    
    let user_nonce_after_replay = get_user_account_nonce(&mut program_context, &nonce_account).await;
    // Nonce should not have changed
    assert_eq!(user_nonce, user_nonce_after_replay);

    let bank_token_account_data = get_account(&mut program_context, &user_bank_account)
        .await
        .unwrap();
    let bank_token_account_after_replay =
        spl_token::state::Account::unpack(&bank_token_account_data.data.as_slice()).unwrap();
    // Balance should not have changed
    assert_eq!(bank_token_account.amount, bank_token_account_after_replay.amount);

    // Replay again with a new blockhash to make the signature change
    let mut new_recent_blockhash = program_context
        .banks_client
        .get_recent_blockhash()
        .await
        .unwrap();
    while new_recent_blockhash == recent_blockhash {
        // wait until blockhash changes
        tokio::time::sleep(std::time::Duration::from_millis(400)).await;
        new_recent_blockhash = program_context
            .banks_client
            .get_recent_blockhash()
            .await
            .unwrap();
    }
    let mut transaction3 =
        Transaction::new_with_payer(&instructions, Some(&program_context.payer.pubkey()));
    transaction3.sign(&[&program_context.payer], new_recent_blockhash);
    let final_tx_result = program_context
        .banks_client
        .process_transaction(transaction3)
        .await;
    
    assert_custom_error(final_tx_result, 1, ClaimableProgramError::NonceVerificationError);
        
}

// Verify that someone cannot cause a transfer denial by sending lamports to a nonce account
// before it is used.
#[tokio::test]
async fn transfer_nonce_account_denial_with_lamports() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        priv_key,
        _secp_pubkey,
        mint_account,
        mint_authority,
        user_token_account,
        eth_address,
    ) = init_test_variables();

    let mint_pubkey = mint_account.pubkey();
    let (base_acc, user_bank_account, tokens_amount) = prepare_transfer(
        &mut program_context,
        mint_account,
        rent,
        mint_authority,
        eth_address,
        &user_token_account,
    )
    .await;
    let transfer_amount = rand::thread_rng().gen_range(1..tokens_amount / 2);
    let nonce_acct_seed = [NONCE_ACCOUNT_PREFIX.as_ref(), eth_address.as_ref()].concat();
    let (_, nonce_account, _) = find_nonce_address(&id(), &mint_pubkey, &nonce_acct_seed);

    // Transfer 1 lamport to nonce_account to potentially deny its creation
    let send_lamports_instruction =
        system_instruction::transfer(&program_context.payer.pubkey(), &nonce_account, 1);
    let mut send_lamports_transaction = Transaction::new_with_payer(
        &[send_lamports_instruction],
        Some(&program_context.payer.pubkey()),
    );
    send_lamports_transaction.sign(&[&program_context.payer], program_context.last_blockhash);
    program_context
        .banks_client
        .process_transaction(send_lamports_transaction)
        .await
        .unwrap();

    // Send a transfer instruction
    let current_user_nonce = 0;

    let transfer_instr_data1 = TransferInstructionData {
        target_pubkey: user_token_account.pubkey(),
        amount: transfer_amount,
        nonce: current_user_nonce,
    };

    let encoded1 = transfer_instr_data1.try_to_vec().unwrap();
    let secp256_program_instruction1 = new_secp256k1_instruction(&priv_key, &encoded1);

    let instructions1 = [
        secp256_program_instruction1.clone(),
        instruction::transfer(
            &id(),
            &program_context.payer.pubkey(),
            &user_bank_account,
            &user_token_account.pubkey(),
            &nonce_account,
            &base_acc,
            eth_address.clone(),
        )
        .unwrap(),
    ];

    let mut transaction1 =
        Transaction::new_with_payer(&instructions1, Some(&program_context.payer.pubkey()));

    transaction1.sign(&[&program_context.payer], program_context.last_blockhash);
    program_context
        .banks_client
        .process_transaction(transaction1)
        .await
        .unwrap();

    let final_user_nonce1 = get_user_account_nonce(&mut program_context, &nonce_account).await;
    assert_eq!(transfer_instr_data1.nonce + 1, final_user_nonce1);

    let bank_token_account_data = get_account(&mut program_context, &user_bank_account)
        .await
        .unwrap();
    let bank_token_account =
        spl_token::state::Account::unpack(&bank_token_account_data.data.as_slice()).unwrap();
    // check that program sent required number tokens from bank token account to user token account
    assert_eq!(bank_token_account.amount, tokens_amount - transfer_amount);

    let user_token_account_data = get_account(&mut program_context, &user_token_account.pubkey())
        .await
        .unwrap();
    let user_token_account_amount =
        spl_token::state::Account::unpack(&user_token_account_data.data.as_slice())
            .unwrap()
            .amount;

    assert_eq!(user_token_account_amount, transfer_amount);

    // Test a subsequent transaction
    let current_user_nonce = get_user_account_nonce(&mut program_context, &nonce_account).await;

    let transfer_instr_data2 = TransferInstructionData {
        target_pubkey: user_token_account.pubkey(),
        amount: transfer_amount,
        nonce: current_user_nonce,
    };

    let encoded2 = transfer_instr_data2.try_to_vec().unwrap();
    let secp256_program_instruction2 = new_secp256k1_instruction(&priv_key, &encoded2);

    let instructions2 = [
        secp256_program_instruction2.clone(),
        instruction::transfer(
            &id(),
            &program_context.payer.pubkey(),
            &user_bank_account,
            &user_token_account.pubkey(),
            &nonce_account,
            &base_acc,
            eth_address.clone(),
        )
        .unwrap(),
    ];

    let mut transaction2 =
        Transaction::new_with_payer(&instructions2, Some(&program_context.payer.pubkey()));

    transaction2.sign(&[&program_context.payer], program_context.last_blockhash);
    program_context
        .banks_client
        .process_transaction(transaction2)
        .await
        .unwrap();

    let final_user_nonce2 = get_user_account_nonce(&mut program_context, &nonce_account).await;
    assert_eq!(transfer_instr_data2.nonce + 1, final_user_nonce2);

    let bank_token_account_data2 = get_account(&mut program_context, &user_bank_account)
        .await
        .unwrap();
    let bank_token_account =
        spl_token::state::Account::unpack(&bank_token_account_data2.data.as_slice()).unwrap();
    // check that program sent required number tokens from bank token account to user token account
    assert_eq!(
        bank_token_account.amount,
        tokens_amount - 2 * transfer_amount
    );

    let user_token_account_data = get_account(&mut program_context, &user_token_account.pubkey())
        .await
        .unwrap();
    let user_token_account_amount =
        spl_token::state::Account::unpack(&user_token_account_data.data.as_slice())
            .unwrap()
            .amount;

    assert_eq!(user_token_account_amount, 2 * transfer_amount);
}

#[tokio::test]
async fn transfer_with_amount_instruction() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        priv_key,
        _secp_pubkey,
        mint_account,
        mint_authority,
        user_token_account,
        eth_address,
    ) = init_test_variables();

    let mint_pubkey = mint_account.pubkey();
    let (base_acc, user_bank_account, tokens_amount) = prepare_transfer(
        &mut program_context,
        mint_account,
        rent,
        mint_authority,
        eth_address,
        &user_token_account,
    )
    .await;
    let transfer_amount = rand::thread_rng().gen_range(1..tokens_amount);
    let nonce_acct_seed = [NONCE_ACCOUNT_PREFIX.as_ref(), eth_address.as_ref()].concat();
    let (_, nonce_account, _) = find_nonce_address(&id(), &mint_pubkey, &nonce_acct_seed);

    let current_user_nonce = get_user_account_nonce(&mut program_context, &nonce_account).await;
    let transfer_instr_data = TransferInstructionData {
        target_pubkey: user_token_account.pubkey(),
        amount: transfer_amount,
        nonce: current_user_nonce,
    };

    let encoded = transfer_instr_data.try_to_vec().unwrap();
    let secp256_program_instruction = new_secp256k1_instruction(&priv_key, &encoded);

    let mut transaction = Transaction::new_with_payer(
        &[
            secp256_program_instruction,
            instruction::transfer(
                &id(),
                &program_context.payer.pubkey(),
                &user_bank_account,
                &user_token_account.pubkey(),
                &nonce_account,
                &base_acc,
                eth_address.clone(),
            )
            .unwrap(),
        ],
        Some(&program_context.payer.pubkey()),
    );

    transaction.sign(&[&program_context.payer], program_context.last_blockhash);
    program_context
        .banks_client
        .process_transaction(transaction)
        .await
        .unwrap();

    let bank_token_account_data = get_account(&mut program_context, &user_bank_account)
        .await
        .unwrap();
    let bank_token_account =
        spl_token::state::Account::unpack(&bank_token_account_data.data.as_slice()).unwrap();
    // check that program sent required number tokens from bank token account to user token account
    assert_eq!(bank_token_account.amount, tokens_amount - transfer_amount);

    let user_token_account_data = get_account(&mut program_context, &user_token_account.pubkey())
        .await
        .unwrap();
    let user_token_account =
        spl_token::state::Account::unpack(&user_token_account_data.data.as_slice()).unwrap();
    assert_eq!(user_token_account.amount, transfer_amount);
}

#[tokio::test]
async fn transfer_with_zero_amount_failure() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        priv_key,
        _secp_pubkey,
        mint_account,
        mint_authority,
        user_token_account,
        eth_address,
    ) = init_test_variables();

    let mint_pubkey = mint_account.pubkey();
    let (base_acc, user_bank_account, _tokens_amount) = prepare_transfer(
        &mut program_context,
        mint_account,
        rent,
        mint_authority,
        eth_address,
        &user_token_account,
    )
    .await;

    let transfer_amount = 0;
    let nonce_acct_seed = [NONCE_ACCOUNT_PREFIX.as_ref(), eth_address.as_ref()].concat();
    let (_, nonce_account, _) = find_nonce_address(&id(), &mint_pubkey, &nonce_acct_seed);

    let current_user_nonce = get_user_account_nonce(&mut program_context, &nonce_account).await;
    let transfer_instr_data = TransferInstructionData {
        target_pubkey: user_token_account.pubkey(),
        amount: transfer_amount,
        nonce: current_user_nonce,
    };

    let encoded = transfer_instr_data.try_to_vec().unwrap();
    let secp256_program_instruction = new_secp256k1_instruction(&priv_key, &encoded);

    let mut transaction = Transaction::new_with_payer(
        &[
            secp256_program_instruction,
            instruction::transfer(
                &id(),
                &program_context.payer.pubkey(),
                &user_bank_account,
                &user_token_account.pubkey(),
                &nonce_account,
                &base_acc,
                eth_address.clone(),
            )
            .unwrap(),
        ],
        Some(&program_context.payer.pubkey()),
    );
    transaction.sign(&[&program_context.payer], program_context.last_blockhash);
    let tx_result = program_context
        .banks_client
        .process_transaction(transaction)
        .await;
    assert!(tx_result.is_err());
    // Confirm a transfer of 0 is not permitted
    match tx_result {
        Err(TransportError::TransactionError(TransactionError::InstructionError(
            _idx,
            InstructionError::InsufficientFunds,
        ))) => {
            println!(
                "Insufficient funds error found as expected: {:?}",
                tx_result
            );
        }
        _ => panic!("Unexpected error scenario"),
    }
}

#[tokio::test]
async fn transfer_with_wrong_signature_instruction() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        priv_key,
        _secp_pubkey,
        mint_account,
        mint_authority,
        user_token_account,
        eth_address,
    ) = init_test_variables();

    let mint_pubkey = mint_account.pubkey();

    let nonce_acct_seed = [NONCE_ACCOUNT_PREFIX.as_ref(), eth_address.as_ref()].concat();
    let (_, nonce_account, _) = find_nonce_address(&id(), &mint_pubkey, &nonce_acct_seed);
    // Use bad_message instead of the TransferInstructionData for the program instruction
    let bad_message = [8u8; 48];
    let secp256_program_instruction = new_secp256k1_instruction(&priv_key, &bad_message);

    let (base_acc, user_bank_account, tokens_amount) = prepare_transfer(
        &mut program_context,
        mint_account,
        rent,
        mint_authority,
        eth_address,
        &user_token_account,
    )
    .await;

    let mut transaction = Transaction::new_with_payer(
        &[
            secp256_program_instruction,
            instruction::transfer(
                &id(),
                &program_context.payer.pubkey(),
                &user_bank_account,
                &user_token_account.pubkey(),
                &nonce_account,
                &base_acc,
                eth_address.clone(),
            )
            .unwrap(),
        ],
        Some(&program_context.payer.pubkey()),
    );

    transaction.sign(&[&program_context.payer], program_context.last_blockhash);
    let tx_result = program_context
        .banks_client
        .process_transaction(transaction)
        .await;
    assert!(tx_result.is_err());

    let bank_token_account_data = get_account(&mut program_context, &user_bank_account)
        .await
        .unwrap();
    let bank_token_account =
        spl_token::state::Account::unpack(&bank_token_account_data.data.as_slice()).unwrap();
    // check that bank token accounts balance the same
    assert_eq!(bank_token_account.amount, tokens_amount);

    let user_token_account_data = get_account(&mut program_context, &user_token_account.pubkey())
        .await
        .unwrap();
    let user_token_account =
        spl_token::state::Account::unpack(&user_token_account_data.data.as_slice()).unwrap();

    assert_eq!(user_token_account.amount, 0);
}

#[tokio::test]
async fn transfer_with_wrong_token_account() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        priv_key,
        _secp_pubkey,
        mint_account,
        mint_authority,
        user_token_account,
        eth_address,
    ) = init_test_variables();
    let mint_pubkey = mint_account.pubkey();
    let (base_acc, user_bank_account, _) = prepare_transfer(
        &mut program_context,
        mint_account,
        rent,
        mint_authority,
        eth_address,
        &user_token_account,
    )
    .await;
    let nonce_acct_seed = [NONCE_ACCOUNT_PREFIX.as_ref(), eth_address.as_ref()].concat();
    let (_, nonce_account, _) = find_nonce_address(&id(), &mint_pubkey, &nonce_acct_seed);
    let current_user_nonce = get_user_account_nonce(&mut program_context, &nonce_account).await;
    let transfer_instr_data = TransferInstructionData {
        target_pubkey: user_token_account.pubkey(),
        amount: 0,
        nonce: current_user_nonce,
    };

    let encoded = transfer_instr_data.try_to_vec().unwrap();
    let secp256_program_instruction = new_secp256k1_instruction(&priv_key, &encoded);
    let mut transaction = Transaction::new_with_payer(
        &[
            secp256_program_instruction,
            instruction::transfer(
                &id(),
                &program_context.payer.pubkey(),
                &user_bank_account,
                // use incorrect user token account
                &Keypair::new().pubkey(),
                &nonce_account,
                &base_acc,
                eth_address.clone(),
            )
            .unwrap(),
        ],
        Some(&program_context.payer.pubkey()),
    );

    transaction.sign(&[&program_context.payer], program_context.last_blockhash);
    let tx_result = program_context
        .banks_client
        .process_transaction(transaction)
        .await;

    println!("tx_result: {:?}", tx_result);
    assert!(tx_result.is_err());
    assert_custom_error(
        tx_result,
        1,
        ClaimableProgramError::SignatureVerificationFailed,
    );
}

// Submit instruction with SECP missing
// Confirm failure as expected
#[tokio::test]
async fn missing_secp_instruction() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        _priv_key,
        _secp_pubkey,
        mint_account,
        mint_authority,
        user_token_account,
        eth_address,
    ) = init_test_variables();
    let mint_pubkey = mint_account.pubkey();
    let (base_acc, user_bank_account, _) = prepare_transfer(
        &mut program_context,
        mint_account,
        rent,
        mint_authority,
        eth_address,
        &user_token_account,
    )
    .await;
    let nonce_acct_seed = [NONCE_ACCOUNT_PREFIX.as_ref(), eth_address.as_ref()].concat();
    let (_, nonce_account, _) = find_nonce_address(&id(), &mint_pubkey, &nonce_acct_seed);

    // Submit transaction with missing secp256 program instruction
    let mut transaction = Transaction::new_with_payer(
        &[instruction::transfer(
            &id(),
            &program_context.payer.pubkey(),
            &user_bank_account,
            &user_token_account.pubkey(),
            &nonce_account,
            &base_acc,
            eth_address.clone(),
        )
        .unwrap()],
        Some(&program_context.payer.pubkey()),
    );

    transaction.sign(&[&program_context.payer], program_context.last_blockhash);
    let tx_result = program_context
        .banks_client
        .process_transaction(transaction)
        .await;

    println!("{:?}", tx_result);
    assert!(tx_result.is_err());
    assert_custom_error(
        tx_result,
        0,
        ClaimableProgramError::Secp256InstructionLosing,
    );
}

#[tokio::test]
async fn transfer_invalid_amount() {
    let mut program_context = program_test().start_with_context().await;
    let rent = program_context.banks_client.get_rent().await.unwrap();
    let (
        _rng,
        _key,
        priv_key,
        _secp_pubkey,
        mint_account,
        mint_authority,
        user_token_account,
        eth_address,
    ) = init_test_variables();

    let mint_pubkey = mint_account.pubkey();
    let (base_acc, user_bank_account, tokens_amount) = prepare_transfer(
        &mut program_context,
        mint_account,
        rent,
        mint_authority,
        eth_address,
        &user_token_account,
    )
    .await;

    let nonce_acct_seed = [NONCE_ACCOUNT_PREFIX.as_ref(), eth_address.as_ref()].concat();
    let (_, nonce_account, _) = find_nonce_address(&id(), &mint_pubkey, &nonce_acct_seed);

    // Increment amount to greater than available
    let transfer_amount = tokens_amount + 100;

    let current_user_nonce = get_user_account_nonce(&mut program_context, &nonce_account).await;
    let transfer_instr_data = TransferInstructionData {
        target_pubkey: user_token_account.pubkey(),
        amount: transfer_amount,
        nonce: current_user_nonce,
    };

    let encoded = transfer_instr_data.try_to_vec().unwrap();
    let secp256_program_instruction = new_secp256k1_instruction(&priv_key, &encoded);

    let mut transaction = Transaction::new_with_payer(
        &[
            secp256_program_instruction,
            instruction::transfer(
                &id(),
                &program_context.payer.pubkey(),
                &user_bank_account,
                &user_token_account.pubkey(),
                &nonce_account,
                &base_acc,
                eth_address.clone(),
            )
            .unwrap(),
        ],
        Some(&program_context.payer.pubkey()),
    );

    transaction.sign(&[&program_context.payer], program_context.last_blockhash);
    let tx_result = program_context
        .banks_client
        .process_transaction(transaction)
        .await;

    assert!(tx_result.is_err());
    // Confirm a transfer of 0 is not permitted
    match tx_result {
        Err(TransportError::TransactionError(TransactionError::InstructionError(
            _idx,
            InstructionError::InsufficientFunds,
        ))) => {
            println!(
                "Insufficient funds error found as expected: {:?}",
                tx_result
            );
        }
        _ => panic!("Unexpected error scenario {:?}", tx_result),
    }
}
