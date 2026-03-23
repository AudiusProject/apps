import type { AudiusSdkWithServices } from '@audius/sdk'
import { u8 } from '@solana/buffer-layout'
import {
  Account,
  TOKEN_PROGRAM_ID,
  TokenInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createTransferCheckedInstruction,
  decodeTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync
} from '@solana/spl-token'
import {
  Commitment,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js'

import { CommonStoreContext } from '~/store/storeContext'

import { AnalyticsEvent, Name } from '../../models'
import {
  convertJupiterInstructions,
  getJupiterQuoteByMintWithRetry,
  jupiterInstance
} from '../Jupiter'

import { AudiusBackend } from './AudiusBackend'

const SOL_MINT = 'So11111111111111111111111111111111111111112'
const USDC_DECIMALS = 6
/** Jupiter swap lookup table - needed for swap instruction account resolution */
const JUPITER_SWAP_LOOKUP_TABLE = new PublicKey(
  '2WB87JxGZieRd7hi3y87wq6HAsPLyb9zrSx8B5z1QEzM'
)
const SOL_DECIMALS = 9
// Token account size in bytes - used to compute rent exemption
const TOKEN_ACCOUNT_SIZE = 165
// Extra lamports for tx fees when pre-funding ATA creation
const ATA_TX_FEE_BUFFER_LAMPORTS = 10_000

const DEFAULT_RETRY_DELAY = 1000
const DEFAULT_MAX_RETRY_COUNT = 120
export const RECOVERY_MEMO_STRING = 'Recover Withdrawal'
export const WITHDRAWAL_MEMO_STRING = 'Withdrawal'
export const PREPARE_WITHDRAWAL_MEMO_STRING = 'Prepare Withdrawal'
export const INTERNAL_TRANSFER_MEMO_STRING = 'Internal Transfer'

/**
 * Memo program V1
 * https://github.com/solana-labs/solana-program-library/blob/7492e38b8577eef4defb5d02caadf82162887c68/memo/program/src/lib.rs#L16-L21
 */
export const MEMO_PROGRAM_ID = new PublicKey(
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo'
)

export type MintName = 'wAUDIO' | 'USDC'
export const DEFAULT_MINT: MintName = 'wAUDIO'

type UserBankConfig = {
  ethAddress: string
  mint?: MintName
}

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

export const isTransferCheckedInstruction = (
  instruction: TransactionInstruction
) => {
  return (
    instruction.programId.equals(TOKEN_PROGRAM_ID) &&
    instruction.data.length &&
    u8().decode(instruction.data) === TokenInstruction.TransferChecked
  )
}

type CreateUserBankIfNeededConfig = UserBankConfig & {
  recordAnalytics: (event: AnalyticsEvent, callback?: () => void) => void
}

type CreateUserBankIfNeededErrorResult = {
  error: string
  errorCode: string | number | null
}
type CreateUserBankIfNeededSuccessResult = {
  didExist: boolean
  userBank: PublicKey
}
type CreateUserBankIfNeededResult =
  | CreateUserBankIfNeededSuccessResult
  | CreateUserBankIfNeededErrorResult

function isCreateUserBankIfNeededError(
  res: CreateUserBankIfNeededResult
): res is CreateUserBankIfNeededErrorResult {
  return 'error' in res
}

/**
 * Returns the userbank account info for the given address and mint. If the
 * userbank does not exist, returns null.
 */
export const getUserbankAccountInfo = async (
  sdk: AudiusSdkWithServices,
  { ethAddress: sourceEthAddress, mint = DEFAULT_MINT }: UserBankConfig,
  commitment?: Commitment
): Promise<Account | null> => {
  const ethAddress = sourceEthAddress
  if (!ethAddress) {
    throw new Error(
      `getUserbankAccountInfo: unexpected error getting eth address`
    )
  }

  const tokenAccount = await sdk.services.claimableTokensClient.deriveUserBank({
    ethWallet: ethAddress,
    mint
  })

  return await getAccount(
    sdk.services.solanaClient.connection,
    tokenAccount,
    commitment
  )
}

/**
 * Attempts to create a userbank if one does not exist.
 * Defaults to AUDIO mint and the current user's wallet.
 */
export const createUserBankIfNeeded = async (
  sdk: AudiusSdkWithServices,
  {
    recordAnalytics,
    mint = DEFAULT_MINT,
    ethAddress: recipientEthAddress
  }: CreateUserBankIfNeededConfig
) => {
  try {
    const res: CreateUserBankIfNeededResult =
      await sdk.services.claimableTokensClient.getOrCreateUserBank({
        ethWallet: recipientEthAddress,
        mint
      })

    if (isCreateUserBankIfNeededError(res)) {
      // Will catch and log below
      throw res
    }

    // If it already existed, return early
    if (res.didExist) {
      console.debug('Userbank already exists')
    } else {
      // Otherwise we must have tried to create one
      console.info(`Userbank doesn't exist, attempted to create...`)

      recordAnalytics({
        eventName: Name.CREATE_USER_BANK_SUCCESS,
        properties: { mint, recipientEthAddress }
      })
    }
    return res.userBank
  } catch (err: any) {
    // Catching error here for analytics purposes
    const errorMessage = 'error' in err ? err.error : (err as any).toString()
    const errorCode = 'errorCode' in err ? err.errorCode : undefined
    recordAnalytics({
      eventName: Name.CREATE_USER_BANK_FAILURE,
      properties: {
        mint,
        recipientEthAddress,
        errorCode,
        errorMessage
      }
    })
    throw new Error(`Failed to create user bank: ${errorMessage}`)
  }
}

/**
 * Polls the given token account until its balance is different from initial balance or a timeoout.
 * @throws an error if the balance doesn't change within the timeout.
 */
export const pollForTokenBalanceChange = async (
  sdk: AudiusSdkWithServices,
  {
    tokenAccount,
    initialBalance,
    mint = DEFAULT_MINT,
    retryDelayMs = DEFAULT_RETRY_DELAY,
    maxRetryCount = DEFAULT_MAX_RETRY_COUNT,
    commitment = 'finalized'
  }: {
    tokenAccount: PublicKey
    initialBalance?: bigint
    mint?: MintName
    retryDelayMs?: number
    maxRetryCount?: number
    commitment?: Commitment
  }
) => {
  const debugTokenName = mint.toUpperCase()
  let retries = 0
  let tokenAccountInfo = await getAccount(
    sdk.services.solanaClient.connection,
    tokenAccount,
    commitment
  )
  while (
    (!tokenAccountInfo ||
      initialBalance === undefined ||
      tokenAccountInfo.amount === initialBalance) &&
    retries++ < maxRetryCount
  ) {
    if (!tokenAccountInfo) {
      console.debug(
        `${debugTokenName} account not found. Retrying... ${retries}/${maxRetryCount}`
      )
    } else if (initialBalance === undefined) {
      initialBalance = tokenAccountInfo.amount
    } else if (tokenAccountInfo.amount === initialBalance) {
      console.debug(
        `Polling ${debugTokenName} balance (${initialBalance} === ${tokenAccountInfo.amount}) [${retries}/${maxRetryCount}]`
      )
    }
    await delay(retryDelayMs)
    tokenAccountInfo = await getAccount(
      sdk.services.solanaClient.connection,
      tokenAccount,
      commitment
    )
  }
  if (
    tokenAccountInfo &&
    initialBalance !== undefined &&
    tokenAccountInfo.amount !== initialBalance
  ) {
    console.debug(
      `${debugTokenName} balance changed by ${
        tokenAccountInfo.amount - initialBalance
      } (${initialBalance} => ${tokenAccountInfo.amount})`
    )
    return tokenAccountInfo.amount
  }
  throw new Error(`${debugTokenName} balance polling exceeded maximum retries`)
}

export const findAssociatedTokenAddress = async (
  audiusBackendInstance: AudiusBackend,
  { solanaAddress, mint }: { solanaAddress: string; mint: MintName }
) => {
  return audiusBackendInstance.findAssociatedTokenAddress({
    solanaWalletKey: new PublicKey(solanaAddress),
    mint
  })
}

/** Converts a Coinflow transaction which transfers directly from root wallet USDC
 * account into a transaction that routes through the current user's USDC user bank, to
 * better facilitate indexing. The original transaction *must* use a TransferChecked instruction
 * and must have the current user's Solana root wallet USDC token account as the source.
 * @returns a new transaction that routes the USDC transfer through the user bank. This must be signed
 * by the current user's Solana root wallet and the provided fee payer (likely via relay).
 */
export const decorateCoinflowWithdrawalTransaction = async (
  sdk: AudiusSdkWithServices,
  audiusBackendInstance: AudiusBackend,
  {
    transaction,
    ethAddress,
    wallet
  }: {
    transaction: Transaction
    ethAddress: string
    wallet: Keypair
  }
) => {
  const userBank = await sdk.services.claimableTokensClient.deriveUserBank({
    ethWallet: ethAddress,
    mint: 'USDC'
  })
  const walletUSDCTokenAccount =
    audiusBackendInstance.findAssociatedTokenAddress({
      solanaWalletKey: wallet.publicKey,
      mint: 'USDC'
    })

  // Filter any compute budget instructions since the budget will
  // definitely change
  const instructions = transaction.instructions.filter(
    (instruction) =>
      !instruction.programId.equals(ComputeBudgetProgram.programId)
  )

  // Find original transfer instruction and index
  const transferInstructionIndex = instructions.findIndex(
    isTransferCheckedInstruction
  )
  const transferInstruction = instructions[transferInstructionIndex]
  if (!transferInstruction) {
    throw new Error('No transfer instruction found')
  }

  const { keys, data } = decodeTransferCheckedInstruction(
    transferInstruction,
    TOKEN_PROGRAM_ID
  )
  if (!walletUSDCTokenAccount.equals(keys.source.pubkey)) {
    throw new Error(
      `Original sender ${keys.source.pubkey} does not match wallet ${walletUSDCTokenAccount}`
    )
  }

  const transferToUserBankInstruction = createTransferCheckedInstruction(
    walletUSDCTokenAccount,
    keys.mint.pubkey,
    userBank,
    wallet.publicKey,
    data.amount,
    data.decimals
  )

  const transferFromUserBankInstructions = [
    await sdk.services.claimableTokensClient.createTransferSecpInstruction({
      mint: 'USDC',
      ethWallet: ethAddress,
      destination: keys.destination.pubkey,
      amount: data.amount,
      instructionIndex: transferInstructionIndex + 1
    }),
    await sdk.services.claimableTokensClient.createTransferInstruction({
      mint: 'USDC',
      ethWallet: ethAddress,
      destination: keys.destination.pubkey
    })
  ]

  const withdrawalMemoInstruction = new TransactionInstruction({
    keys: [
      {
        pubkey: wallet.publicKey,
        isSigner: true,
        isWritable: true
      }
    ],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(WITHDRAWAL_MEMO_STRING)
  })

  // Remove original transfer instruction and replace with our set of transfer steps
  instructions.splice(
    transferInstructionIndex,
    1,
    transferToUserBankInstruction,
    ...transferFromUserBankInstructions,
    withdrawalMemoInstruction
  )

  const tx = await sdk.services.solanaClient.buildTransaction({
    instructions
  })
  return tx
}

/**
 * In the case of a failed Coinflow withdrawal, transfers the USDC back out of
 * the root Solana account and into the user's user bank account.
 *
 * Note that this uses payment router to do the transfer, so that indexing sees
 * this transfer and handles it appropriately.
 */
type RecoverUsdcFromRootWalletParams = {
  sdk: AudiusSdkWithServices
  /** The root wallet key pair */
  sender: Keypair
  /** The ethereum wallet address of the user, used to derive user bank */
  receiverEthWallet: string
  /** The amount of USDC to recover */
  amount: bigint
}
export const recoverUsdcFromRootWallet = async ({
  sdk,
  sender,
  receiverEthWallet,
  amount
}: RecoverUsdcFromRootWalletParams) => {
  const { userBank } =
    await sdk.services.claimableTokensClient.getOrCreateUserBank({
      ethWallet: receiverEthWallet,
      mint: 'USDC'
    })

  // See: https://github.com/solana-labs/solana-program-library/blob/d6297495ea4dcc1bd48f3efdd6e3bbdaef25a495/memo/js/src/index.ts#L27
  const memoInstruction = new TransactionInstruction({
    keys: [
      {
        pubkey: sender.publicKey,
        isSigner: true,
        isWritable: true
      }
    ],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(RECOVERY_MEMO_STRING)
  })
  const transferInstruction =
    await sdk.services.paymentRouterClient.createTransferInstruction({
      total: amount,
      sourceWallet: sender.publicKey,
      mint: 'USDC'
    })
  const routeInstruction =
    await sdk.services.paymentRouterClient.createRouteInstruction({
      total: amount,
      splits: [
        {
          amount,
          wallet: userBank
        }
      ],
      mint: 'USDC'
    })
  const transaction = await sdk.services.solanaClient.buildTransaction({
    instructions: [memoInstruction, transferInstruction, routeInstruction]
  })
  transaction.sign([sender])
  const signature = await sdk.services.solanaClient.sendTransaction(
    transaction,
    { skipPreflight: true }
  )
  return signature
}

/**
 * Creates a destination ATA funded by the user's own USDC via relay:
 * TX1 (via relay): Create root USDC ATA, transfer fee USDC from user bank,
 * swap USDC->wSOL to fee payer's wSOL ATA, close wSOL (unwrap to fee payer),
 * create recipient USDC ATA (fee payer), close root USDC ATA (to fee payer).
 * TX2: transferFromUserBank sends the withdrawal amount to the recipient ATA.
 */
const createUserFundedAta = async ({
  sdk,
  connection,
  keypair,
  mint,
  ethWallet,
  destination,
  destinationWallet
}: {
  sdk: AudiusSdkWithServices
  connection: Connection
  keypair: Keypair
  mint: PublicKey
  ethWallet: string
  destination: PublicKey
  destinationWallet: PublicKey
}): Promise<{ feeAmountUsdc: bigint; nextNonce: bigint }> => {
  const feePayer = await sdk.services.solanaRelay.getFeePayer()
  const solMint = new PublicKey(SOL_MINT)

  // Calculate the amount of USDC needed to create the destination ATA.
  // Use ExactIn: we swap a fixed USDC amount for lamports. Swap consumes all input, no dust.
  const rentExemptLamports =
    await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE)
  const totalSolNeededLamports = rentExemptLamports + ATA_TX_FEE_BUFFER_LAMPORTS
  // Get fee estimate from ExactOut (how much USDC for lamports), then add 2% buffer
  const { quoteResult: exactOutQuote } = await getJupiterQuoteByMintWithRetry({
    inputMint: mint.toBase58(),
    outputMint: SOL_MINT,
    inputDecimals: USDC_DECIMALS,
    outputDecimals: SOL_DECIMALS,
    amountUi: totalSolNeededLamports / 10 ** SOL_DECIMALS,
    swapMode: 'ExactOut',
    onlyDirectRoutes: true
  })
  const estimatedFeeUsdc = BigInt(exactOutQuote.inputAmount.amountString)
  // Add 2% buffer so ExactIn yields enough lamports; use this for the swap
  const feeAmountUsdc =
    estimatedFeeUsdc + (estimatedFeeUsdc * BigInt(2)) / BigInt(100)

  const { quoteResult: exactInQuote } = await getJupiterQuoteByMintWithRetry({
    inputMint: mint.toBase58(),
    outputMint: SOL_MINT,
    inputDecimals: USDC_DECIMALS,
    outputDecimals: SOL_DECIMALS,
    amountUi: Number(feeAmountUsdc) / 10 ** USDC_DECIMALS,
    swapMode: 'ExactIn',
    onlyDirectRoutes: true,
    // Use a generous slippage for this small ATA-funding swap. The amount is
    // tiny (~$0.01 of USDC→SOL) so 500bps (5%) is acceptable and avoids
    // SlippageToleranceExceeded failures from stale quotes.
    slippageBps: 500
  })

  const rootWalletUsdcAta = getAssociatedTokenAddressSync(
    mint,
    keypair.publicKey,
    true
  )
  const rootWalletWsolAta = getAssociatedTokenAddressSync(
    solMint,
    keypair.publicKey,
    true
  )
  const feePayerWsolAta = getAssociatedTokenAddressSync(solMint, feePayer, true)

  console.debug(
    `createUserFundedAta: ExactIn swap ${feeAmountUsdc} USDC for ~${exactInQuote.outputAmount.amountString} lamports`
  )
  const swapInstructionsResult = await jupiterInstance.swapInstructionsPost({
    swapRequest: {
      quoteResponse: exactInQuote.quote,
      userPublicKey: keypair.publicKey.toBase58(),
      payer: feePayer.toBase58(),
      destinationTokenAccount: feePayerWsolAta.toBase58(),
      wrapAndUnwrapSol: false,
      dynamicSlippage: true
    }
  })

  // Read the nonce once and pass it explicitly to both the prefund TX (nonce N)
  // and the subsequent transfer TX (nonce N+1). This avoids stale RPC reads
  // between the two transactions that could return the same nonce value.
  const currentNonce = await sdk.services.claimableTokensClient.getNonce({
    ethWallet,
    mint
  })
  console.debug(
    `createUserFundedAta: current nonce=${currentNonce}, will use ${currentNonce} for prefund and ${currentNonce + BigInt(1)} for transfer`
  )

  // Combine all instructions into a single transaction
  const prefundInstructions = [
    // Create root USDC ATA (fee payer)
    createAssociatedTokenAccountIdempotentInstruction(
      feePayer,
      rootWalletUsdcAta,
      keypair.publicKey,
      mint
    ),
    // Create wSOL ATA on fee payer
    createAssociatedTokenAccountIdempotentInstruction(
      feePayer,
      rootWalletWsolAta,
      keypair.publicKey,
      solMint
    ),
    // Claimable transfer (fee USDC from user bank → root ATA)
    // Pass the nonce explicitly so both this TX and the subsequent transfer TX
    // use deterministic nonce values (currentNonce here, currentNonce+1 there).
    await sdk.services.claimableTokensClient.createTransferSecpInstruction({
      amount: feeAmountUsdc,
      ethWallet,
      mint,
      destination: rootWalletUsdcAta,
      instructionIndex: 2,
      nonce: currentNonce
    }),
    await sdk.services.claimableTokensClient.createTransferInstruction({
      ethWallet,
      mint,
      destination: rootWalletUsdcAta
    }),
    // Memo (INTERNAL_TRANSFER)
    new TransactionInstruction({
      keys: [{ pubkey: rootWalletUsdcAta, isSigner: false, isWritable: true }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(INTERNAL_TRANSFER_MEMO_STRING)
    }),
    // Create wSOL ATA on fee payer
    createAssociatedTokenAccountIdempotentInstruction(
      feePayer,
      feePayerWsolAta,
      feePayer,
      solMint
    ),
    // Jupiter swap (USDC → wSOL)
    ...convertJupiterInstructions([
      ...(swapInstructionsResult.setupInstructions ?? []),
      swapInstructionsResult.swapInstruction
    ]),
    // Close root wallet wSOL ATA
    createCloseAccountInstruction(
      rootWalletWsolAta,
      feePayer,
      keypair.publicKey
    ),
    // Close fee payer wSOL ATA (unwrap to fee payer)
    createCloseAccountInstruction(feePayerWsolAta, feePayer, feePayer)
  ]

  // When the destination IS the root wallet's own USDC ATA (e.g. Coinflow
  // withdraw-to-bank), keep it open — Coinflow needs it for the withdrawal.
  // Otherwise close it and create the separate destination ATA.
  const isDestinationRootAta = destination.equals(rootWalletUsdcAta)
  if (!isDestinationRootAta) {
    prefundInstructions.push(
      // Close root wallet USDC ATA (reclaim rent to fee payer)
      createCloseAccountInstruction(
        rootWalletUsdcAta,
        feePayer,
        keypair.publicKey
      ),
      // Create recipient USDC ATA (fee payer)
      createAssociatedTokenAccountIdempotentInstruction(
        feePayer,
        destination,
        destinationWallet,
        mint
      )
    )
  }

  const prefundTx = await sdk.services.solanaClient.buildTransaction({
    feePayer,
    instructions: prefundInstructions,
    addressLookupTables: [
      ...swapInstructionsResult.addressLookupTableAddresses.map(
        (addr: string) => new PublicKey(addr)
      ),
      JUPITER_SWAP_LOOKUP_TABLE
    ],
    priorityFee: null,
    computeLimit: null
  })
  prefundTx.sign([keypair])
  const signature =
    await sdk.services.claimableTokensClient.sendTransaction(prefundTx)
  await connection.confirmTransaction(signature, 'confirmed')
  console.debug(
    `createUserFundedAta: prefund + ATA creation confirmed: ${signature}`
  )
  return { feeAmountUsdc, nextNonce: currentNonce + BigInt(1) }
}

/**
 * Transfers tokens out of a user bank.
 * Notes:
 * - Including a signer will mark this transfer as a "withdrawal preparation"
 *   by signing a memo indicating such. This prevents the transfer from showing
 *   as a withdrawal on the withdrawal history page.
 * - If keypair is provided and the destination token account doesn't exist, the
 *   user pays a USDC fee (swapped to SOL) to fund creation of the destination ATA,
 *   bypassing the relay rate limit. Otherwise falls back to relay-funded creation.
 */
type TransferFromUserBankParams = {
  sdk: AudiusSdkWithServices
  /** The token mint address */
  mint: PublicKey
  connection: Connection
  /** Amount, in wei token amounts (eg 10^6 for USDC) */
  amount: bigint
  /** The eth address of the sender (for deriving user bank) */
  ethWallet: string
  /** The destination wallet (not token account but Solana wallet) */
  destinationWallet: PublicKey
  track: CommonStoreContext['analytics']['track']
  make: CommonStoreContext['analytics']['make']
  /** Any extra data to include for analytics */
  analyticsFields: any
  /** If included, will attach a signed memo indicating a recovery transaction.  */
  signer?: Keypair
  /**
   * The user's root Solana keypair. When provided and the destination ATA is
   * missing, the user pays a small USDC fee (swapped to SOL via Jupiter) to
   * fund ATA creation themselves, avoiding the relay's daily rate limit.
   */
  keypair?: Keypair
}

export const transferFromUserBank = async ({
  sdk,
  mint,
  connection,
  amount,
  ethWallet,
  destinationWallet,
  track,
  make,
  analyticsFields,
  signer,
  keypair
}: TransferFromUserBankParams) => {
  let isCreatingTokenAccount = false
  let transferAmount = amount
  let nonceOverride: bigint | undefined
  try {
    const instructions: TransactionInstruction[] = []

    // Check if destinationWallet is already an associated token account
    let destination = destinationWallet
    let isDestinationAlreadyAta = false

    try {
      const account = await getAccount(connection, destinationWallet)
      if (account.mint.equals(mint)) {
        isDestinationAlreadyAta = true
        console.debug(
          `Destination ${destinationWallet.toBase58()} is already a token account for the correct mint`
        )
      } else {
        throw new Error(
          `Destination ${destinationWallet.toBase58()} is a token account but for mint ${account.mint.toBase58()}, expected ${mint.toBase58()}`
        )
      }
    } catch (e) {
      if (
        e instanceof Error &&
        e.message.includes('is a token account but for mint')
      ) {
        throw e
      }
    }

    // If destinationWallet is not already an ATA, derive the ATA and create it if needed
    if (!isDestinationAlreadyAta) {
      destination = getAssociatedTokenAddressSync(mint, destinationWallet, true)
      // Check if the ATA already exists and has a non-zero balance; if so, skip creating it
      let shouldCreateAta = true
      try {
        const info = await connection.getAccountInfo(destination)
        if (info) {
          shouldCreateAta = false
          console.debug(`Destination ATA ${destination.toBase58()} exists`)
        }
      } catch (e) {
        // Account doesn't exist yet – we'll proceed to create it below
      }

      if (shouldCreateAta) {
        isCreatingTokenAccount = true
        console.debug(
          `Ensuring associated token account ${destination.toBase58()} exists...`
        )

        await track(
          make({
            eventName: Name.WITHDRAW_USDC_CREATE_DEST_TOKEN_ACCOUNT_START,
            ...analyticsFields
          })
        )

        if (keypair) {
          // User-funded ATA creation: swap a USDC fee to SOL, then create the
          // destination ATA directly from the root wallet — the relay never sees
          // an unmatched create instruction, so its rate limit is not involved.
          // Fee is deducted from the transfer amount; recipient gets amount - fee.
          const { feeAmountUsdc: ataFeeAmount, nextNonce } =
            await createUserFundedAta({
              sdk,
              connection,
              keypair,
              mint,
              ethWallet,
              destination,
              destinationWallet
            })
          // Reduce transfer amount by fee so total debit equals original amount
          transferAmount = amount - ataFeeAmount
          // Pass the known next nonce to avoid stale RPC reads after the prefund TX
          nonceOverride = nextNonce
        } else {
          // Fallback: relay-funded ATA creation (subject to daily rate limit)
          const payerKey = await sdk.services.solanaRelay.getFeePayer()
          instructions.push(
            createAssociatedTokenAccountIdempotentInstruction(
              payerKey,
              destination,
              destinationWallet,
              mint
            )
          )
        }
      }
    }

    const secpTransferInstruction =
      await sdk.services.claimableTokensClient.createTransferSecpInstruction({
        amount: transferAmount,
        ethWallet,
        mint,
        destination,
        instructionIndex: instructions.length,
        ...(nonceOverride != null ? { nonce: nonceOverride } : {})
      })
    instructions.push(secpTransferInstruction)

    const transferInstruction =
      await sdk.services.claimableTokensClient.createTransferInstruction({
        ethWallet,
        mint,
        destination
      })
    instructions.push(transferInstruction)

    if (signer) {
      const memoInstruction = new TransactionInstruction({
        keys: [
          {
            pubkey: signer.publicKey,
            isSigner: true,
            isWritable: true
          }
        ],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(PREPARE_WITHDRAWAL_MEMO_STRING)
      })
      instructions.push(memoInstruction)
    }

    const transaction = await sdk.services.solanaClient.buildTransaction({
      instructions,
      // When the nonce was overridden, the local RPC may also have stale state,
      // causing the compute-unit simulation inside buildTransaction to fail.
      // Use a fixed compute limit to skip the simulation in that case.
      ...(nonceOverride != null ? { computeLimit: { units: 400_000 } } : {})
    })

    if (signer) {
      transaction.sign([signer])
    }

    // When the nonce was set explicitly (self-funded ATA path), the relay's
    // RPC node may not yet reflect the nonce increment from the prefund TX.
    // Skip preflight simulation on the relay to avoid a stale-nonce rejection.
    const signature = await sdk.services.claimableTokensClient.sendTransaction(
      transaction,
      nonceOverride != null ? { skipPreflight: true } : undefined
    )

    if (isCreatingTokenAccount) {
      await track(
        make({
          eventName: Name.WITHDRAW_USDC_CREATE_DEST_TOKEN_ACCOUNT_SUCCESS,
          ...analyticsFields
        })
      )
    }

    return signature
  } catch (e) {
    if (isCreatingTokenAccount) {
      await track(
        make({
          eventName: Name.WITHDRAW_USDC_CREATE_DEST_TOKEN_ACCOUNT_FAILED,
          ...analyticsFields,
          error: e instanceof Error ? e.message : e
        })
      )
    }
    throw e
  }
}
