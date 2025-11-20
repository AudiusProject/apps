use std::convert::TryInto;
use std::ops::Mul;

use anyhow::anyhow;
use anyhow::{bail, Context};
use borsh::BorshSerialize;
use claimable_tokens::state::{NonceAccount, TransferInstructionData, SignedSetAuthorityData};
use claimable_tokens::utils::program::{find_nonce_address, NONCE_ACCOUNT_PREFIX};
use claimable_tokens::{
    utils::program::{find_address_pair, EthereumAddress},
};
use claimable_tokens::instruction::{
    CreateTokenAccount,
};
use clap::{
    crate_description, crate_name, crate_version, value_t, App, AppSettings, Arg, ArgMatches,
    SubCommand,
};
use solana_clap_utils::input_parsers::keypair_of;
use solana_clap_utils::input_validators::is_keypair;
use solana_clap_utils::{
    fee_payer::fee_payer_arg,
    input_parsers::pubkey_of,
    input_validators::{is_pubkey, is_url_or_moniker, is_valid_signer},
    keypair::signer_from_path,
};
use solana_client::{rpc_client::RpcClient, rpc_response::Response};
use solana_program::instruction::Instruction;
use solana_program::program_option::COption;
use solana_sdk::signature::Keypair;
use solana_sdk::{secp256k1_instruction, bs58};
use solana_sdk::{
    account::ReadableAccount,
    commitment_config::CommitmentConfig,
    program_pack::Pack,
    pubkey::Pubkey,
    secp256k1_instruction::{construct_eth_pubkey, new_secp256k1_instruction},
    signature::Signer,
    transaction::Transaction,
};
use spl_associated_token_account::{create_associated_token_account, get_associated_token_address};
use spl_token::state::{Account, Mint};

struct Config {
    owner: Box<dyn Signer>,
    fee_payer: Box<dyn Signer>,
    rpc_client: RpcClient,
}

fn handle_hex_prefix(hex_str: &mut String) {
    if hex_str.starts_with("0x") {
        hex_str.replace_range(..=1, "");
    }
}

fn eth_address_of(matches: &ArgMatches<'_>, name: &str) -> anyhow::Result<EthereumAddress> {
    let mut value = value_t!(matches.value_of(name), String)?;
    handle_hex_prefix(&mut value);
    let decoded_pk = hex::decode(value.as_str())?;
    decoded_pk
        .try_into()
        .map_err(|op: Vec<u8>| anyhow!("Address len must be 20, but current is {}", op.len()))
}

fn eth_seckey_of(matches: &ArgMatches<'_>, name: &str) -> anyhow::Result<libsecp256k1::SecretKey> {
    let mut value = value_t!(matches.value_of(name), String)?;
    handle_hex_prefix(&mut value);
    let decoded_pk = &hex::decode(value.as_str())?;
    let sk = libsecp256k1::SecretKey::parse_slice(decoded_pk)?;
    Ok(sk)
}

fn calculate_and_create_associated_key(config: &Config, mint: &Pubkey) -> anyhow::Result<Pubkey> {
    let calculated_key =
        spl_associated_token_account::get_associated_token_address(&config.owner.pubkey(), &mint);

    if !token_account_initialized(config, &calculated_key) {
        bail!("Command processing was interrupted because owner token account isn't initialized.")
    }
    Ok(calculated_key)
}

fn token_account_initialized(config: &Config, key: &Pubkey) -> bool {
    let token_acc_data = config.rpc_client.get_account_data(&key).ok();
    if let Some(acc_data) = token_acc_data {
        let token_acc = Account::unpack(acc_data.as_slice());

        if token_acc.is_ok() {
            return true;
        }
    }
    false
}

