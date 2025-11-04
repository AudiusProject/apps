import type { AudiusSdk } from '@audius/sdk'
import { PublicKey } from '@solana/web3.js'
import type { Keypair } from '@solana/web3.js'
import { useQueryClient } from '@tanstack/react-query'

import type { User } from '~/models/User'

// SDK TokenName enum values that are accepted by the SDK
type TokenName = 'wAUDIO' | 'USDC'

export enum SwapStatus {
  IDLE = 'IDLE',
  GETTING_QUOTE = 'GETTING_QUOTE',
  BUILDING_TRANSACTION = 'BUILDING_TRANSACTION',
  SENDING_TRANSACTION = 'SENDING_TRANSACTION',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export enum SwapErrorType {
  WALLET_ERROR = 'WALLET_ERROR',
  QUOTE_FAILED = 'QUOTE_FAILED',
  BUILD_FAILED = 'BUILD_FAILED',
  RELAY_FAILED = 'RELAY_FAILED',
  SIMULATION_FAILED = 'SIMULATION_FAILED',
  UNKNOWN = 'UNKNOWN'
}

export type SwapTokensParams = {
  inputMint: string
  outputMint: string
  inputDecimals: number
  outputDecimals: number
  amountUi: number
  slippageBps?: number
  wrapUnwrapSol?: boolean
}

export type DoubleSwapParams = {
  inputMint: string
  outputMint: string
  amountUi: number
  slippageBps?: number
  wrapUnwrapSol?: boolean
}

export type SwapTokensResult = {
  status: SwapStatus
  signature?: string
  firstTransactionSignature?: string
  errorStage?: string
  error?: {
    type: SwapErrorType
    message: string
    userCancelled?: boolean // applicable to external wallet swaps - the user can cancel the signing
  }
  inputAmount?: {
    amount: number
    uiAmount: number
  }
  outputAmount?: {
    amount: number
    uiAmount: number
  }
  retryCount?: number
  isRetrying?: boolean
  maxRetries?: number
}

export type ClaimableTokenMint = TokenName | PublicKey

export interface UserBankManagedTokenInfo {
  mintAddress: string
  claimableTokenMint: ClaimableTokenMint
  decimals: number
}

export type SwapDependencies = {
  sdk: AudiusSdk
  keypair: Keypair
  userPublicKey: PublicKey
  feePayer: PublicKey
  ethAddress: string
  queryClient: ReturnType<typeof useQueryClient>
  user: User
  audioMint: string
}
