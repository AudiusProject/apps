import {
  UseQueryResult,
  QueryObserverResult,
  QueryObserverSuccessResult,
  QueryObserverRefetchErrorResult
} from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'

import { combineQueryResults } from '../combineQueryResults'

describe('combineQueryResults', () => {
  const createSuccessResult = (): QueryObserverSuccessResult<any, Error> => ({
    data: undefined,
    error: null,
    isError: false,
    isFetching: false,
    isLoading: false,
    isPending: false,
    isSuccess: true,
    status: 'success',
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    fetchStatus: 'idle',
    isLoadingError: false,
    isPaused: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isFetched: true,
    isFetchedAfterMount: true,
    isPlaceholderData: false,
    isInitialLoading: false,
    refetch: async () => ({}) as QueryObserverResult<any, Error>,
    promise: Promise.resolve()
  })

  const createMockQuery = (
    overrides: Partial<UseQueryResult<any, Error>> = {}
  ): UseQueryResult<any, Error> => {
    const baseQuery = createSuccessResult()
    const result = { ...baseQuery, ...overrides }

    if (result.isError) {
      return result as QueryObserverRefetchErrorResult<any, Error>
    }
    return result as QueryObserverSuccessResult<any, Error>
  }

  it('should combine successful queries', () => {
    const queries = [
      createMockQuery({ data: { id: 1 }, dataUpdatedAt: 100 }),
      createMockQuery({ data: { id: 2 }, dataUpdatedAt: 200 })
    ]

    const result = combineQueryResults(queries)

    expect(result.isSuccess).toBe(true)
    expect(result.data).toEqual([{ id: 1 }, { id: 2 }])
    expect(result.dataUpdatedAt).toBe(200)
    expect(result.status).toBe('success')
  })

  it('should handle pending queries', () => {
    const queries = [
      createMockQuery({ isPending: true, isSuccess: false, status: 'pending' }),
      createMockQuery({ data: { id: 2 } })
    ]

    const result = combineQueryResults(queries)

    expect(result.isPending).toBe(true)
    expect(result.isSuccess).toBe(false)
    expect(result.data).toBeUndefined()
    expect(result.status).toBe('pending')
  })

  it('should handle error states', () => {
    const error = new Error('Test error')
    const queries = [
      createMockQuery({
        isError: true,
        error,
        status: 'error',
        isSuccess: false,
        errorUpdatedAt: 300
      }),
      createMockQuery({ data: { id: 2 } })
    ]

    const result = combineQueryResults(queries)

    expect(result.isError).toBe(true)
    expect(result.error).toBe(error)
    expect(result.status).toBe('error')
    expect(result.errorUpdatedAt).toBe(300)
  })

  it('should combine fetching states', () => {
    const queries = [
      createMockQuery({ isFetching: true, fetchStatus: 'fetching' }),
      createMockQuery({ data: { id: 2 } })
    ]

    const result = combineQueryResults(queries)

    expect(result.isFetching).toBe(true)
    expect(result.fetchStatus).toBe('fetching')
  })

  it('should handle loading states', () => {
    const queries = [
      createMockQuery({ isLoading: true }),
      createMockQuery({ data: { id: 2 } })
    ]

    const result = combineQueryResults(queries)

    expect(result.isLoading).toBe(true)
  })

  it('should combine failure counts', () => {
    const queries = [
      createMockQuery({ failureCount: 2 }),
      createMockQuery({ failureCount: 3 })
    ]

    const result = combineQueryResults(queries)

    expect(result.failureCount).toBe(5)
  })

  it('should handle placeholder data state', () => {
    const queries = [
      createMockQuery({ isPlaceholderData: true }),
      createMockQuery({ data: { id: 2 } })
    ]

    const result = combineQueryResults(queries)

    expect(result.isPlaceholderData).toBe(true)
  })

  it('should combine isFetched states correctly', () => {
    const queries = [
      createMockQuery({ isFetched: true }),
      createMockQuery({ isFetched: false })
    ]

    const result = combineQueryResults(queries)

    expect(result.isFetched).toBe(false)
  })

  it('should handle refetch function', async () => {
    const createMockRefetchResult = (
      id: number
    ): QueryObserverSuccessResult<any, Error> => ({
      ...createSuccessResult(),
      data: { id }
    })

    const mockRefetch1 = async () => createMockRefetchResult(1)
    const mockRefetch2 = async () => createMockRefetchResult(2)

    const queries = [
      createMockQuery({ refetch: mockRefetch1 }),
      createMockQuery({ refetch: mockRefetch2 })
    ]

    const result = combineQueryResults(queries)
    const refetchResult = await result.refetch()

    expect(refetchResult).toBeDefined()
    expect(refetchResult.data).toBeUndefined()
  })
})
