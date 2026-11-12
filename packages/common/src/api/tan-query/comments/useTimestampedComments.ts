import { useMemo } from 'react'

import type { Comment, ID } from '~/models'

import { useTrackComments } from './useTrackComments'

const PAGE_SIZE = 50
// GetTrackCommentsSortMethodEnum.Timestamp
const SORT_BY_TIMESTAMP = 'timestamp'

export type TimestampedComment = Comment & { trackTimestampS: number }

/**
 * The track's comments that carry a timestamp, oldest timestamp first.
 * Capped at one page; the list is for markers and bubbles, not the thread.
 */
export const useTimestampedComments = (
  trackId: ID | undefined,
  enabled: boolean
) => {
  const { data: comments } = useTrackComments(
    {
      trackId: trackId as ID,
      sortMethod: SORT_BY_TIMESTAMP,
      pageSize: PAGE_SIZE
    },
    { enabled: enabled && !!trackId }
  )

  return useMemo(
    () =>
      (comments ?? [])
        .filter(
          (comment): comment is TimestampedComment =>
            typeof comment.trackTimestampS === 'number' &&
            comment.trackTimestampS >= 0 &&
            !(comment as Comment).isTombstone
        )
        .sort((a, b) => a.trackTimestampS - b.trackTimestampS),
    [comments]
  )
}
