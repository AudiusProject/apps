import { ID } from '~/models'

import { useUserRemixContests } from './useUserRemixContests'

const PAGE_SIZE = 1

/**
 * Returns whether the given user hosts any remix contest. Calls the
 * per-user endpoint (`useUserRemixContests`) with `pageSize: 1` so a
 * positive answer is one row, and a negative answer is one query — no
 * client-side scanning of the global list.
 */
export const useUserHasRemixContest = (hostUserId: ID | null | undefined) => {
  const enabled = hostUserId != null
  const {
    data: trackIds,
    isPending,
    isFetching
  } = useUserRemixContests(
    { userId: hostUserId, pageSize: PAGE_SIZE },
    { enabled }
  )

  const hasContest = (trackIds?.length ?? 0) > 0
  // While the first page is still loading the answer is ambiguous; surface
  // that so callers can hold off on hiding the tab and avoid a late
  // "tab appears" flash.
  const isResolving = isPending || (!hasContest && isFetching)

  return { hasContest, isPending: isResolving }
}
