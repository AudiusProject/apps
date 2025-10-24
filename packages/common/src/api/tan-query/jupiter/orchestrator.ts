import { CoinInfo } from '~/store/ui/buy-sell/types'

import {
  BaseSwapExecutor,
  DirectSwapExecutor,
  IndirectSwapExecutor,
  SwapExecutionResult
} from './executors'
import { RetryPolicy, RetryResult, STANDARD_RETRY_POLICY } from './retryPolicy'
import {
  SwapDependencies,
  SwapTokensParams,
  SwapTokensResult,
  SwapStatus,
  SwapErrorType
} from './types'
import { invalidateSwapQueries } from './utils'

export interface SwapExecutionContext {
  params: SwapTokensParams
  dependencies: SwapDependencies
  tokens: Record<string, CoinInfo>
  attemptNumber: number
  isRetrying: boolean
}

export interface SwapOrchestratorConfig {
  retryPolicy?: RetryPolicy
  enableQueryInvalidation?: boolean
  onRetryAttempt?: (
    context: SwapExecutionContext,
    attemptNumber: number
  ) => void | Promise<void>
  onExecutionStart?: (context: SwapExecutionContext) => void | Promise<void>
  onExecutionComplete?: (
    context: SwapExecutionContext,
    result: SwapTokensResult
  ) => void | Promise<void>
}

export class SwapOrchestrator {
  private retryPolicy: RetryPolicy
  private config: SwapOrchestratorConfig

  constructor(config: SwapOrchestratorConfig = {}) {
    this.retryPolicy = config.retryPolicy || STANDARD_RETRY_POLICY
    this.config = {
      enableQueryInvalidation: true,
      ...config
    }
  }

  async executeSwap(
    params: SwapTokensParams,
    dependencies: SwapDependencies,
    tokens: Record<string, CoinInfo>
  ): Promise<SwapTokensResult> {
    const context: SwapExecutionContext = {
      params,
      dependencies,
      tokens,
      attemptNumber: 0,
      isRetrying: false
    }

    // Notify execution start
    if (this.config.onExecutionStart) {
      await this.config.onExecutionStart(context)
    }

    // Determine swap type and create appropriate executor
    const executor = this.createExecutor(params, dependencies, tokens)
    const swapType = this.determineSwapType(params, dependencies, tokens)

    let result: SwapTokensResult

    if (swapType === 'INDIRECT') {
      // IndirectSwapExecutor handles its own retries at the step level
      const executionResult = await executor.execute(params)
      result = this.convertExecutionResultToSwapResult(executionResult)
    } else {
      // DirectSwapExecutor uses orchestrator-level retry logic
      const retryResult = await this.retryPolicy.executeWithRetry(
        async () => {
          context.attemptNumber++
          context.isRetrying = context.attemptNumber > 1

          // Invalidate queries before retry (except on first attempt)
          if (context.isRetrying && this.config.enableQueryInvalidation) {
            await invalidateSwapQueries(
              dependencies.queryClient,
              dependencies.user
            )
          }

          const executionResult = await executor.execute(params)

          if (executionResult.status === SwapStatus.ERROR) {
            throw new Error(
              executionResult.error?.message || 'Swap execution failed'
            )
          }

          return executionResult
        },
        async (attemptNumber: number) => {
          if (this.config.onRetryAttempt) {
            await this.config.onRetryAttempt(context, attemptNumber)
          }
        }
      )

      // Convert retry result to SwapTokensResult
      result = this.convertToSwapResult(retryResult, context)
    }

    // Invalidate queries on success
    if (
      result.status === SwapStatus.SUCCESS &&
      this.config.enableQueryInvalidation
    ) {
      await invalidateSwapQueries(dependencies.queryClient, dependencies.user)
    }

    // Notify execution complete
    if (this.config.onExecutionComplete) {
      await this.config.onExecutionComplete(context, result)
    }

    return result
  }

  private createExecutor(
    params: SwapTokensParams,
    dependencies: SwapDependencies,
    tokens: Record<string, CoinInfo>
  ): BaseSwapExecutor {
    const swapType = this.determineSwapType(params, dependencies, tokens)

    switch (swapType) {
      case 'DIRECT':
        return new DirectSwapExecutor(dependencies, tokens)
      case 'INDIRECT':
        return new IndirectSwapExecutor(dependencies, tokens)
      default:
        throw new Error(`Unknown swap type: ${swapType}`)
    }
  }

  private determineSwapType(
    params: SwapTokensParams,
    dependencies: SwapDependencies,
    _tokens: Record<string, CoinInfo>
  ): 'DIRECT' | 'INDIRECT' {
    const { inputMint, outputMint } = params

    // Use the same logic as main branch: if either token is AUDIO, use direct swap
    // Otherwise use indirect swap via AUDIO
    const isAudioPairedSwap =
      inputMint === dependencies.audioMint ||
      outputMint === dependencies.audioMint

    return isAudioPairedSwap ? 'DIRECT' : 'INDIRECT'
  }

  private convertExecutionResultToSwapResult(
    executionResult: SwapExecutionResult
  ): SwapTokensResult {
    if (executionResult.status === SwapStatus.SUCCESS) {
      return {
        status: SwapStatus.SUCCESS,
        signature: executionResult.signature,
        inputAmount: executionResult.inputAmount,
        outputAmount: executionResult.outputAmount,
        retryCount: 0,
        maxRetries: this.retryPolicy.config.maxRetries,
        isRetrying: false
      }
    }

    return {
      status: SwapStatus.ERROR,
      errorStage: executionResult.errorStage || 'INDIRECT_SWAP_FAILED',
      error: executionResult.error,
      inputAmount: executionResult.inputAmount,
      outputAmount: executionResult.outputAmount,
      retryCount: 0,
      maxRetries: this.retryPolicy.config.maxRetries,
      isRetrying: false
    }
  }

  private convertToSwapResult(
    retryResult: RetryResult<SwapExecutionResult>,
    _context: SwapExecutionContext
  ): SwapTokensResult {
    if (retryResult.success && retryResult.result) {
      return {
        status: SwapStatus.SUCCESS,
        signature: retryResult.result.signature,
        inputAmount: retryResult.result.inputAmount,
        outputAmount: retryResult.result.outputAmount,
        retryCount: retryResult.attemptsMade,
        maxRetries: this.retryPolicy.config.maxRetries,
        isRetrying: false
      }
    }

    return {
      status: SwapStatus.ERROR,
      errorStage: 'SWAP_RETRY_EXHAUSTED',
      error: {
        type: SwapErrorType.UNKNOWN,
        message: `Swap failed after ${retryResult.attemptsMade} attempts: ${retryResult.error?.message || 'Unknown error'}`
      },
      inputAmount: undefined,
      outputAmount: undefined,
      retryCount: retryResult.attemptsMade,
      maxRetries: this.retryPolicy.config.maxRetries,
      isRetrying: false
    }
  }
}
