import { ID } from '~/models'

import { useUserRemixContests } from './useUserRemixContests'

const PAGE_SIZE = 1

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
  const isResolving = isPending || (!hasContest && isFetching)

  return { hasContest, isPending: isResolving }
}
