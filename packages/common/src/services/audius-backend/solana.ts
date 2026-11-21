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
import { getResponseErrorAnalyticsFields } from '~/utils/error'

import { AnalyticsEvent, Name } from '../../models'
import {
  convertJupiterInstructions,
  getJupiterQuoteByMintWithRetry,
  jupiterInstance
} from '../Jupiter'

import { AudiusBackend } from './AudiusBackend'

const SOL_MINT = 'So11111111111111111111111111111111111111112'
const USDC_DECIMALS = 6
const JUPITER_SWAP_LOOKUP_TABLE = new PublicKey(
  '2WB87JxGZieRd7hi3y87wq6HAsPLyb9zrSx8B5z1QEzM'
)
const SOL_DECIMALS = 9
const TOKEN_ACCOUNT_SIZE = 165
const ATA_TX_FEE_BUFFER_LAMPORTS = 10_000

const DEFAULT_RETRY_DELAY = 1000
const DEFAULT_MAX_RETRY_COUNT = 120
export const RECOVERY_MEMO_STRING = 'Recover Withdrawal'
export const WITHDRAWAL_MEMO_STRING = 'Withdrawal'
export const PREPARE_WITHDRAWAL_MEMO_STRING = 'Prepare Withdrawal'
export const INTERNAL_TRANSFER_MEMO_STRING = 'Internal Transfer'

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
    await sdk.services.solanaClient.getConnection(),
    tokenAccount,
    commitment
  )
}

export const createUserBankIfNeeded = async (
  sdk: AudiusSdkWithServices,
  {
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
      throw res
    }

    if (res.didExist) {
      console.debug('Userbank already exists')
    } else {
      console.info(`Userbank doesn't exist, attempted to create...`)
    }
    return res.userBank
  } catch (err: any) {
    const errorMessage = 'error' in err ? err.error : (err as any).toString()
    throw new Error(`Failed to create user bank: ${errorMessage}`)
  }
}

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
    await sdk.services.solanaClient.getConnection(),
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
      await sdk.services.solanaClient.getConnection(),
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
    await audiusBackendInstance.findAssociatedTokenAddress({
      solanaWalletKey: wallet.publicKey,
      mint: 'USDC'
    })

  const instructions = transaction.instructions.filter(
    (instruction) =>
      !instruction.programId.equals(ComputeBudgetProgram.programId)
  )

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

type RecoverUsdcFromRootWalletParams = {
  sdk: AudiusSdkWithServices
  sender: Keypair
  receiverEthWallet: string
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

  const rentExemptLamports =
    await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE)
  const totalSolNeededLamports = rentExemptLamports + ATA_TX_FEE_BUFFER_LAMPORTS
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

  const currentNonce = await sdk.services.claimableTokensClient.getNonce({
    ethWallet,
    mint
  })
  console.debug(
    `createUserFundedAta: current nonce=${currentNonce}, will use ${currentNonce} for prefund and ${currentNonce + BigInt(1)} for transfer`
  )

  const prefundInstructions = [
    createAssociatedTokenAccountIdempotentInstruction(
      feePayer,
      rootWalletUsdcAta,
      keypair.publicKey,
      mint
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      feePayer,
      rootWalletWsolAta,
      keypair.publicKey,
      solMint
    ),
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
    new TransactionInstruction({
      keys: [{ pubkey: rootWalletUsdcAta, isSigner: false, isWritable: true }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(INTERNAL_TRANSFER_MEMO_STRING)
    }),
    createAssociatedTokenAccountIdempotentInstruction(
      feePayer,
      feePayerWsolAta,
      feePayer,
      solMint
    ),
    ...convertJupiterInstructions([
      ...(swapInstructionsResult.setupInstructions ?? []),
      swapInstructionsResult.swapInstruction
    ]),
    createCloseAccountInstruction(
      rootWalletWsolAta,
      feePayer,
      keypair.publicKey
    ),
    createCloseAccountInstruction(feePayerWsolAta, feePayer, feePayer)
  ]

  const isDestinationRootAta = destination.equals(rootWalletUsdcAta)
  if (!isDestinationRootAta) {
    prefundInstructions.push(
      createCloseAccountInstruction(
        rootWalletUsdcAta,
        feePayer,
        keypair.publicKey
      ),
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

type TransferFromUserBankParams = {
  sdk: AudiusSdkWithServices
  mint: PublicKey
  connection: Connection
  amount: bigint
  ethWallet: string
  destinationWallet: PublicKey
  track: CommonStoreContext['analytics']['track']
  make: CommonStoreContext['analytics']['make']
  analyticsFields: any
  signer?: Keypair
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

    if (!isDestinationAlreadyAta) {
      destination = getAssociatedTokenAddressSync(mint, destinationWallet, true)
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
          transferAmount = amount - ataFeeAmount
          nonceOverride = nextNonce
        } else {
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
      ...(nonceOverride != null ? { computeLimit: { units: 400_000 } } : {})
    })

    if (signer) {
      transaction.sign([signer])
    }

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
      const responseErrorFields = await getResponseErrorAnalyticsFields(e)
      await track(
        make({
          eventName: Name.WITHDRAW_USDC_CREATE_DEST_TOKEN_ACCOUNT_FAILED,
          ...analyticsFields,
          error: e instanceof Error ? e.message : e,
          ...responseErrorFields
        })
      )
    }
    throw e
  }
}
