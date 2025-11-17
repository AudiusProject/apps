import { useEffect, useContext } from 'react'

import { useRemixContest, useRemixesLineup } from '@audius/common/api'
import { remixMessages as messages } from '@audius/common/messages'
import { Track, User } from '@audius/common/models'
import { remixesPageLineupActions } from '@audius/common/store'
import {
  Flex,
  Text,
  IconRemix as IconRemixes,
  IconTrophy
} from '@audius/harmony'

import Header from 'components/header/mobile/Header'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import { useSubPageHeader } from 'components/nav/mobile/NavContext'
import { fullTrackRemixesPage } from 'utils/route'
import { withNullGuard } from 'utils/withNullGuard'

import styles from './RemixesPage.module.css'

export type RemixesPageProps = {
  title: string
  count: number | null
  originalTrack:
    | Pick<Track, 'track_id' | 'permalink' | 'title' | 'owner_id'>
    | undefined
  user: User | undefined
  goToTrackPage: () => void
  goToArtistPage: () => void
}

const nullGuard = withNullGuard(
  ({ originalTrack, user, ...p }: RemixesPageProps) =>
    originalTrack && user && { ...p, originalTrack, user }
)

const RemixesPage = nullGuard(
  ({ title, originalTrack, user, goToTrackPage, goToArtistPage }) => {
    useSubPageHeader()

    const {
      data,
      count,
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
    } = useRemixesLineup({
      trackId: originalTrack?.track_id,
      includeOriginal: true,
      includeWinners: true
    })

    const { data: contest } = useRemixContest(originalTrack?.track_id)
    const isRemixContest = !!contest
    const winnerCount = contest?.eventData?.winners?.length ?? 0

    const { setHeader } = useContext(HeaderContext)
    useEffect(() => {
      setHeader(
        <>
          <Header
            className={styles.header}
            title={
              <>
                {isRemixContest ? (
                  <IconTrophy className={styles.iconRemix} color='heading' />
                ) : (
                  <IconRemixes className={styles.iconRemix} color='heading' />
                )}
                <Text variant='heading' size='xs'>
                  {title}
                </Text>
              </>
            }
          />
        </>
      )
    }, [
      setHeader,
      title,
      originalTrack,
      user,
      goToArtistPage,
      goToTrackPage,
      isRemixContest
    ])

    const winnersDelineator = (
      <Flex justifyContent='space-between' gap='l' mb='xl'>
        <Text variant='title'>{messages.winners}</Text>
      </Flex>
    )

    const remixesDelineator = (
      <Flex justifyContent='space-between' gap='l' mb='xl'>
        <Text variant='title'>
          {messages.remixesTitle}
          {count ? ` (${count})` : ''}
        </Text>
      </Flex>
    )

    const delineatorMap =
      winnerCount > 0
        ? {
            0: winnersDelineator,
            [winnerCount]: remixesDelineator
          }
        : {
            0: remixesDelineator
          }

    const maxEntries =
      count && winnerCount ? count + winnerCount + 1 : undefined

    return (
      <MobilePageContainer
        title={title}
        canonicalUrl={fullTrackRemixesPage(originalTrack.permalink)}
        containerClassName={styles.container}
      >
        <Flex direction='column' mt='3xl' gap='l' w='100%'>
          <Text variant='title'>{messages.originalTrack}</Text>
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
            actions={remixesPageLineupActions}
            pageSize={pageSize}
            delineatorMap={delineatorMap}
            maxEntries={maxEntries}
          />
        </Flex>
      </MobilePageContainer>
    )
  }
)

export default RemixesPage
