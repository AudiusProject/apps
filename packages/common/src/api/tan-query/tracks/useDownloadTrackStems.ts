import { useEffect, useState } from 'react'

import { Id } from '@audius/sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

import { useTrack } from './useTrack'

// Stop polling the archive job after this long even if it never transitions
// out of `active`, so the UI can surface an error instead of spinning forever.
//
// Sized for the large end of real stem sets: a contest track can carry dozens
// of lossless stems totalling multiple GB, and WAV barely compresses, so the
// server-side zip legitimately runs for many minutes. The previous 5 minute
// budget expired before those archives could finish and reported a failure for
// a job that was still making progress.
const STEMS_ARCHIVE_POLL_TIMEOUT_MS = 900_000 // 15 minutes

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
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  // Whether the parent track can be bundled into the archive. Two separate
  // conditions, and both matter:
  //   - `is_downloadable` — the artist actually offers the full track. If
  //     this is false there is no downloadable parent file at all and its
  //     download URL 404s.
  //   - `access.download` — the *gating* check ("this user is allowed to
  //     download"), which is `true` for any ungated track regardless of
  //     whether a downloadable file exists.
  // Checking only the latter asks the archiver to include a file that isn't
  // there, which is how stem archives for stem-only tracks broke.
  const { data: parentDownloadability } = useTrack(trackId, {
    select: (track) => ({
      isDownloadable: track?.is_downloadable === true,
      hasDownloadAccess: track?.access?.download === true
    })
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

      const includeParent =
        parentDownloadability?.isDownloadable === true &&
        parentDownloadability?.hasDownloadAccess === true

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
      console.error(error)
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

  // Hard stop for a job that never transitions out of `active`. This has to be
  // real state rather than a ref: returning `false` from `refetchInterval`
  // silently stops polling without re-rendering, and the job state stays
  // `active` forever, so callers had no way to tell a stalled job from an
  // in-progress one and would spin indefinitely.
  const [isTimedOut, setIsTimedOut] = useState(false)

  const query = useQuery({
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
    // refetch once per second until the job is completed, failed, or we give up
    refetchInterval: (query) => {
      if (isTimedOut) {
        return false
      }
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

  const jobState = query.data?.state
  const isSettled = jobState === 'completed' || jobState === 'failed'

  useEffect(() => {
    setIsTimedOut(false)
    if (!jobId || isSettled) return
    const timer = setTimeout(
      () => setIsTimedOut(true),
      STEMS_ARCHIVE_POLL_TIMEOUT_MS
    )
    return () => clearTimeout(timer)
  }, [jobId, isSettled])

  return { ...query, isTimedOut }
}
