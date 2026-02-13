import { OptionalId } from '@audius/sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { pick } from 'lodash'

import { userTrackMetadataFromSDK } from '~/adapters/track'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'
import { Status } from '~/models/Status'

import { TQTrack } from '../models'
import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions, SelectableQueryOptions } from '../types'
import { useAccountStatus } from '../users/account/useAccountStatus'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { entityCacheOptions } from '../utils/entityCacheOptions'
import { primeTrackData } from '../utils/primeTrackData'

import { useTrack } from './useTrack'

export const getTrackByPermalinkQueryKey = (
  permalink: string | undefined | null
) => {
  return [QUERY_KEYS.trackByPermalink, permalink] as unknown as QueryKey<ID>
}

export const useTrackByPermalink = <TResult = TQTrack>(
  permalink: string | undefined | null,
  options?: SelectableQueryOptions<TQTrack, TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()
  const { data: accountStatus } = useAccountStatus()

  const simpleOptions = pick(options, [
    'enabled',
    'staleTime',
    'placeholderData',
    'throwOnError'
  ]) as QueryOptions

  const { data: trackId } = useQuery({
    queryKey: getTrackByPermalinkQueryKey(permalink),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.full.tracks.getBulkTracks({
        permalink: [permalink!],
        userId: OptionalId.parse(currentUserId)
      })

      if (data.length === 0) {
        return null
      }

      const track = userTrackMetadataFromSDK(data[0])

      if (track) {
        primeTrackData({ tracks: [track], queryClient })
      }

      return track?.track_id
    },
    throwOnError: simpleOptions?.throwOnError ?? false,
    ...entityCacheOptions,
    enabled:
      simpleOptions?.enabled !== false &&
      !!permalink &&
      // Need to wait for account status to load so that we're able to query with the correct user id
      (accountStatus === Status.SUCCESS || accountStatus === Status.ERROR)
  })

  return useTrack(trackId, options)
}
