import { QUERY_KEYS } from '@audius/common/api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'

// Bump when the persisted shape changes incompatibly so existing snapshots
// are dropped on next launch.
const QUERY_CACHE_BUSTER = 'v2'
const QUERY_CACHE_STORAGE_KEY = 'tanquery-cache'
const QUERY_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24

// Narrow positive allowlist: only the queries needed to paint the Trending
// screen instantly on a warm cold-start. A wide allowlist inflates the cached
// JSON blob and forces a large JSON.stringify on the JS thread every time any
// allowlisted query updates — causing periodic freezes. We can broaden this
// later per-screen once we've confirmed the overhead is acceptable.
const PERSIST_QUERY_KEY_ALLOWLIST: ReadonlySet<string> = new Set([
  // Account / identity.
  QUERY_KEYS.account,
  QUERY_KEYS.accountUser,
  QUERY_KEYS.walletAddresses,

  // Entity caches — needed for trending tiles to render without a network
  // round-trip (tracks + their owners).
  QUERY_KEYS.user,
  QUERY_KEYS.track,

  // Trending lineup (the initial landing screen).
  QUERY_KEYS.trending,
  QUERY_KEYS.trendingIds
])

const queryClientPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_CACHE_STORAGE_KEY,
  // Coalesce writes: 1 write per 5 s max. Aggressive throttling keeps the
  // JSON.stringify work (which runs on the JS thread) from firing too
  // often and causing periodic frame drops.
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
      // Skip errored / pending queries — let them refetch from scratch.
      return query.state.status === 'success'
    }
  }
}