fn transfer(
    config: Config,
    secret_key: libsecp256k1::SecretKey,
    mint: Pubkey,
    recipient: Option<Pubkey>,
    amount: f64,
) -> anyhow::Result<()> {
    let mut instructions = vec![];

    let eth_pubkey = libsecp256k1::PublicKey::from_secret_key(&secret_key);
    let eth_address = construct_eth_pubkey(&eth_pubkey);
    let pair = find_address_pair(&claimable_tokens::id(), &mint, eth_address)?;
    let nonce_acct_seed = [NONCE_ACCOUNT_PREFIX.as_ref(), eth_address.as_ref()].concat();

    let (_, user_nonce_acc, _) =
        find_nonce_address(&claimable_tokens::id(), &mint, &nonce_acct_seed);
    println!("Found user nonce account addr ={:?}", user_nonce_acc);

    // If `recipient` token account provided - we will use it,
    // otherwise will use token account associated with `config.owner`
    let user_acc = recipient.map_or_else(
        || -> anyhow::Result<Pubkey> {
            let user_acc = get_associated_token_address(&config.owner.pubkey(), &mint);
            // Checks, if the associated token account exist otherwise,
            // we must add instruction to create it
            if let Response {
                value: Some(account),
                ..
            } = config
                .rpc_client
                .get_account_with_commitment(&user_acc, config.rpc_client.commitment())?
            {
                // Unpack for checking that is token account
                let account_data = Account::unpack(account.data())?;

                // Check that account's mint correct
                if account_data.mint != mint {
                    bail!("Associated token account has incorrect mint");
                }

                // Checking that mint account exist
                let mint_acc_response = config
                    .rpc_client
                    .get_account_with_commitment(&mint, config.rpc_client.commitment())?;
                // Unpack for checking that is mint account
                let mint_data = Mint::unpack(mint_acc_response.value.unwrap().data())?;
                println!("SPL mint info {:?}", &mint_data);
            } else {
                instructions.push(create_associated_token_account(
                    &config.fee_payer.pubkey(),
                    &config.owner.pubkey(),
                    &mint,
                ));
            }

            Ok(user_acc)
        },
        Ok,
    )?;

    let mint_acc_response = config
        .rpc_client
        .get_account_with_commitment(&mint, config.rpc_client.commitment())?;
    // Unpack for checking that is mint account
    let mint_data = Mint::unpack(mint_acc_response.value.unwrap().data())?;
    println!("SPL mint info {:?}", &mint_data);

    let nonce_raw_data_fetch = config.rpc_client.get_account_data(&user_nonce_acc);
    let mut current_user_nonce: u64 = 0;
    if !nonce_raw_data_fetch.is_err() {
        let nonce_raw_data = nonce_raw_data_fetch.unwrap();
        let nonce_data = NonceAccount::unpack(nonce_raw_data.as_ref())?;
        current_user_nonce = nonce_data.nonce;
    }

    // Multiply the provided amount value by the number of decimals for this SPL token
    let dec = 10.0f64.powf(mint_data.decimals as f64);
    let converted_amount = amount.mul(dec);

    // Generate transfer instruction data
    let transfer_instr_data = TransferInstructionData {
        target_pubkey: user_acc,
        amount: converted_amount as u64,
        nonce: current_user_nonce,
    };

    println!("Transfer details = {:?}", transfer_instr_data);
    let encoded = transfer_instr_data.try_to_vec().unwrap();
    let secp_instr = new_secp256k1_instruction(&secret_key, &encoded);
    let instructions = &[
        secp_instr,
        claimable_tokens::instruction::transfer(
            &claimable_tokens::id(),
            &config.fee_payer.pubkey(),
            &pair.derive.address,
            &user_acc,
            &user_nonce_acc,
            &pair.base.address,
            eth_address.clone(),
        )?,
    ];
    let mut tx = Transaction::new_with_payer(instructions, Some(&config.fee_payer.pubkey()));
    let (recent_blockhash, _) = config.rpc_client.get_recent_blockhash()?;
    tx.sign(&[config.fee_payer.as_ref()], recent_blockhash);
    let tx_hash = config
        .rpc_client
        .send_and_confirm_transaction_with_spinner(&tx)?;
    println!("Transfer completed, transaction hash: {:?}", tx_hash);
    Ok(())
}

