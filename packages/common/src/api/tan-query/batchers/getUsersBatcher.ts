import { Id, OptionalId } from '@audius/sdk'
import { create, keyResolver, windowScheduler } from '@yornaath/batshit'
import { memoize } from 'lodash'

import { userMetadataListFromSDK } from '~/adapters/user'
import { ID } from '~/models'
import { UserMetadata } from '~/models/User'

import { primeUserData } from '../utils/primeUserData'

import { BatchContext } from './types'

export const getUsersBatcher = memoize(
  (context: BatchContext) =>
    create({
      fetcher: async (ids: ID[]): Promise<UserMetadata[]> => {
        const { sdk, currentUserId, queryClient, dispatch } = context
        if (!ids.length) return []
        const { data } = await sdk.full.users.getBulkUsers({
          id: ids.map((id) => Id.parse(id)),
          userId: OptionalId.parse(currentUserId)
        })

        const users = userMetadataListFromSDK(data)
        primeUserData({ users, queryClient, dispatch, skipQueryData: true })

        return users
      },
      resolver: keyResolver('user_id'),
      scheduler: windowScheduler(10)
    }),
  (context) => context.currentUserId
)
