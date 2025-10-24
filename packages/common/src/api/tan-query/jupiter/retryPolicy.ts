export interface RetryResult<T> {
  success: boolean
  result?: T
  error?: Error
  attemptsMade: number
  totalTimeMs: number
}

export class RetryPolicy {
  public config = {
    maxRetries: 3,
    delayMs: 2000
  }

  constructor(maxRetries = 3) {
    this.config.maxRetries = maxRetries
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    onRetry?: (attemptNumber: number) => void | Promise<void>
  ): Promise<RetryResult<T>> {
    const startTime = Date.now()
    let attemptNumber = 0
    let lastError: Error | undefined

    while (attemptNumber <= this.config.maxRetries) {
      try {
        const result = await operation()
        return {
          success: true,
          result,
          attemptsMade: attemptNumber + 1,
          totalTimeMs: Date.now() - startTime
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        attemptNumber++

        // Don't retry on the last attempt
        if (attemptNumber > this.config.maxRetries) {
          break
        }

        // Notify about retry attempt
        if (onRetry) {
          await onRetry(attemptNumber)
        }

        // Wait 2 seconds before retrying
        await this.delay(this.config.delayMs)
      }
    }

    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attemptsMade: attemptNumber,
      totalTimeMs: Date.now() - startTime
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Standard retry policy
export const STANDARD_RETRY_POLICY = new RetryPolicy(3)
