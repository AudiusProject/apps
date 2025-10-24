use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    mint,
    token::
    {
        TokenAccount,
        Mint,
        Token
    }
};

pub mod constant;
pub mod error;
pub mod raydium;
pub mod wormhole;

use crate::constant::{
    RAYDIUM_AMM_PROGRAM,
    AUDIO_USDC_RAYDIUM_AMM,
    SERUM_DEX_PROGRAM,
    AUDIO_USDC_SERUM_MARKET,
    SOL_AUDIO_TOKEN,
    WORMHOLE_TOKEN_BRIDGE_ID,
    WORMHOLE_CORE_BRIDGE_ID
};
use crate::error::StakingBridgeErrorCode;
use crate::raydium::swap;
use crate::wormhole::{
    check_wrapped_mint_pda,
    approve_wormhole_transfer,
    execute_wormhole_transfer
};

#[cfg(not(feature = "no-entrypoint"))]
use solana_security_txt::security_txt;

declare_id!("stkB5DZziVJT1C1VmzvDdRtdWxfs5nwcHViiaNBDK31");

#[program]
pub mod staking_bridge {
    use super::*;

    pub fn create_staking_bridge_balance_pda(_ctx: Context<CreateStakingBridgeBalancePda>) -> Result<()> {
        Ok(())
    }

    pub fn create_staking_bridge_balance_atas(_ctx: Context<CreateStakingBridgeBalanceAtas>) -> Result<()> {
        Ok(())
    }

    /**
     * Verifies that correct programs, token accounts, PDAs are being used,
     * and then swaps tokens via the Raydium AMM Program.
     */
    pub fn raydium_swap(
        ctx: Context<RaydiumSwap>,
        amount_in: u64,
        minimum_amount_out: u64,
        staking_bridge_pda_bump: u8
    ) -> Result<()> {
        let accounts = ctx.accounts;
        swap(
            accounts,
            amount_in,
            minimum_amount_out,
            staking_bridge_pda_bump
        )?;
        Ok(())
    }

    pub fn post_wormhole_message(
        ctx: Context<PostWormholeMessage>,
        nonce: u32,
        amount: u64,
        wrapped_mint_bump: u8,
        staking_bridge_pda_bump: u8,
    ) -> Result<()> {
        let accounts = ctx.accounts;
        check_wrapped_mint_pda(
            accounts,
            wrapped_mint_bump,
        )?;
        approve_wormhole_transfer(
            accounts,
            amount,
            staking_bridge_pda_bump
        )?;
        execute_wormhole_transfer(
            accounts,
            nonce,
            amount,
            staking_bridge_pda_bump
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateStakingBridgeBalancePda<'info> {
    #[account(
        init,
        seeds = [b"staking_bridge".as_ref()],
        payer = payer,
        bump,
        space = 8
    )]
    /// CHECK: This is the PDA owned by this program. This account holds both SOL USDC and SOL AUDIO. It is used to swap between the two tokens. This PDA is also used to transfer SOL AUDIO to ETH AUDIO via the wormhole.
    pub staking_bridge_pda: AccountInfo<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateStakingBridgeBalanceAtas<'info> {
    #[account(
        seeds = [b"staking_bridge".as_ref()],
        bump
    )]
    /// CHECK: This is the PDA owned by this program. This account holds both SOL USDC and SOL AUDIO. It is used to swap between the two tokens. This PDA is also used to transfer SOL AUDIO to ETH AUDIO via the wormhole.
    pub staking_bridge_pda: AccountInfo<'info>,
    #[account(
        init,
        payer = payer,
        associated_token::mint = usdc_mint,
        associated_token::authority = staking_bridge_pda,
    )]
    pub usdc_token_account: Account<'info, TokenAccount>,
    #[account(address = mint::USDC)]
    pub usdc_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = payer,
        associated_token::mint = audio_mint,
        associated_token::authority = staking_bridge_pda,
    )]
    pub audio_token_account: Account<'info, TokenAccount>,
    #[account(address = SOL_AUDIO_TOKEN)]
    pub audio_mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorDeserialize, AnchorSerialize, Default)]
pub struct Amounts {
    pub amount_in: u64,
    pub minimum_amount_out: u64,
}

