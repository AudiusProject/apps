import { useMemo } from 'react'

import { useFanClubsList, useQueryContext } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { route } from '@audius/common/utils'
import { Box } from '@audius/harmony'
import { GetCoinsSortDirectionEnum, GetCoinsSortMethodEnum } from '@audius/sdk'

import {
  FanClubCardSkeleton,
  FanClubCoinCard
} from 'pages/fan-clubs-launchpad-page/components/FanClubCoinCard'

import { Carousel } from './Carousel'
import { useExploreSectionTracking } from './useExploreSectionTracking'

const FAN_CLUBS_PREVIEW_LIMIT = 12
const FAN_CLUBS_SKELETON_COUNT = 4

export const FanClubsExploreSection = () => {
  const { ref, inView } = useExploreSectionTracking('Fan Clubs')
  const { env } = useQueryContext()

  const { data, isPending, isError, isSuccess } = useFanClubsList(
    {
      limit: FAN_CLUBS_PREVIEW_LIMIT,
      offset: 0,
      sortMethod: GetCoinsSortMethodEnum.MarketCap,
      sortDirection: GetCoinsSortDirectionEnum.Desc
    },
    { enabled: inView }
  )

  const coins = useMemo(() => {
    if (!data?.length) {
      return []
    }
    return data.filter(
      (coin) => coin.ticker && coin.mint !== env.WAUDIO_MINT_ADDRESS
    )
  }, [data, env.WAUDIO_MINT_ADDRESS])

  if (isError || (isSuccess && coins.length === 0)) {
    return null
  }

  return (
    <Carousel
      ref={ref}
      title={messages.fanClubs}
      viewAllLink={route.CLUBS_EXPLORE_PAGE}
    >
      {!inView || isPending
        ? Array.from({ length: FAN_CLUBS_SKELETON_COUNT }).map((_, i) => (
            <Box key={i} css={{ width: 312, flexShrink: 0 }}>
              <FanClubCardSkeleton />
            </Box>
          ))
        : coins.map((coin) => (
            <Box key={coin.mint} css={{ width: 312, flexShrink: 0 }}>
              <FanClubCoinCard coin={coin} />
            </Box>
          ))}
    </Carousel>
  )
}
