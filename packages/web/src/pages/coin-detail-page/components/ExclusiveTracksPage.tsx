import { useArtistCoinByTicker, useExclusiveTracks } from '@audius/common/api'
import { exclusiveTracksPageLineupActions } from '@audius/common/store'
import { Flex } from '@audius/harmony'
import { useParams } from 'react-router'

import { Header } from 'components/header/desktop/Header'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import Page from 'components/page/Page'

const PAGE_SIZE = 100

export const ExclusiveTracksPage = () => {
  const { ticker } = useParams<{ ticker?: string }>()

  const { data: coin } = useArtistCoinByTicker({ ticker: ticker ?? '' })
  const ownerId = coin?.ownerId
  const coinName = coin?.name ?? ticker

  const title = coinName ? `${coinName} Exclusive Tracks` : 'Exclusive Tracks'

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
  } = useExclusiveTracks({
    userId: ownerId,
    pageSize: PAGE_SIZE
  })

  const header = <Header primary={title} showBackButton={true} />

  return (
    <Page title={title} header={header}>
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
    </Page>
  )
}
