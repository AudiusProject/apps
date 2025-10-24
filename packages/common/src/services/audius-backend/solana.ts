import { AudiusSdk } from '@audius/sdk'
import { u8 } from '@solana/buffer-layout'
import {
  Account,
  TOKEN_PROGRAM_ID,
  TokenInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
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

import { AudiusBackend } from './AudiusBackend'

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
  sdk: AudiusSdk,
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
  sdk: AudiusSdk,
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
  sdk: AudiusSdk,
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
  sdk: AudiusSdk,
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
  sdk: AudiusSdk
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
 * Transfers tokens out of a user bank.
 * Notes:
 * - Including a signer will mark this transfer as a "withdrawal preparation"
 *   by signing a memo indicating such. This prevents the transfer from showing
 *   as a withdrawal on the withdrawal history page.
 * - Users have restrictions on creating token accounts via relay, so if the
 *   destination token account doesn't exist this might fail.
 */
type TransferFromUserBankParams = {
  sdk: AudiusSdk
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
  signer
}: TransferFromUserBankParams) => {
  let isCreatingTokenAccount = false
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

        // Historically, the token account was created in a separate transaction
        // after swapping USDC to SOL via Jupiter and funded via the root wallet.
        // This is no longer the case. Reusing the same Amplitude events anyway.
        await track(
          make({
            eventName: Name.WITHDRAW_USDC_CREATE_DEST_TOKEN_ACCOUNT_START,
            ...analyticsFields
          })
        )
        const payerKey = await sdk.services.solanaRelay.getFeePayer()
        const createAtaInstruction =
          createAssociatedTokenAccountIdempotentInstruction(
            payerKey,
            destination,
            destinationWallet,
            mint
          )
        instructions.push(createAtaInstruction)
      }
    }

    const secpTransferInstruction =
      await sdk.services.claimableTokensClient.createTransferSecpInstruction({
        amount,
        ethWallet,
        mint,
        destination,
        instructionIndex: instructions.length
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
      instructions
    })

    if (signer) {
      transaction.sign([signer])
    }

    const signature =
      await sdk.services.claimableTokensClient.sendTransaction(transaction)

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
