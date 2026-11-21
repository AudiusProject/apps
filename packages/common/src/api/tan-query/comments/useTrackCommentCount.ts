import { useEffect } from 'react'

import { Id } from '@audius/sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usePrevious } from 'react-use'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { Nullable } from '~/utils'

import { getTrackQueryKey } from '../tracks/useTrack'

import { getTrackCommentCountQueryKey } from './utils'

const COMMENT_COUNT_POLL_INTERVAL = 10 * 1000

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
        userId: userId?.toString() ?? undefined
      })
      const previousData = queryClient.getQueryData(
        getTrackCommentCountQueryKey(trackId)
      )
      return {
        previousValue: previousData?.previousValue ?? res?.data,
        currentValue: res?.data
      }
    },

    refetchInterval: shouldPoll ? COMMENT_COUNT_POLL_INTERVAL : undefined,
    refetchIntervalInBackground: false,

    gcTime: 1
  })

  const currentCountValue = queryData?.data?.currentValue
  const previousCurrentCount = usePrevious(currentCountValue)
  useEffect(() => {
    if (
      currentCountValue !== undefined &&
      previousCurrentCount !== currentCountValue
    ) {
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
