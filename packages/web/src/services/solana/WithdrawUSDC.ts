import { getLookupTableAccounts, getRecentBlockhash } from '@audius/common'
import { MintName } from '@audius/sdk'
import {
  createCloseAccountInstruction,
  createAssociatedTokenAccountInstruction,
  NATIVE_MINT,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync
} from '@solana/spl-token'
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js'
import BN from 'bn.js'

import {
  JupiterSingleton,
  parseInstruction
} from 'services/audius-backend/Jupiter'
import { audiusBackendInstance } from 'services/audius-backend/audius-backend-instance'
import { getLibs } from 'services/audius-libs'
import {
  getAssociatedTokenAccountRent,
  getTransferTransactionFee
} from 'services/solana/solana'

// TODO: Grab from remote config
// Allowable slippage amount for USDC jupiter swaps in %.
const USDC_SLIPPAGE = 3

export const getFundDestinationTokenAccountFees = async (
  account: PublicKey
) => {
  const rent = await getAssociatedTokenAccountRent()
  const fee = await getTransferTransactionFee(account)
  return (rent + fee) / LAMPORTS_PER_SOL
}

/**
 * Creates instructions to swap from a user bank token into the given wallet as SOL.
 * These instructions are allowed in relay because every created token account is closed in the same transaction.
 */
export const createSwapUserbankToSolInstructions = async ({
  mint,
  outSolAmount,
  wallet,
  feePayer
}: {
  mint: MintName
  outSolAmount: number
  feePayer: PublicKey
  wallet: PublicKey
}) => {
  const libs = await getLibs()

  const usdcUserBank = await libs.solanaWeb3Manager!.deriveUserBank({
    mint
  })
  const walletTokenAccount = getAssociatedTokenAddressSync(
    libs.solanaWeb3Manager!.mints[mint],
    wallet
  )
  const walletSolTokenAccount = getAssociatedTokenAddressSync(
    NATIVE_MINT,
    wallet
  )
  const tokenSymbol = mint.toUpperCase()

  // 1. Create a temporary token account on the wallet
  const createTemporaryTokenAccountInstruction =
    createAssociatedTokenAccountInstruction(
      feePayer, // fee payer
      walletTokenAccount, // account to create
      wallet, // owner
      libs.solanaWeb3Manager!.mints[mint] // mint
    )

  // 2-3. Transfer the tokens from the userbank to the wallet
  // Use ExactOut so we know how much of the token to swap for the outSolAmount
  const quoteRoute = await JupiterSingleton.getQuote({
    inputTokenSymbol: tokenSymbol,
    outputTokenSymbol: 'SOL',
    inputAmount: outSolAmount,
    slippage: USDC_SLIPPAGE,
    swapMode: 'ExactOut',
    onlyDirectRoutes: true
  })
  const usdcNeededAmount = quoteRoute.inputAmount.amount
  const transferToTemporaryTokenAccountInstructions =
    await libs.solanaWeb3Manager!.createTransferInstructionsFromCurrentUser({
      amount: new BN(usdcNeededAmount),
      feePayerKey: feePayer,
      senderSolanaAddress: usdcUserBank,
      recipientSolanaAddress: walletTokenAccount.toString(),
      instructionIndex: 1,
      mint
    })

  // 4. Create a temporary wSOL account on the wallet
  const createWSOLInstruction =
    createAssociatedTokenAccountIdempotentInstruction(
      feePayer, // fee payer
      walletSolTokenAccount, // account to create
      wallet, // owner
      NATIVE_MINT // mint
    )

  // 5. Swap the tokens for wSOL
  // Use ExactIn to ensure all the tokens get used in the swap
  const swapQuote = await JupiterSingleton.getQuote({
    inputTokenSymbol: tokenSymbol,
    outputTokenSymbol: 'SOL',
    inputAmount: usdcNeededAmount / 10 ** 6,
    slippage: USDC_SLIPPAGE,
    swapMode: 'ExactIn',
    onlyDirectRoutes: true
  })
  // Only get the swap instruction. Don't compute budget for consistent fees,
  // don't use setup/cleanup instructions and instead do those manually since the wallet has no SOL,
  // and we didn't include token ledger so ignore that as well.
  const {
    response: { swapInstruction },
    lookupTableAddresses
  } = await JupiterSingleton.getSwapInstructions({
    quote: swapQuote.quote,
    userPublicKey: wallet,
    destinationTokenAccount: walletSolTokenAccount
  })

  // 6. Convert wSOL to SOL by closing the wSOL token account and setting the destination wallet
  const closeWSOLInstruction = createCloseAccountInstruction(
    walletSolTokenAccount, //  account to close
    wallet, // fee destination
    wallet //  owner
  )

  // 7. Recreate the wSOL account using the wallet so we can return the rent to the feepayer
  const createWSOLInstructionAgain =
    createAssociatedTokenAccountIdempotentInstruction(
      wallet, // fee payer
      walletSolTokenAccount, // account to create
      wallet, // owner
      NATIVE_MINT // mint
    )

  // 8. Close the recreated wSOL account, setting the destination to the feepayer so it's refunded
  const closeWSOLInstructionAgain = createCloseAccountInstruction(
    walletSolTokenAccount, //  account to close
    feePayer, // fee destination
    wallet //  owner
  )

  // 9. Close the temporary token account on the wallet and return the rent to the feepayer
  const closeTemporaryTokenAccountInstruction = createCloseAccountInstruction(
    walletTokenAccount, //  account to close
    feePayer, // fee destination
    wallet //  owner
  )

  return {
    instructions: [
      createTemporaryTokenAccountInstruction,
      ...transferToTemporaryTokenAccountInstructions,
      createWSOLInstruction,
      parseInstruction(swapInstruction),
      closeWSOLInstruction,
      createWSOLInstructionAgain,
      closeWSOLInstructionAgain,
      closeTemporaryTokenAccountInstruction
    ],
    lookupTableAddresses
  }
}

export const createVersionedTransaction = async ({
  instructions,
  lookupTableAddresses,
  feePayer
}: {
  instructions: TransactionInstruction[]
  lookupTableAddresses: string[]
  feePayer: PublicKey
}) => {
  const lookupTableAccounts = await getLookupTableAccounts(
    audiusBackendInstance,
    { lookupTableAddresses }
  )
  const recentBlockhash = await getRecentBlockhash(audiusBackendInstance)

  const message = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash,
    instructions
  }).compileToV0Message(lookupTableAccounts)
  return {
    transaction: new VersionedTransaction(message),
    lookupTableAccounts
  }
}
