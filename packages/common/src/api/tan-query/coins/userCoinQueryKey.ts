import { UserCoinWithAccounts } from '@audius/sdk'

import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey } from '../types'

export const getUserCoinQueryKey = (mint: string, userId?: ID | null) =>
  [
    QUERY_KEYS.userCoin,
    userId,
    mint
  ] as unknown as QueryKey<UserCoinWithAccounts | null>
