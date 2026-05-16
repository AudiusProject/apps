import { Query, QueryKey } from '@tanstack/react-query'

export const MAX_RETRIES = 3
export const HTTP_STATUSES_TO_NOT_RETRY = [400, 401, 403, 404]

export const defaultRetryConfig = (failureCount: number, error: any) => {
  if (failureCount > MAX_RETRIES) {
    return false
  }

  if (
    error?.response?.status &&
    HTTP_STATUSES_TO_NOT_RETRY.includes(error?.response?.status)
  ) {
    return false
  }

  return true
}

export const queryErrorHandler = (
  err: unknown,
  query: Query<unknown, unknown, unknown, QueryKey>
) => {
  const error = err instanceof Error ? err : new Error(String(err))
  console.error(`Query Error: ${query.queryKey[0] as string}`, error, {
    queryKey: query.queryKey,
    isActive: query.isActive,
    isStale: query.isStale,
    isDisabled: query.isDisabled
  })
}
