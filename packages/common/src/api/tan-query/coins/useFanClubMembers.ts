import { FixedDecimal } from '@audius/fixed-decimal'
import { HashId } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryOptions
} from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { formatNumberCommas } from '~/utils'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey } from '../types'

import { useFanClub } from './useFanClub'

const DEFAULT_PAGE_SIZE = 20

export interface CoinMember {
  userId: ID
  balance: number
  balanceLocaleString: string
}

export interface UseFanClubMembersArgs {
  mint: string | null
  pageSize?: number
  minBalance?: number
  sortDirection?: 'asc' | 'desc'
}

export const getCoinLeaderboardQueryKey = (
  mint: string | null | undefined,
  pageSize: number = DEFAULT_PAGE_SIZE,
  minBalance?: number,
  sortDirection?: 'asc' | 'desc'
) =>
  [
    QUERY_KEYS.fanClubMembers,
    mint,
    pageSize,
    minBalance,
    sortDirection
  ] as unknown as QueryKey<InfiniteData<CoinMember[], number>>

export const useFanClubMembers = <TResult = CoinMember[]>(
  {
    mint,
    pageSize = DEFAULT_PAGE_SIZE,
    minBalance,
    sortDirection = 'desc'
  }: UseFanClubMembersArgs,
  options?: Pick<
    UseInfiniteQueryOptions<CoinMember[], Error, TResult>,
    'select' | 'enabled'
  >
) => {
  const { audiusSdk } = useQueryContext()

  const { data: fanClub } = useFanClub(mint)

  return useInfiniteQuery({
    queryKey: getCoinLeaderboardQueryKey(
      mint,
      pageSize,
      minBalance,
      sortDirection
    ),
    initialPageParam: 0,
    getNextPageParam: (lastPage: CoinMember[], allPages: CoinMember[][]) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      if (!mint) return []
      if (!fanClub) return []

      const sdk = await audiusSdk()

      const params = {
        mint,
        limit: pageSize,
        offset: pageParam,
        sortDirection
      }

      const response = await sdk.coins.getCoinMembers(params)

      const members = (response.data ?? []).map((member) => {
        const decimals = fanClub.decimals
        const balanceFD = new FixedDecimal(
          BigInt(member.balance.toString()),
          decimals
        )

        return {
          userId: HashId.parse(member.userId),
          balance: member.balance,
          // Need formatNumberCommas for mobile :(
          balanceLocaleString: formatNumberCommas(
            balanceFD.toLocaleString('en-US', {
              maximumFractionDigits: 0,
              roundingMode: 'trunc'
            })
          )
        }
      })

      return members
    },
    select: options?.select ?? ((data) => data.pages.flat() as TResult),
    enabled: options?.enabled !== false && !!mint && !!fanClub
  })
}