fn send_to(config: Config, eth_address: [u8; 20], mint: Pubkey, amount: f64) -> anyhow::Result<()> {
    let mut instructions: Vec<Instruction> = vec![];

    let pair = find_address_pair(&claimable_tokens::id(), &mint, eth_address)?;
    // Checking if the derived address of recipient does not exist
    // then we must add instruction to create it
    let derived_token_acc_data = config.rpc_client.get_account_data(&pair.derive.address);
    
    if derived_token_acc_data.is_err() {
        instructions.push(claimable_tokens::instruction::init(
            &claimable_tokens::id(),
            &config.fee_payer.pubkey(),
            &mint,
            CreateTokenAccount { eth_address },
        )?);
    }

    let mint_raw_data = config.rpc_client.get_account_data(&mint)?;
    let mint_data = Mint::unpack(mint_raw_data.as_ref())?;

    let account = calculate_and_create_associated_key(&config, &mint)?;

    instructions.push(spl_token::instruction::transfer(
        &spl_token::id(),
        &account,
        &pair.derive.address,
        &config.owner.pubkey(),
        &[&config.owner.pubkey()],
        spl_token::ui_amount_to_amount(amount, mint_data.decimals),
    )?);

    let mut tx =
        Transaction::new_with_payer(instructions.as_slice(), Some(&config.fee_payer.pubkey()));
    let (recent_blockhash, _) = config.rpc_client.get_recent_blockhash()?;
    tx.sign(
        &[config.fee_payer.as_ref(), config.owner.as_ref()],
        recent_blockhash,
    );
    let tx_hash = config
        .rpc_client
        .send_and_confirm_transaction_with_spinner(&tx)?;

    println!(
        "Transfer completed to recipient: {}\nTransaction hash: {:?}",
        pair.derive.address, tx_hash
    );
    Ok(())
}

fn balance(config: Config, eth_address: EthereumAddress, mint: Pubkey) -> anyhow::Result<()> {
    let pair = find_address_pair(&claimable_tokens::id(), &mint, eth_address)?;

    if let Response {
        value: Some(account),
        ..
    } = config
        .rpc_client
        .get_token_account_with_commitment(&pair.derive.address, config.rpc_client.commitment())?
    {
        println!(
            "Address balance: {}",
            account.token_amount.ui_amount.unwrap()
        );
    } else {
        println!("Address not found");
    }

    Ok(())
}

fn init_account(
    config: Config,
    eth_address: EthereumAddress,
    mint: Pubkey,
) -> anyhow::Result<()> {
    let instruction = claimable_tokens::instruction::init(
        &claimable_tokens::id(),
        &config.fee_payer.pubkey(),
        &mint,
        CreateTokenAccount { eth_address },
    )?;
    let mut tx =
        Transaction::new_with_payer(&[instruction], Some(&config.fee_payer.pubkey()));
    let (recent_blockhash, _) = config.rpc_client.get_recent_blockhash()?;
    tx.sign(&[config.fee_payer.as_ref()], recent_blockhash);
    let tx_hash = config
        .rpc_client
        .send_and_confirm_transaction_with_spinner_and_config(
            &tx,
            config.rpc_client.commitment(),
            solana_client::rpc_config::RpcSendTransactionConfig {
                skip_preflight: true,
                preflight_commitment: None,
                encoding: None,
                max_retries: None,
            },
        )?;
    println!("Init completed, transaction hash: {:?}", tx_hash);
    Ok(())
}

