import { ID } from '~/models/Identifiers'
import { UserMetadata } from '~/models/User'

import { SelectableQueryOptions } from '../types'

import { useUser } from './useUser'
import { useUserByHandle } from './useUserByHandle'

type UserParams = { id?: ID } | { handle?: string | null }

export const useUserByParams = <
  TResult extends Partial<UserMetadata> = UserMetadata
>(
  params: UserParams,
  options?: SelectableQueryOptions<UserMetadata, TResult>
) => {
  const userId = 'id' in params ? params.id : null
  const handle = 'handle' in params ? params.handle : null

  const idQuery = useUser(userId, options)
  const handleQuery = useUserByHandle(handle, options)

  const query = userId ? idQuery : handleQuery

  return query
}
