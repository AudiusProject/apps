import { Id, TrackCommentNotificationResponse } from '@audius/sdk/services'
import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { Nullable } from '~/utils'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey } from '../types'

export const getTrackCommentNotificationSettingQueryKey = (trackId: ID) => {
  return [
    QUERY_KEYS.trackCommentNotificationSetting,
    trackId
  ] as unknown as QueryKey<TrackCommentNotificationResponse>
}

export const useGetTrackCommentNotificationSetting = (
  trackId: ID,
  currentUserId: Nullable<ID> | undefined
) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getTrackCommentNotificationSettingQueryKey(trackId),
    queryFn: async () => {
      if (!currentUserId) return null
      const sdk = await audiusSdk()
      return await sdk.tracks.getTrackCommentNotificationSetting({
        trackId: Id.parse(trackId),
        userId: Id.parse(currentUserId)
      })
    }
  })
}