fn set_authority(
    config: Config,
    eth_private_key: libsecp256k1::SecretKey,
    mint: Pubkey,
    new_authority: Pubkey,
    authority_type: spl_token::instruction::AuthorityType,
) -> anyhow::Result<()> {
    let eth_pubkey = libsecp256k1::PublicKey::from_secret_key(&eth_private_key);
    let eth_address = construct_eth_pubkey(&eth_pubkey);
    let pair = find_address_pair(&claimable_tokens::id(), &mint, eth_address)?;

    let (recent_blockhash, _) = config.rpc_client.get_recent_blockhash()?;

    let signed_instruction = spl_token::instruction::TokenInstruction::SetAuthority {
        authority_type,
        new_authority: COption::Some(new_authority),
    };

    let message = SignedSetAuthorityData {
        blockhash: recent_blockhash,
        instruction: signed_instruction.pack(),
        account_pubkey: pair.derive.address,
    };

    let signature_instr = secp256k1_instruction::new_secp256k1_instruction(
        &eth_private_key,
        &message.try_to_vec().unwrap(),
    );
    let set_authority_instruction = claimable_tokens::instruction::set_authority(
        &claimable_tokens::id(),
        &pair.derive.address,
        &pair.base.address,
    )?;
    let mut tx =
        Transaction::new_with_payer(&[signature_instr, set_authority_instruction], Some(&config.fee_payer.pubkey()));
    tx.sign(
        &[config.fee_payer.as_ref(), config.owner.as_ref()],
        recent_blockhash,
    );
    let tx_hash = config
        .rpc_client
        .send_and_confirm_transaction_with_spinner(&tx)?;
    println!("Set authority completed, transaction hash: {:?}", tx_hash);
    Ok(())
}

fn close(
    config: Config,
    eth_address: EthereumAddress,
    mint: Pubkey,
    destination_account: Pubkey,
) -> anyhow::Result<()> {
    let pair = find_address_pair(&claimable_tokens::id(), &mint, eth_address)?;
    let instruction = claimable_tokens::instruction::close(
        &claimable_tokens::id(),
        &pair.derive.address,
        &pair.base.address,
        &destination_account,
        eth_address
    )?;
    let mut tx =
        Transaction::new_with_payer(&[instruction], Some(&config.fee_payer.pubkey()));
    let (recent_blockhash, _) = config.rpc_client.get_recent_blockhash()?;
    tx.sign(&[config.fee_payer.as_ref()], recent_blockhash);
    let tx_hash = config
        .rpc_client
        .send_and_confirm_transaction_with_spinner(&tx)?;
    println!("Close completed, transaction hash: {:?}", tx_hash);
    Ok(())
}

