import { Id } from '@audius/sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { Feature } from '~/models/ErrorReporting'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

import { useTrack } from './useTrack'

type GetStemsArchiveJobStatusResponse = {
  id: string
  state:
    | 'completed'
    | 'failed'
    | 'active'
    | 'waiting'
    | 'delayed'
    | 'prioritized'
  progress?: number
  failedReason?: string
}

export const getStemsArchiveJobQueryKey = (jobId?: string) => {
  return [
    QUERY_KEYS.stemsArchiveJob,
    jobId
  ] as unknown as QueryKey<GetStemsArchiveJobStatusResponse>
}

export const getDownloadTrackStemsQueryKey = (trackId: ID) => {
  return [
    QUERY_KEYS.downloadTrackStems,
    trackId
  ] as unknown as QueryKey<GetStemsArchiveJobStatusResponse>
}

export const useDownloadTrackStems = ({ trackId }: { trackId: ID }) => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  // Use existing track data to get access information
  const { data: trackAccess } = useTrack(trackId, {
    select: (track) => track?.access
  })

  return useMutation({
    mutationFn: async () => {
      const sdk = await audiusSdk()
      const archiver = sdk.services.archiverService
      if (!archiver) {
        throw new Error('Archiver service not configured')
      }
      if (!currentUserId) {
        throw new Error('Current user ID is required')
      }

      // Use track access info to determine if parent track is downloadable
      const includeParent = trackAccess?.download === true

      return await archiver.createStemsArchive({
        trackId: Id.parse(trackId),
        userId: Id.parse(currentUserId),
        includeParent
      })
    },
    onSuccess: async (response) => {
      queryClient.setQueryData(getDownloadTrackStemsQueryKey(trackId), response)
      queryClient.setQueryData(
        getStemsArchiveJobQueryKey(response.id),
        response
      )
    },
    onError: (error) => {
      reportToSentry({
        error,
        name: 'Failed to initiate stems archive download',
        feature: Feature.Remixes
      })
    }
  })
}

export const useCancelStemsArchiveJob = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobId }: { jobId: string }) => {
      const sdk = await audiusSdk()
      const archiver = sdk.services.archiverService
      if (!archiver) {
        throw new Error('Archiver service not configured')
      }
      await archiver.cancelStemsArchiveJob({ jobId })
      return jobId
    },
    onSuccess: (jobId) => {
      queryClient.removeQueries({
        queryKey: getStemsArchiveJobQueryKey(jobId),
        exact: true
      })
    }
  })
}

export const useGetStemsArchiveJobStatus = (
  { jobId }: { jobId?: string },
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getStemsArchiveJobQueryKey(jobId),
    queryFn: async () => {
      if (!jobId) {
        throw new Error('Job ID is required')
      }
      const sdk = await audiusSdk()
      const archiver = sdk.services.archiverService
      if (!archiver) {
        throw new Error('Archiver service not configured')
      }
      return await archiver.getStemsArchiveJobStatus({ jobId })
    },
    // refetch once per second until the job is completed or failed
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000
      }
      if (['completed', 'failed'].includes(query.state.data.state)) {
        return false
      }
      return 1000
    },
    staleTime: 0,
    gcTime: 0,
    enabled: !!jobId,
    ...options
  })
}
