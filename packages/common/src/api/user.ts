import { full, sdk } from '@audius/sdk'

import { createApi } from '~/audius-query'
import { ID, Kind, StringUSDC, userMetadataListFromSDK } from '~/models'
import {
  USDCTransactionDetails,
  USDCTransactionMethod,
  USDCTransactionType
} from '~/models/USDCTransactions'
import { Nullable } from '~/utils/typeUtils'

import { Id } from './utils'

type GetUSDCTransactionListArgs = {
  userId: Nullable<ID>
  offset: number
  limit: number
  sortMethod?: full.GetUSDCTransactionsSortMethodEnum
  sortDirection?: full.GetUSDCTransactionsSortDirectionEnum
  type?: full.GetUSDCTransactionsTypeEnum[]
  method?: full.GetUSDCTransactionsMethodEnum
}

/**
 * Parser to reformat transactions as they come back from the API.
 * @param transaction the transaction to parse
 */
const parseTransaction = ({
  transaction
}: {
  transaction: full.TransactionDetails
}): USDCTransactionDetails => {
  const { change, balance, transactionType, method, ...rest } = transaction
  return {
    ...rest,
    transactionType: transactionType as USDCTransactionType,
    method: method as USDCTransactionMethod,
    change: change as StringUSDC,
    balance: balance as StringUSDC
  }
}

const userApi = createApi({
  reducerPath: 'userApi',
  endpoints: {
    getUserById: {
      fetch: async (
        { id, currentUserId }: { id: ID; currentUserId: Nullable<ID> },
        { apiClient, audiusSdk, checkSDKMigration }
      ) => {
        // TODO: PAY-2925
        const apiUser = await checkSDKMigration({
          endpointName: 'getUserById',
          legacy: async () =>
            apiClient.getUser({
              userId: id,
              currentUserId
            }),
          migrated: async () => {
            const sdk = await audiusSdk()
            const { data: users = [] } = await sdk.full.users.getUser({
              id: Id.parse(id),
              userId: Id.parse(currentUserId)
            })
            return userMetadataListFromSDK(users)
          }
        })
        return apiUser[0]
      },
      options: {
        idArgKey: 'id',
        kind: Kind.USERS,
        schemaKey: 'user'
      }
    },
    getUserByHandle: {
      fetch: async (
        {
          handle,
          currentUserId,
          retry = true
        }: { handle: string; currentUserId: Nullable<ID>; retry?: boolean },
        { apiClient, audiusSdk, checkSDKMigration }
      ) => {
        // TODO: PAY-2925
        const apiUser = await checkSDKMigration({
          endpointName: 'getUserByHandle',
          legacy: async () =>
            apiClient.getUserByHandle({
              handle,
              currentUserId,
              retry
            }),
          migrated: async () => {
            const sdk = await audiusSdk()
            const { data: users = [] } = await sdk.full.users.getUserByHandle({
              handle,
              userId: Id.parse(currentUserId)
            })
            return userMetadataListFromSDK(users)
          }
        })
        return apiUser?.[0]
      },
      options: {
        kind: Kind.USERS,
        schemaKey: 'user'
      }
    },
    getUsersByIds: {
      fetch: async (args: { ids: ID[] }, context) => {
        const { ids } = args
        const { audiusBackend } = context
        return await audiusBackend.getCreators(ids)
      },
      options: { idListArgKey: 'ids', kind: Kind.USERS, schemaKey: 'users' }
    },
    getTracksByUser: {
      fetch: async (
        { userId, currentUserId }: { userId: ID; currentUserId: Nullable<ID> },
        audiusQueryContext
      ) => {
        const { apiClient } = audiusQueryContext
        const { handle } = await userApiFetch.getUserById(
          { id: userId, currentUserId },
          audiusQueryContext
        )
        const tracks = await apiClient.getUserTracksByHandle({
          handle,
          currentUserId,
          getUnlisted: userId === currentUserId
        })
        return tracks
      },
      options: {
        kind: Kind.TRACKS,
        schemaKey: 'tracks'
      }
    },
    getUSDCTransactions: {
      fetch: async (
        {
          offset,
          limit,
          userId,
          sortDirection,
          sortMethod,
          type,
          method
        }: GetUSDCTransactionListArgs,
        context
      ) => {
        const sdk = await context.audiusSdk()
        const { data = [] } = await sdk.full.users.getUSDCTransactions({
          limit,
          offset,
          sortDirection,
          sortMethod,
          id: Id.parse(userId!),
          type,
          method
        })

        return data.map((transaction) => parseTransaction({ transaction }))
      },
      options: { retry: true }
    },
    getUSDCTransactionsCount: {
      fetch: async (
        {
          userId,
          type,
          method
        }: Pick<GetUSDCTransactionListArgs, 'userId' | 'type' | 'method'>,
        { audiusSdk }
      ) => {
        const sdk = await audiusSdk()
        const { data } = await sdk.full.users.getUSDCTransactionCount({
          id: Id.parse(userId!),
          type,
          method
        })
        return data ?? 0
      },
      options: { retry: true }
    }
  }
})

export const {
  useGetUserById,
  useGetUsersByIds,
  useGetUserByHandle,
  useGetTracksByUser,
  useGetUSDCTransactions,
  useGetUSDCTransactionsCount
} = userApi.hooks
export const userApiReducer = userApi.reducer
export const userApiFetch = userApi.fetch
export const userApiActions = userApi.actions
export const userApiUtils = userApi.util
