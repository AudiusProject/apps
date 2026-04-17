import { UserCoinWithAccounts } from '@audius/sdk'
import { QueryClient } from '@tanstack/react-query'

import { type UserCoin } from '~/adapters/coin'
import { ID } from '~/models'

import { getUserCoinQueryKey } from './userCoinQueryKey'

/**
 * Primes per-mint `useUserCoin` cache from `getUserCoins` list rows.
 * List items omit `accounts`; callers that need accounts still refetch via `useUserCoin`.
 */
export const primeUserCoinQueriesFromList = (
  queryClient: QueryClient,
  userId: ID,
  coins: UserCoin[]
) => {
  for (const coin of coins) {
    const { mint, ticker, decimals, balance, balanceUsd, logoUri } = coin
    const partial: UserCoinWithAccounts = {
      mint,
      ticker,
      decimals,
      logoUri,
      balance,
      balanceUsd,
      accounts: []
    }
    const key = getUserCoinQueryKey(mint, userId)
    if (!queryClient.getQueryData(key)) {
      queryClient.setQueryData(key, partial)
    }
  }
}
