import { useQuery } from '@tanstack/react-query'

import { Status } from '~/models'

import { QUERY_KEYS } from '../../queryKeys'
import { QueryKey } from '../../types'

export const getAccountStatusQueryKey = () =>
  [QUERY_KEYS.account, QUERY_KEYS.accountStatus] as unknown as QueryKey<Status>

export const useAccountStatus = () => {
  return useQuery({
    queryKey: getAccountStatusQueryKey(),
    queryFn: () => Status.IDLE,
    staleTime: Infinity,
    gcTime: Infinity
  })
}

export const useIsAccountLoaded = () => {
  const { data: accountStatus } = useAccountStatus()
  return accountStatus === Status.SUCCESS || accountStatus === Status.ERROR
}