#[derive(Accounts)]
pub struct RaydiumSwap<'info> {
    #[account(
        address = RAYDIUM_AMM_PROGRAM @ StakingBridgeErrorCode::NotCallingRaydiumAmmProgram
    )]
    /// CHECK: This is the Raydium Liquidity Pool V4 program id
    pub program_id: AccountInfo<'info>,
    #[account(
        mut,
        address = AUDIO_USDC_RAYDIUM_AMM @ StakingBridgeErrorCode::InvalidAmmProgram
    )]
    /// CHECK: This is the AMM id for the pool.
    pub amm: AccountInfo<'info>,
    #[account()]
    /// CHECK: This is the authority for the pool. Passed through to Raydium and checked there.
    pub amm_authority: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: This is the open orders account for the pool. Passed through to Raydium and checked there.
    pub amm_open_orders: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: This is the target orders account for the pool. Passed through to Raydium and checked there.
    pub amm_target_orders: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: This is the coin token account for the pool. Passed through to Raydium and checked there.
    pub pool_coin_token_account: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: This is the pc token account for the pool. Passed through to Raydium and checked there.
    pub pool_pc_token_account: UncheckedAccount<'info>,
    #[account(
        address = SERUM_DEX_PROGRAM @ StakingBridgeErrorCode::InvalidSerumDexProgram
    )]
    /// CHECK: This is the Serum DEX program.
    pub serum_program: AccountInfo<'info>,
    #[account(
        mut,
        address = AUDIO_USDC_SERUM_MARKET @ StakingBridgeErrorCode::InvalidSerumMarketProgram
    )]
    /// CHECK: This is the market address
    pub serum_market: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK: This is the bids account for the serum market. Passed through to Raydium and checked there.
    pub serum_bids: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: This is the asks account for the serum market. Passed through to Raydium and checked there.
    pub serum_asks: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: This is the event queue for the serum market. Passed through to Raydium and checked there.
    pub serum_event_queue: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: This is the coin vault for the serum market. Passed through to Raydium and checked there.
    pub serum_coin_vault_account: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: This is the pc vault for the serum market. Passed through to Raydium and checked there.
    pub serum_pc_vault_account: UncheckedAccount<'info>,
    #[account()]
    /// CHECK: This is the vault signer for the serum market. Passed through to Raydium and checked there.
    pub serum_vault_signer: UncheckedAccount<'info>,
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = user_source_owner,
    )]
    pub user_source_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = audio_mint,
        associated_token::authority = user_source_owner,
    )]
    pub user_destination_token_account: Account<'info, TokenAccount>,
    #[account(
        seeds = [b"staking_bridge".as_ref()],
        bump
    )]
    /// CHECK: This is the PDA initialized in the CreateStakingBridgeBalancePda instruction.
    pub user_source_owner: AccountInfo<'info>,
    #[account(address = mint::USDC)]
    pub usdc_mint: Account<'info, Mint>,
    #[account(address = SOL_AUDIO_TOKEN)]
    pub audio_mint: Account<'info, Mint>,
    pub spl_token_program: Program<'info, Token>,
}

#[derive(AnchorDeserialize, AnchorSerialize, Default)]
pub struct PostWormholeMessageData {
    pub nonce: u32,
    pub amount: u64,
    pub fee: u64,
    pub target_address: [u8; 32],
    pub target_chain: u16,
}

#[derive(Accounts)]
pub struct PostWormholeMessage<'info> {
    #[account(
        address = WORMHOLE_TOKEN_BRIDGE_ID @ StakingBridgeErrorCode::NotCallingWormholeTokenBridgeProgram
    )]
    /// CHECK: This is the Token Bridge program id
    pub program_id: AccountInfo<'info>,
    #[account(
        address = WORMHOLE_CORE_BRIDGE_ID @ StakingBridgeErrorCode::InvalidWormholeCoreBridgeProgram
    )]
    /// CHECK: This is the Core Bridge program id
    pub bridge_id: AccountInfo<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account()]
    /// CHECK: This is the config PDA owned by the Token Bridge. Passed through to Wormhole and checked there.
    pub config: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: This is the wrapped mint PDA, which also depends on the origin token chain and origin token address, owned by the Token Bridge. Checked in 'check_wrapped_mint_pda'.
    pub wrapped_mint: UncheckedAccount<'info>,
    #[account()]
    /// CHECK: This is the wrapped meta PDA, which also depends on the wrapped mint, owned by the Token Bridge. Passed through to Wormhole and checked there.
    pub wrapped_meta: UncheckedAccount<'info>,
    #[account()]
    /// CHECK: This is the authority signer PDA owned by the Token Bridge. Passed through to Wormhole and checked there.
    pub authority_signer: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: This is the bridge PDA owned by the Core Bridge. Passed through to Wormhole and checked there.
    pub bridge_config: UncheckedAccount<'info>,
    #[account()]
    /// CHECK: This is the emitter PDA owned by the Token Bridge. Passed through to Wormhole and checked there.
    pub emitter: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: This is the sequence PDA, which also depends on the emitter, owned by the Core Bridge. Passed through to Wormhole and checked there.
    pub sequence: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: This is the fee collector PDA owned by the Core Bridge. Passed through to Wormhole and checked there.
    pub fee_collector: UncheckedAccount<'info>,
    #[account(mut)]
    pub message: Signer<'info>,
    #[account(
        mut,
        seeds = [b"staking_bridge".as_ref()],
        bump
    )]
    /// CHECK: This is the PDA initialized in the CreateStakingBridgeBalancePda instruction.
    pub from_owner: AccountInfo<'info>,
    #[account(
        mut,
        associated_token::mint = audio_mint,
        associated_token::authority = from_owner,
    )]
    pub from: Account<'info, TokenAccount>,
    #[account(address = SOL_AUDIO_TOKEN)]
    pub audio_mint: Account<'info, Mint>,
    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub spl_token: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    // Required fields
    name: "Audius Staking Bridge",
    project_url: "https://audius.co",
    contacts: "email:security@audius.co",
    policy: "",

    // Optional Fields
    preferred_languages: "en",
    source_code: "https://github.com/AudiusProject/apps/tree/main/solana-programs/staking-bridge",
    auditors: "Neodyme"
}