fn main() -> anyhow::Result<()> {
    let matches = App::new(crate_name!())
        .about(crate_description!())
        .version(crate_version!())
        .setting(AppSettings::SubcommandRequiredElseHelp)
        .arg({
            let arg = Arg::with_name("config_file")
                .short("C")
                .long("config")
                .value_name("PATH")
                .takes_value(true)
                .global(true)
                .help("Configuration file to use");
            if let Some(ref config_file) = *solana_cli_config::CONFIG_FILE {
                arg.default_value(&config_file)
            } else {
                arg
            }
        })
        .arg(
            Arg::with_name("json_rpc_url")
                .short("u")
                .long("url")
                .value_name("URL_OR_MONIKER")
                .takes_value(true)
                .global(true)
                .validator(is_url_or_moniker)
                .help(
                    "URL for Solana's JSON RPC or moniker (or their first letter): \
                   [mainnet-beta, testnet, devnet, localhost] \
                Default from the configuration file.",
                ),
        )
        .arg(
            Arg::with_name("owner")
                .long("owner")
                .value_name("KEYPAIR")
                .validator(is_valid_signer)
                .takes_value(true)
                .global(true)
                .help(
                    "Specify the token owner account. \
             This may be a keypair file, the ASK keyword. \
             Defaults to the client keypair.",
                ),
        )
        .arg(fee_payer_arg().global(true))
        .subcommands(vec![
            SubCommand::with_name("send-to")
                .args(&[
                    Arg::with_name("recipient")
                        .value_name("ETHEREUM_ADDRESS")
                        .takes_value(true)
                        .required(true)
                        .help("Recipient Ethereum address"),
                    Arg::with_name("mint")
                        .value_name("MINT_ADDRESS")
                        .takes_value(true)
                        .required(true)
                        .help("Mint for the token to send"),
                    Arg::with_name("amount")
                        .value_name("NUMBER")
                        .takes_value(true)
                        .required(true)
                        .help("Amount to send"),
                ])
                .help("Sends some amount of tokens of specified mint to the Solana account associated with Ethereum address."),
            SubCommand::with_name("transfer").args(&[
                Arg::with_name("mint")
                    .validator(is_pubkey)
                    .value_name("MINT_ADDRESS")
                    .takes_value(true)
                    .required(true)
                    .help("Mint for token to claim"),
                Arg::with_name("private_key")
                    .value_name("ETHEREUM_PRIVATE_KEY")
                    .takes_value(true)
                    .required(true)
                    .help("Ethereum private key to sign the transaction"),
                Arg::with_name("amount")
                    .value_name("NUMBER")
                    .takes_value(true)
                    .required(true)
                    .help("Amount to claim"),
                Arg::with_name("recipient")
                    .long("recipient")
                    .validator(is_pubkey)
                    .value_name("RECIPIENT_ADDRESS")
                    .takes_value(true)
                    .required(true)
                    .help("Recipient of transfer."),
                ])
                .help("Transfers some amount of tokens from your account associated with Ethereum address to another account."),
            SubCommand::with_name("balance").args(&[
                Arg::with_name("address")
                    .value_name("ETHEREUM_ADDRESS")
                    .takes_value(true)
                    .required(true)
                    .help("Ethereum address"),
                Arg::with_name("mint")
                    .value_name("MINT_ADDRESS")
                    .takes_value(true)
                    .required(true)
                    .help("Mint of tokens that hold at associated account."),
            ]),
            SubCommand::with_name("generate-base-pda").args(&[
                Arg::with_name("mint")
                    .value_name("MINT_ADDRESS")
                    .takes_value(true)
                    .required(true)
                    .help("Token mint account"),
                Arg::with_name("program_id")
                    .value_name("PROGRAM_ID")
                    .takes_value(true)
                    .required(true)
                    .help("Program Id address"),
            ])
                .help("Receives balance of account that associated with Ethereum address and specific mint."),
            SubCommand::with_name("init").args(&[
                Arg::with_name("eth_address")
                    .value_name("ETHEREUM_ADDRESS")
                    .takes_value(true)
                    .required(true)
                    .help("Ethereum address to create token account for"),
                Arg::with_name("mint")
                    .validator(is_pubkey)
                    .value_name("MINT_ADDRESS")
                    .takes_value(true)
                    .required(true)
                    .help("Token mint address"),
            ])
                .help("Create a token account for the specified Ethereum address and mint."),
            SubCommand::with_name("set-authority").args(&[
                Arg::with_name("private_key")
                    .value_name("ETHEREUM_PRIVATE_KEY")
                    .takes_value(true)
                    .required(true)
                    .help("Ethereum private key associated with the token account to change authority of."),
                Arg::with_name("mint")
                    .validator(is_pubkey)
                    .value_name("MINT_ADDRESS")
                    .takes_value(true)
                    .required(true)
                    .help("Token mint address"),
                Arg::with_name("new_authority") 
                    .validator(is_pubkey)
                    .value_name("NEW_AUTHORITY")
                    .takes_value(true)
                    .required(true)
                    .help("New authority to set for the token account."),
                Arg::with_name("authority_type")
                    .value_name("AUTHORITY_TYPE")
                    .takes_value(true)
                    .required(true)
                    .help("Type of authority to set for the token account."),
            ])
                .help("Set a new authority for the token account associated with the specified Ethereum address and mint."),
            SubCommand::with_name("close").args(&[
                Arg::with_name("eth_address")
                    .value_name("ETHEREUM_ADDRESS")
                    .takes_value(true)
                    .required(true)
                    .help("Ethereum address to close token account for"),
                Arg::with_name("mint")
                    .validator(is_pubkey)
                    .value_name("MINT_ADDRESS")
                    .takes_value(true)
                    .required(true)
                    .help("Token mint address"),
                Arg::with_name("rent_destination")
                    .validator(is_pubkey)
                    .value_name("RENT_DESTINATION")
                    .takes_value(true)
                    .required(true)
                    .help("Where to return the rent to when the account is closed."),
            ])
                .help("Close the token account associated with the specified Ethereum address and mint."),
        ])
        .get_matches();

    let mut wallet_manager = None;

    let cli_config = if let Some(config_file) = matches.value_of("config_file") {
        solana_cli_config::Config::load(config_file)?
    } else {
        println!("Config file not provided and default config does not exist. Create config");
        solana_cli_config::Config::default()
    };
    let json_rpc_url = value_t!(matches, "json_rpc_url", String)
        .unwrap_or_else(|_| cli_config.json_rpc_url.clone());
    let owner = signer_from_path(
        &matches,
        matches
            .value_of("owner")
            .unwrap_or(&cli_config.keypair_path),
        "owner",
        &mut wallet_manager,
    )
    .expect("Keypair for set owner cannot be found in path");
    let fee_payer = signer_from_path(
        &matches,
        matches
            .value_of("fee_payer")
            .unwrap_or(&cli_config.keypair_path),
        "fee_payer",
        &mut wallet_manager,
    )
    .expect("Keypair for set fee pair cannot be found in path");

    let config = Config {
        owner,
        fee_payer,
        rpc_client: RpcClient::new_with_commitment(json_rpc_url, CommitmentConfig::confirmed()),
    };

    solana_logger::setup_with_default("solana=info");

    match matches.subcommand() {
        ("transfer", Some(args)) => {
            let (privkey, mint, recipient, amount) = (|| -> anyhow::Result<_> {
                let privkey = eth_seckey_of(args, "private_key")?;
                let mint = pubkey_of(args, "mint").unwrap();
                let recipient = pubkey_of(args, "recipient");
                let amount = value_t!(args.value_of("amount"), f64)?;
                println!("Mint = {:?}", mint);
                println!("Recipient = {:?}", recipient);
                println!("Amount (wei/lamports base amount) = {:?}", amount);
                Ok((privkey, mint, recipient, amount))
            })()
            .context("Preparing parameters for execution command `transfer`")?;

            transfer(config, privkey, mint, recipient, amount)
                .context("Failed to execute `transfer` command")?
        }
        ("send-to", Some(args)) => {
            let (eth_address, mint, amount) = (|| -> anyhow::Result<_> {
                let eth_address = eth_address_of(args, "recipient")?;
                let mint = pubkey_of(args, "mint").unwrap();
                let amount = value_t!(args.value_of("amount"), f64)?;

                Ok((eth_address, mint, amount))
            })()
            .context("Preparing parameters for execution command `send to`")?;

            send_to(config, eth_address, mint, amount)
                .context("Failed to execute `send to` command")?
        }
        ("balance", Some(args)) => {
            let (eth_address, mint) = (|| -> anyhow::Result<_> {
                let eth_address = eth_address_of(args, "address")?;
                let mint = pubkey_of(args, "recipient").unwrap();

                Ok((eth_address, mint))
            })()
            .context("Preparing parameters for execution command `balance`")?;

            balance(config, eth_address, mint).context("Failed to execute `balance` command")?
        }
        ("generate-base-pda", Some(args)) => {
            let _base_account = (|| -> anyhow::Result<_> {
                let mint = pubkey_of(args, "mint").unwrap();
                let program_id = pubkey_of(args, "program_id").unwrap();
                println!("Recieved mint {:?}", mint);
                println!("Recieved program_id {:?}", program_id);
                let program_base_address =
                    Pubkey::find_program_address(&[&mint.to_bytes()[..32]], &program_id);
                println!("Recieved program_base_address {:?}", program_base_address);

                Ok(program_base_address)
            })()
            .context("Preparing parameters for execution command `send to`")?;
        }
        ("init", Some(args)) => {
            let (mint, eth_address) = (|| -> anyhow::Result<_> {
                let eth_address = eth_address_of(args, "eth_address")?;
                let mint = pubkey_of(args, "mint").unwrap();

                Ok((mint, eth_address))
            })()
            .context("Preparing parameters for execution command `init`")?;

            init_account(config, eth_address, mint)
                .context("Failed to execute `init` command")?
        }
        ("set-authority", Some(args)) => {
            let (eth_private_key, mint, new_authority, authority_type) = (|| -> anyhow::Result<_> {
                let eth_private_key = eth_seckey_of(args, "private_key")?;
                let mint = pubkey_of(args, "mint").unwrap();
                let new_authority = pubkey_of(args, "new_authority").unwrap();
                let authority_type_arg = args.value_of("authority_type").unwrap();
                if authority_type_arg != "AccountOwner" && authority_type_arg != "CloseAccount" {
                    bail!("Invalid authority type provided. Must be either 'AccountOwner' or 'CloseAccount'");
                }
                let authority_type = match authority_type_arg {
                    "AccountOwner" => spl_token::instruction::AuthorityType::AccountOwner,
                    "CloseAccount" => spl_token::instruction::AuthorityType::CloseAccount,
                    _ => unreachable!(),
                };

                Ok((eth_private_key, mint, new_authority, authority_type))
            })()
            .context("Preparing parameters for execution command `set-authority`")?;

            set_authority(config, eth_private_key, mint, new_authority, authority_type)
                .context("Failed to execute `set-authority` command")?
        }
        ("close", Some(args)) => {
            let (eth_address, mint, rent_destination) = (|| -> anyhow::Result<_> {
                let eth_address = eth_address_of(args, "eth_address")?;
                let mint = pubkey_of(args, "mint").unwrap();
                let rent_destination = pubkey_of(args, "rent_destination").unwrap();

                Ok((eth_address, mint, rent_destination))
            })()
            .context("Preparing parameters for execution command `close`")?;

            close(config, eth_address, mint, rent_destination)
                .context("Failed to execute `close` command")?
        }

        _ => unreachable!(),
    }
    Ok(())
}

