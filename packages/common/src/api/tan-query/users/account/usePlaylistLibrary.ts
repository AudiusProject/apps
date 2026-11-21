import { useQuery } from '@tanstack/react-query'

import { PlaylistLibrary } from '~/models/PlaylistLibrary'
import { AccountUserMetadata } from '~/models/User'

import { QueryOptions } from '../../types'

import {
  getCurrentAccountQueryKey,
  useCurrentAccount
} from './useCurrentAccount'
import { useCurrentUserId } from './useCurrentUserId'

const STALE_TIME = 1000 * 60 * 5

export const usePlaylistLibrary = (config?: QueryOptions) => {
  const { data: currentUserId } = useCurrentUserId()
  useCurrentAccount()

  return useQuery<AccountUserMetadata, Error, PlaylistLibrary>({
    queryKey: getCurrentAccountQueryKey(),
    select: (data) =>
      data?.playlist_library ?? ({ contents: [] } as PlaylistLibrary),
    staleTime: config?.staleTime ?? STALE_TIME,
    enabled: config?.enabled !== false && !!currentUserId,
    ...config
  })
}
