import { useMemo } from 'react'

import { useArtistCoinByTicker } from '@audius/common/api'
import { useProxySelector } from '@audius/common/hooks'
import {
  exclusiveTracksPageLineupActions as exclusiveTracksActions,
  exclusiveTracksPageSelectors
} from '@audius/common/store'
import { useRoute } from '@react-navigation/native'

import { Flex, Text } from '@audius/harmony-native'
import { Screen, ScreenContent } from 'app/components/core'
import { Lineup } from 'app/components/lineup'

const { getLineup } = exclusiveTracksPageSelectors

const messages = {
  emptyTitle: 'No exclusive tracks yet',
  emptyDescription: 'Check back later for exclusive content!'
}

const EmptyExclusiveTracks = () => {
  return (
    <Flex
      justifyContent='center'
      alignItems='center'
      gap='m'
      pv='4xl'
      ph='xl'
      w='100%'
    >
      <Text variant='title' size='l' textAlign='center'>
        {messages.emptyTitle}
      </Text>
      <Text variant='body' size='m' color='subdued' textAlign='center'>
        {messages.emptyDescription}
      </Text>
    </Flex>
  )
}

export const ExclusiveTracksScreen = () => {
  const { ticker } = useRoute().params as { ticker: string }
  const { data: coin } = useArtistCoinByTicker({ ticker })
  const ownerId = coin?.ownerId
  const coinName = coin?.name ?? ticker

  const title = coinName ? `${coinName} Exclusive Tracks` : 'Exclusive Tracks'

  const lineup = useProxySelector((state) => getLineup(state), [])

  const fetchPayload = useMemo(() => ({ userId: ownerId }), [ownerId])

  if (!ownerId) {
    return (
      <Screen variant='secondary' title={title}>
        <ScreenContent>
          <EmptyExclusiveTracks />
        </ScreenContent>
      </Screen>
    )
  }

  return (
    <Screen variant='secondary' title={title}>
      <ScreenContent>
        <Lineup
          selfLoad
          pullToRefresh
          actions={exclusiveTracksActions}
          lineup={lineup}
          fetchPayload={fetchPayload}
          LineupEmptyComponent={<EmptyExclusiveTracks />}
          showsVerticalScrollIndicator={false}
        />
      </ScreenContent>
    </Screen>
  )
}