#[test]
fn test_eth_address_gen_from_secret() {
    use secp256k1::*;

    const INPUT_PV: &str = "a53b70c96e7960f1dc295c13fc4c6598a94cd6e98c418e5d4f33146402d13935";
    let private = SecretKey::parse_slice(&hex::decode(INPUT_PV).unwrap().as_slice()).unwrap();
    let eth_address = secp256k1::PublicKey::from_secret_key(&private);
    let hashed_eth_pk = construct_eth_pubkey(&eth_address);
    assert_eq!(
        "7f14493c18aa7ff329a3cbd8309296f1ab838c21",
        hex::encode(hashed_eth_pk)
    );
}

#[test]
fn test_parse_eth_pv() {
    use secp256k1::*;
    use std::str;

    const INPUT_PV: &str = "09e910621c2e988e9f7f6ffcd7024f54ec1461fa6e86a4b545e9e1fe21c28866";
    const EXPECTED_PUB: &str = "048e66b3e549818ea2cb354fb70749f6c8de8fa484f7530fc447d5fe80a1c424e4f5ae648d648c980ae7095d1efad87161d83886ca4b6c498ac22a93da5099014a";

    let private = SecretKey::parse_slice(&hex::decode(INPUT_PV).unwrap().as_slice()).unwrap();
    let public = PublicKey::from_secret_key(&private);
    let serialized = public.serialize();
    let str_pub = hex::decode(EXPECTED_PUB).unwrap();

    assert_eq!(&str_pub, serialized.as_ref());
}
