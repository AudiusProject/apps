// TEMPORARY PORT OF TANSTACK QUERY TYPES
// To avoid dependency issues with newer versions of tanstack query
// Remove when we can upgrade Tanstack Query without breaking the production static builds

import type { DefaultError, WithRequired } from '@tanstack/query-core'
import type { UseMutationOptions } from '@tanstack/react-query'

export function mutationOptions<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TOnMutateResult = unknown
>(
  options: WithRequired<
    UseMutationOptions<TData, TError, TVariables, TOnMutateResult>,
    'mutationKey'
  >
): WithRequired<
  UseMutationOptions<TData, TError, TVariables, TOnMutateResult>,
  'mutationKey'
>
export function mutationOptions<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TOnMutateResult = unknown
>(
  options: Omit<
    UseMutationOptions<TData, TError, TVariables, TOnMutateResult>,
    'mutationKey'
  >
): Omit<
  UseMutationOptions<TData, TError, TVariables, TOnMutateResult>,
  'mutationKey'
>
export function mutationOptions<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TOnMutateResult = unknown
>(
  options: UseMutationOptions<TData, TError, TVariables, TOnMutateResult>
): UseMutationOptions<TData, TError, TVariables, TOnMutateResult> {
  return options
}
