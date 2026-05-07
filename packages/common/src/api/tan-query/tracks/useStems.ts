import { Id } from '@audius/sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { stemTrackMetadataFromSDK, transformAndCleanList } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import type { ID } from '~/models/Identifiers'
import type { Stem, StemTrack, Track } from '~/models/Track'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { primeTrackData } from '../utils/primeTrackData'

import { getTrackQueryKey } from './useTrack'

export const getStemsQueryKey = (trackId: ID | null | undefined) =>
  [QUERY_KEYS.stems, trackId] as unknown as QueryKey<StemTrack[]>

/**
 * Hook that returns stem tracks for a given track ID.
 * @param trackId The ID of the track to get stems for
 * @param options Query options
 * @returns The stem tracks data or null if not found
 */
export const useStems = (
  trackId: ID | null | undefined,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const validTrackId = !!trackId && trackId > 0

  return useQuery({
    queryKey: getStemsQueryKey(trackId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.tracks.getTrackStems({
        trackId: Id.parse(trackId!)
      })

      const stems = transformAndCleanList(data, stemTrackMetadataFromSDK)

      if (stems.length) {
        primeTrackData({ tracks: stems, queryClient })
      }

      queryClient.setQueryData<Track | undefined>(
        getTrackQueryKey(trackId!),
        (track) => {
          if (!track) {
            return track
          }

          return {
            ...track,
            _stems: stems.map<Stem>((stem) => ({
              track_id: stem.track_id,
              category: stem.stem_of.category,
              orig_filename: stem.orig_filename ?? ''
            }))
          }
        }
      )

      return stems
    },
    ...options,
    enabled: options?.enabled !== false && validTrackId
  })
}
