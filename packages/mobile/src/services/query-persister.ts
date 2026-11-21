import { QUERY_KEYS } from '@audius/common/api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'

import { queryClient } from 'app/services/query-client'

const QUERY_CACHE_BUSTER = 'v2'
const QUERY_CACHE_STORAGE_KEY = 'tanquery-cache'
const QUERY_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24

const PERSIST_QUERY_KEY_ALLOWLIST: ReadonlySet<string> = new Set([
  QUERY_KEYS.account,
  QUERY_KEYS.accountUser,
  QUERY_KEYS.walletAddresses,

  QUERY_KEYS.user,
  QUERY_KEYS.track,

  QUERY_KEYS.trending,
  QUERY_KEYS.trendingIds
])

type ReferencedEntityIds = { trackIds: Set<number>; userIds: Set<number> }

let referencedEntityIds: ReferencedEntityIds | null = null

const getReferencedEntityIds = (): ReferencedEntityIds => {
  if (referencedEntityIds) return referencedEntityIds

  const trackIds = new Set<number>()
  const userIds = new Set<number>()
  const queryCache = queryClient.getQueryCache()

  for (const query of queryCache.findAll({ queryKey: [QUERY_KEYS.trending] })) {
    const data = query.state.data as { pages?: unknown[] } | undefined
    for (const page of data?.pages ?? []) {
      if (!Array.isArray(page)) continue
      for (const entry of page) {
        if (typeof entry?.id === 'number') trackIds.add(entry.id)
      }
    }
  }

  for (const trackId of trackIds) {
    const track = queryClient.getQueryData<{ user_id?: number }>([
      QUERY_KEYS.track,
      trackId
    ])
    if (track?.user_id) userIds.add(track.user_id)
  }

  const account = queryClient.getQueryData<{ userId?: number | null }>([
    QUERY_KEYS.account,
    QUERY_KEYS.accountUser
  ])
  if (account?.userId) userIds.add(account.userId)

  referencedEntityIds = { trackIds, userIds }
  Promise.resolve().then(() => {
    referencedEntityIds = null
  })
  return referencedEntityIds
}

const queryClientPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_CACHE_STORAGE_KEY,
  throttleTime: 5000
})

export const queryClientPersistOptions: Omit<
  PersistQueryClientOptions,
  'queryClient'
> = {
  persister: queryClientPersister,
  buster: QUERY_CACHE_BUSTER,
  maxAge: QUERY_CACHE_MAX_AGE_MS,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const topKey = query.queryKey?.[0]
      if (typeof topKey !== 'string') return false
      if (!PERSIST_QUERY_KEY_ALLOWLIST.has(topKey)) return false
      if (query.state.status !== 'success') return false

      if (topKey === QUERY_KEYS.track || topKey === QUERY_KEYS.user) {
        const id = query.queryKey[1]
        if (typeof id !== 'number') return false
        const { trackIds, userIds } = getReferencedEntityIds()
        return (topKey === QUERY_KEYS.track ? trackIds : userIds).has(id)
      }
      return true
    }
  }
}
