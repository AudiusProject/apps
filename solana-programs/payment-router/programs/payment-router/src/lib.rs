use anchor_lang::prelude::*;
use anchor_lang::{
    AnchorDeserialize,
    AnchorSerialize,
};
use anchor_spl::token::{Token, TokenAccount};

pub mod error;
pub mod router;

use crate::router::{
    check_recipient_amounts,
    check_sender,
    execute_transfers
};

#[cfg(not(feature = "no-entrypoint"))]
use solana_security_txt::security_txt;

declare_id!("paytYpX3LPN98TAeen6bFFeraGSuWnomZmCXjAsoqPa");

#[program]
pub mod payment_router {
    use super::*;

    pub fn create_payment_router_balance_pda(_ctx: Context<CreatePaymentRouterBalancePDA>) -> Result<()> {
        Ok(())
    }

    pub fn route<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, Route<'info>>,
        payment_router_pda_bump: u8,
        amounts: Vec<u64>,
        total_amount: u64
    ) -> Result<()> {
        let sender = &ctx.accounts.sender.to_account_info();
        let sender_owner = &ctx.accounts.sender_owner.to_account_info();
        let remaining_accounts = ctx.remaining_accounts;

        check_sender(
            sender.clone(),
            sender_owner.clone()
        )?;
        check_recipient_amounts(
            remaining_accounts,
            amounts.clone(),
            total_amount
        )?;
        execute_transfers(
            sender.clone(),
            sender_owner.clone(),
            remaining_accounts,
            amounts.clone(),
            payment_router_pda_bump
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreatePaymentRouterBalancePDA<'info> {
    #[account(
        init,
        seeds = [b"payment_router".as_ref()],
        payer = payer,
        bump,
        space = 8
    )]
    /// CHECK: This is the PDA owned by this program. This account will temporarily hold SOL USDC and SOL AUDIO tokens
    /// before transferring them over to given recipients, all within the same transaction.
    pub payment_router_pda: AccountInfo<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Route<'info> {
    #[account(mut)]
    /// CHECK: This is the token account owned by the PDA.
    pub sender: Account<'info, TokenAccount>,
    #[account(
        seeds = [b"payment_router".as_ref()],
        bump
    )]
    /// CHECK: This is the PDA initialized in the CreatePaymentRouterBalancePDA instruction.
    pub sender_owner: AccountInfo<'info>,
    pub spl_token: Program<'info, Token>,
}

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    // Required fields
    name: "Audius Payment Router",
    project_url: "https://audius.co",
    contacts: "email:security@audius.co",
    policy: "",

    // Optional Fields
    preferred_languages: "en",
    source_code: "https://github.com/AudiusProject/apps/tree/main/solana-programs/payment-router",
    auditors: "Neodyme"
}
