import { ID } from '~/models'

export type SDKRequest<T> = Omit<
  T,
  'encodedDataMessage' | 'encodedDataSignature'
> & { currentUserId?: ID | null }

export type SDKInfiniteQueryArgs<T> = Omit<
  T,
  'encodedDataMessage' | 'encodedDataSignature' | 'userId' | 'limit' | 'offset'
> & {
  pageSize?: number
}
