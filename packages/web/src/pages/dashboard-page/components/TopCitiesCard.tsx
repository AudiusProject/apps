import { useState } from 'react'

import { ListenerCitiesTime, useListenerCities } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { formatCount } from '@audius/common/utils'
import {
  Box,
  Flex,
  Paper,
  SegmentedControl,
  Skeleton,
  Text
} from '@audius/harmony'

const messages = {
  title: 'Top Cities',
  description:
    'Where your listeners are, based on their internet connection. VPNs and mobile networks can show a nearby city instead.',
  week: 'Last 7 Days',
  month: 'Last 30 Days',
  all: 'All Time',
  empty: 'No listener locations for this period yet.',
  error: 'Couldn’t load listener locations.',
  plays: (count: number) =>
    `${formatCount(count)} ${count === 1 ? 'play' : 'plays'}`
}

const timeOptions: { key: ListenerCitiesTime; text: string }[] = [
  { key: 'week', text: messages.week },
  { key: 'month', text: messages.month },
  { key: 'all', text: messages.all }
]

const LIMIT = 10

const formatPlace = (region: string, country: string) =>
  [region, country].filter(Boolean).join(', ')

type TopCitiesCardProps = {
  userId: ID
}

export const TopCitiesCard = ({ userId }: TopCitiesCardProps) => {
  const [time, setTime] = useState<ListenerCitiesTime>('month')
  const {
    data: cities,
    isPending,
    isError
  } = useListenerCities({ userId, time, limit: LIMIT })
  const maxCount = cities?.[0]?.playCount ?? 0

  return (
    <Paper direction='column' w='100%' p='xl' gap='l' mt='xl'>
      <Flex
        justifyContent='space-between'
        alignItems='flex-start'
        gap='l'
        wrap='wrap'
      >
        <Flex direction='column' gap='xs' css={{ flex: '1 1 320px' }}>
          <Text variant='title' size='l'>
            {messages.title}
          </Text>
          <Text variant='body' size='s' color='subdued'>
            {messages.description}
          </Text>
        </Flex>
        <SegmentedControl
          options={timeOptions}
          selected={time}
          onSelectOption={setTime}
        />
      </Flex>
      {isPending ? (
        <Flex direction='column' gap='m'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} h={40} />
          ))}
        </Flex>
      ) : isError ? (
        <Text variant='body' color='subdued'>
          {messages.error}
        </Text>
      ) : !cities?.length ? (
        <Text variant='body' color='subdued'>
          {messages.empty}
        </Text>
      ) : (
        <Flex as='ol' direction='column' gap='m' m='none' p='none'>
          {cities.map((city, i) => (
            <Flex
              as='li'
              key={`${city.city}|${city.region}|${city.country}`}
              alignItems='center'
              gap='l'
            >
              <Text
                variant='body'
                strength='strong'
                color='subdued'
                css={{ width: 24, textAlign: 'right', flexShrink: 0 }}
              >
                {i + 1}
              </Text>
              <Flex direction='column' css={{ width: 240, flexShrink: 0 }}>
                <Text variant='body' strength='strong' ellipses>
                  {city.city}
                </Text>
                <Text variant='body' size='s' color='subdued' ellipses>
                  {formatPlace(city.region, city.country)}
                </Text>
              </Flex>
              <Box flex={1} h={8} borderRadius='s' backgroundColor='surface2'>
                <Box
                  h='100%'
                  borderRadius='s'
                  css={(theme) => ({
                    width: `${Math.max(2, (city.playCount / maxCount) * 100)}%`,
                    backgroundColor: theme.color.background.primary
                  })}
                />
              </Box>
              <Text
                variant='body'
                size='s'
                css={{ width: 96, textAlign: 'right', flexShrink: 0 }}
              >
                {messages.plays(city.playCount)}
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Paper>
  )
}
