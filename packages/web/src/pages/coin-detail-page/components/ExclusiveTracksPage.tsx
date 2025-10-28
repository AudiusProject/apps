import { useCallback } from 'react'

import { useArtistCoin } from '@audius/common/api'
import { useExclusiveTracksLineup } from '@audius/common/src/api/tan-query/users/useExclusiveTracksLineup'
import { exclusiveTracksPageLineupActions } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { Box, Flex, IconArrowLeft, IconButton, Text } from '@audius/harmony'
import { useParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom-v5-compat'

import { Header } from 'components/header/desktop/Header'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'

const messages = {
  exclusiveTracks: 'Exclusive Tracks'
}

const PAGE_SIZE = 100

export const ExclusiveTracksPage = () => {
  const { ticker } = useParams<{ ticker: string }>()
  const navigate = useNavigate()

  const { data: coin } = useArtistCoin(ticker)
  const ownerId = coin?.ownerId

  const {
    data,
    isFetching,
    isPending,
    isError,
    hasNextPage,
    play,
    pause,
    loadNextPage,
    isPlaying,
    lineup
  } = useExclusiveTracksLineup({
    userId: ownerId,
    pageSize: PAGE_SIZE
  })

  const handleBack = useCallback(() => {
    if (ticker) {
      navigate(route.coinPage(ticker))
    }
  }, [ticker, navigate])

  const coinName = coin?.name ?? ticker ?? 'Coin'

  return (
    <Box w='100%'>
      <Header primary={messages.exclusiveTracks} />
      <Flex
        column
        gap='xl'
        alignItems='center'
        ph='3xl'
        pt='2xl'
        pb='3xl'
        w='100%'
      >
        <Flex
          column
          gap='l'
          css={{
            maxWidth: 1080,
            width: '100%',
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--harmony-bg-surface-1)',
            paddingTop: 'var(--harmony-unit-l)',
            paddingBottom: 'var(--harmony-unit-m)',
            zIndex: 10
          }}
        >
          <Flex alignItems='center' justifyContent='space-between' w='100%'>
            <Flex alignItems='center' gap='m'>
              <IconButton
                aria-label='back'
                icon={IconArrowLeft}
                color='default'
                onClick={handleBack}
              />
              <Text variant='heading' size='l' strength='weak'>
                {coinName} {messages.exclusiveTracks}
              </Text>
            </Flex>
          </Flex>
        </Flex>

        <Flex
          column
          gap='l'
          ph='3xl'
          css={{
            maxWidth: 1080,
            width: '100%'
          }}
        >
          <TanQueryLineup
            data={data}
            isFetching={isFetching}
            isPending={isPending}
            isError={isError}
            hasNextPage={hasNextPage}
            play={play}
            pause={pause}
            loadNextPage={loadNextPage}
            isPlaying={isPlaying}
            lineup={lineup}
            actions={exclusiveTracksPageLineupActions}
            pageSize={PAGE_SIZE}
          />
        </Flex>
      </Flex>
    </Box>
  )
}
