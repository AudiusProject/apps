import { useCallback } from 'react'

import {
  useArtistCoin,
  useExclusiveTracks,
  useExclusiveTracksCount
} from '@audius/common/api'
import { exclusiveTracksPageLineupActions as exclusiveTracksActions } from '@audius/common/store'

import { Flex, PlainButton, Text } from '@audius/harmony-native'
import { TanQueryLineup } from 'app/components/lineup/TanQueryLineup'
import { useNavigation } from 'app/hooks/useNavigation'

const messages = {
  exclusiveTracks: 'Exclusive Tracks',
  viewAll: 'View All'
}

const MAX_PREVIEW_TRACKS = 3

const itemStyles = {
  paddingHorizontal: 0
}

type ExclusiveTracksSectionProps = {
  mint: string
}

export const ExclusiveTracksSection = ({
  mint
}: ExclusiveTracksSectionProps) => {
  const navigation = useNavigation()
  const { data: coin } = useArtistCoin(mint)
  const ownerId = coin?.ownerId
  const coinName = coin?.name ?? coin?.ticker

  const { data, lineup, pageSize, isFetching, loadNextPage, isPending } =
    useExclusiveTracks({
      userId: ownerId,
      pageSize: MAX_PREVIEW_TRACKS
    })

  const { data: totalCount = 0 } = useExclusiveTracksCount({
    userId: ownerId
  })

  const handleViewAll = useCallback(() => {
    if (coin?.ticker) {
      navigation.navigate('ExclusiveTracksScreen', { ticker: coin.ticker })
    }
  }, [coin?.ticker, navigation])

  const shouldShowCard = totalCount > 0 && ownerId

  if (!shouldShowCard) return null

  const title = coinName
    ? `${coinName} ${messages.exclusiveTracks}`
    : messages.exclusiveTracks

  return (
    <Flex column w='100%'>
      <Flex
        row
        alignItems='center'
        justifyContent='space-between'
        w='100%'
        gap='m'
      >
        <Flex row alignItems='center' gap='xs' style={{ flex: 1 }}>
          <Text variant='heading' size='s'>
            {title}{' '}
            {totalCount > 0 ? (
              <Text color='subdued'>({totalCount})</Text>
            ) : null}
          </Text>
        </Flex>
        <PlainButton onPress={handleViewAll} size='large'>
          {messages.viewAll}
        </PlainButton>
      </Flex>
      <TanQueryLineup
        actions={exclusiveTracksActions}
        lineup={lineup}
        offset={0}
        maxEntries={MAX_PREVIEW_TRACKS}
        pageSize={pageSize}
        includeLineupStatus
        itemStyles={itemStyles}
        isFetching={isFetching}
        loadNextPage={loadNextPage}
        hasMore={false}
        isPending={isPending}
        queryData={data}
        hidePlayBarChin={true}
      />
    </Flex>
  )
}
