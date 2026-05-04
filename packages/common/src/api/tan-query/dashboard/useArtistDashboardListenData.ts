import { Id } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'
import { each } from 'lodash'

import { ID } from '~/models/Identifiers'
import dayjs, { Dayjs } from '~/utils/dayjs'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useQueryContext } from '../utils'

type UseArtistDashboardListenDataArgs = {
  start: string
  end: string
}

export type ArtistDashboardListenData = {
  all: {
    labels: string[]
    values: number[]
  }
  [id: number]: {
    labels: string[]
    values: number[]
  }
}

const formatMonth = (date: Dayjs | string) =>
  dayjs.utc(date).format('MMM').toUpperCase()

export const getArtistDashboardListenDataQueryKey = (
  currentUserId: ID | null | undefined,
  { start, end }: UseArtistDashboardListenDataArgs
) =>
  [
    QUERY_KEYS.artistDashboardListenData,
    currentUserId,
    { start, end }
  ] as unknown as QueryKey<ArtistDashboardListenData>

/**
 * Fetches monthly listen data for the current artist's tracks within the given
 * window and formats it into the `{ all, [trackId]: { labels, values } }`
 * shape consumed by `TotalPlaysChart`.
 *
 * Replaces the legacy `dashboardActions.fetchListenData` saga + slice state.
 */
export const useArtistDashboardListenData = ({
  start,
  end
}: UseArtistDashboardListenDataArgs) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  return useQuery({
    queryKey: getArtistDashboardListenDataQueryKey(currentUserId, {
      start,
      end
    }),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data: listenData } = await sdk.users.getUserMonthlyTrackListens({
        id: Id.parse(currentUserId),
        startTime: start,
        endTime: end
      })

      const labels: string[] = []
      const labelIndexMap: Record<string, number> = {}
      let cursor = dayjs.utc(start)
      const endDate = dayjs.utc(end)
      while (cursor.isBefore(endDate)) {
        cursor = cursor.add(1, 'month').endOf('month')
        const label = formatMonth(cursor)
        labelIndexMap[label] = labels.length
        labels.push(label)
      }

      const formatted: ArtistDashboardListenData = {
        all: {
          labels: [...labels],
          values: new Array(labels.length).fill(0)
        }
      }
      each(listenData, (data, date) => {
        const index = labelIndexMap[formatMonth(date)]
        formatted.all.values[index] = data.totalListens ?? 0
        if (data.listenCounts) {
          data.listenCounts.forEach((count) => {
            if (count.trackId && !(count.trackId in formatted)) {
              formatted[count.trackId] = {
                labels: [...labels],
                values: new Array(labels.length).fill(0)
              }
            }
            if (count.trackId) {
              formatted[count.trackId].values[index] = count.listens ?? 0
            }
          })
        }
      })

      return formatted
    },
    enabled: !!currentUserId
  })
}
