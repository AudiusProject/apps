import { useMemo } from 'react'

import {
  useAllRemixContests,
  useCurrentUserId,
  useUserRemixContests
} from '@audius/common/api'
import { route } from '@audius/common/utils'
import { Box } from '@audius/harmony'
import {
  GetContestsByUserStatusEnum,
  GetRemixContestsStatusEnum
} from '@audius/sdk'

import { ContestCard, ContestCardSkeleton } from 'components/contest-card'

import { Carousel } from '../../search-explore-page/components/desktop/Carousel'
import { CONTEST_CARD_WIDTH } from '../../search-explore-page/components/desktop/constants'

const SKELETON_COUNT = 6
const MAX_TILES = 12

const messages = {
  title: 'Active Contests',
  empty: 'No active contests right now'
}

export const ActiveContestsStrip = () => {
  const { data: currentUserId } = useCurrentUserId()

  const {
    data: allActiveTrackIds,
    isPending: isAllPending,
    isError: isAllError
  } = useAllRemixContests({
    status: GetRemixContestsStatusEnum.Active
  })

  const { data: hostedTrackIds, isPending: isHostedPending } =
    useUserRemixContests(
      {
        userId: currentUserId,
        status: GetContestsByUserStatusEnum.Active
      },
      { enabled: !!currentUserId }
    )

  const ordered = useMemo(() => {
    const all = allActiveTrackIds ?? []
    const hosted = new Set(hostedTrackIds ?? [])
    if (hosted.size === 0) return all.slice(0, MAX_TILES)
    const top: number[] = []
    const rest: number[] = []
    for (const id of all) {
      if (hosted.has(id)) top.push(id)
      else rest.push(id)
    }
    return [...top, ...rest].slice(0, MAX_TILES)
  }, [allActiveTrackIds, hostedTrackIds])

  if (isAllError) return null

  const isLoading =
    isAllPending || (!!currentUserId && isHostedPending && !hostedTrackIds)

  if (!isLoading && ordered.length === 0) return null

  return (
    <Carousel title={messages.title} viewAllLink={route.CONTESTS_PAGE}>
      {isLoading
        ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <Box key={i} w={CONTEST_CARD_WIDTH} css={{ flexShrink: 0 }}>
              <ContestCardSkeleton variant='grid' />
            </Box>
          ))
        : ordered.map((trackId) => (
            <Box key={trackId} w={CONTEST_CARD_WIDTH} css={{ flexShrink: 0 }}>
              <ContestCard trackId={trackId} variant='grid' />
            </Box>
          ))}
    </Carousel>
  )
}
