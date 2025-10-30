import { useEffect, useContext } from 'react'

import { useArtistCoinByTicker, useExclusiveTracks } from '@audius/common/api'
import { exclusiveTracksPageLineupActions } from '@audius/common/store'

import Header from 'components/header/mobile/Header'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import { useSubPageHeader } from 'components/nav/mobile/NavContext'

import styles from './ExclusiveTracksPage.module.css'

const PAGE_SIZE = 100

type ExclusiveTracksPageProps = {
  ticker: string
}

export const ExclusiveTracksPage = ({ ticker }: ExclusiveTracksPageProps) => {
  useSubPageHeader()

  const { data: coin } = useArtistCoinByTicker({ ticker })
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
    lineup,
    pageSize
  } = useExclusiveTracks({
    userId: ownerId,
    pageSize: PAGE_SIZE
  })

  const { setHeader } = useContext(HeaderContext)
  useEffect(() => {
    setHeader(
      <>
        <Header className={styles.header} title={title} />
      </>
    )
  }, [setHeader, title])

  return (
    <MobilePageContainer
      title={title}
      description={title}
      containerClassName={styles.container}
    >
      <div className={styles.tracksContainer}>
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
          pageSize={pageSize}
        />
      </div>
    </MobilePageContainer>
  )
}
