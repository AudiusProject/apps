import { Id } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey } from '../types'

type WaveformResponse = {
  data: { duration_ms: number; buckets: number; peaks: number[] }
}

export const getTrackWaveformPeaksQueryKey = (trackId: ID | null | undefined) =>
  [QUERY_KEYS.trackWaveformPeaks, trackId] as unknown as QueryKey<
    number[] | null
  >

export const useTrackWaveformPeaks = (
  trackId: ID | null | undefined,
  enabled: boolean
) => {
  const { env } = useQueryContext()

  return useQuery({
    queryKey: getTrackWaveformPeaksQueryKey(trackId),
    queryFn: async () => {
      const res = await fetch(
        `${env.API_URL}/v1/tracks/${Id.parse(trackId!)}/waveform`
      )
      if (!res.ok) return null
      const { data }: WaveformResponse = await res.json()
      return data.peaks.length ? data.peaks : null
    },
    enabled: enabled && !!trackId && trackId > 0,
    staleTime: Infinity,
    retry: false
  })
}
