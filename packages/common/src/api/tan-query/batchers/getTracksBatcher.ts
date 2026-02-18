import { Id, OptionalId } from '@audius/sdk'
import { create, keyResolver, windowScheduler } from '@yornaath/batshit'
import { memoize, omit } from 'lodash'

import { userTrackMetadataFromSDK } from '~/adapters/track'
import { transformAndCleanList } from '~/adapters/utils'
import { ID } from '~/models/Identifiers'

import { TQTrack } from '../models'
import { primeTrackData } from '../utils/primeTrackData'

import { contextCacheResolver } from './contextCacheResolver'
import { BatchContext } from './types'

export const getTracksBatcher = memoize(
  (context: BatchContext) =>
    create({
      fetcher: async (ids: ID[]): Promise<TQTrack[]> => {
        const { sdk, currentUserId, queryClient } = context
        if (!ids.length) return []

        const { data } = await sdk.full.tracks.getBulkTracks({
          id: ids.map((id) => Id.parse(id)),
          userId: OptionalId.parse(currentUserId)
        })

        const tracks = transformAndCleanList(data, userTrackMetadataFromSDK)

        primeTrackData({
          tracks,
          queryClient,
          skipQueryData: true
        })

        const tqTracks: TQTrack[] = tracks.map((t) => ({
          ...omit(t, 'user')
        }))
        return tqTracks
      },
      resolver: keyResolver('track_id'),
      scheduler: windowScheduler(10)
    }),
  contextCacheResolver()
)
