import { ID } from '@audius/common/models'
import { Id } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { env } from 'services/env'

type WaveformResponse = {
  data: { duration_ms: number; buckets: number; peaks: number[] }
}

/**
 * Real waveform peaks (0-255) for a track, or null when no content node has
 * computed them yet. Not in the generated SDK until the endpoint ships.
 */
export const useTrackWaveformPeaks = (trackId: ID, enabled: boolean) =>
  useQuery({
    queryKey: ['trackWaveformPeaks', trackId],
    queryFn: async () => {
      const res = await fetch(
        `${env.API_URL}/v1/tracks/${Id.parse(trackId)}/waveform`
      )
      if (!res.ok) return null
      const { data }: WaveformResponse = await res.json()
      return data.peaks.length ? data.peaks : null
    },
    enabled,
    staleTime: Infinity,
    retry: false
  })
