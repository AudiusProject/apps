import { useEffect } from 'react'

import { Id } from '@audius/sdk/services'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usePrevious } from 'react-use'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { Nullable } from '~/utils'

import { getTrackQueryKey } from '../tracks/useTrack'

import { getTrackCommentCountQueryKey } from './utils'

const COMMENT_COUNT_POLL_INTERVAL = 10 * 1000 // 10 secs

export const useTrackCommentCount = (
  trackId: Nullable<ID> | undefined,
  userId: Nullable<ID> | undefined,
  shouldPoll = false
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const queryData = useQuery({
    queryKey: getTrackCommentCountQueryKey(trackId),
    enabled: !!trackId,
    queryFn: async () => {
      const sdk = await audiusSdk()
      const res = await sdk.tracks.getTrackCommentCount({
        trackId: Id.parse(trackId as ID), // Its safe to cast to ID because we only enable the query with !!trackId above
        userId: userId?.toString() ?? undefined // userId can be undefined if not logged in
      })
      const previousData = queryClient.getQueryData(
        getTrackCommentCountQueryKey(trackId)
      )
      return {
        // If we've loaded previous data before, keep using the same previousValue
        // if there is no previous data its a first load so we need to set a baseline
        previousValue: previousData?.previousValue ?? res?.data,
        currentValue: res?.data
      }
    },

    refetchInterval: shouldPoll ? COMMENT_COUNT_POLL_INTERVAL : undefined,
    refetchIntervalInBackground: false,

    // this data is only used when on the page in comments, we want to make sure it gets fetched fresh every time we load comments
    gcTime: 1
  })

  // Track changes in the current value and update legacy cache when changed
  const currentCountValue = queryData?.data?.currentValue
  const previousCurrentCount = usePrevious(currentCountValue) // note: this is different from data.previousValue
  useEffect(() => {
    if (
      currentCountValue !== undefined &&
      previousCurrentCount !== currentCountValue
    ) {
      // This keeps the legacy cache in sync with tanquery here - since we update the comment count here more often than the legacy cache
      // We want to keep these values in sync
      queryClient.setQueryData(
        getTrackQueryKey(trackId),
        (prevTrack) =>
          prevTrack && {
            ...prevTrack,
            comment_count: currentCountValue
          }
      )
    }
  }, [currentCountValue, previousCurrentCount, queryClient, trackId])
  return queryData
}
