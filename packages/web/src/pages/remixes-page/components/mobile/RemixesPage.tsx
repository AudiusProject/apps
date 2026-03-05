import { useEffect, useContext, useCallback } from 'react'

import {
  useUser,
  useTrack,
  useTrackByPermalink,
  useRemixContest,
  useRemixersCount,
  useRemixesLineup
} from '@audius/common/api'
import { remixMessages as messages } from '@audius/common/messages'
import {
  remixesPageActions,
  remixesPageLineupActions,
  remixesPageSelectors
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Flex,
  Text,
  IconRemix as IconRemixes,
  IconTrophy,
  FilterButton
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router'

import Header from 'components/header/mobile/Header'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import { useSubPageHeader } from 'components/nav/mobile/NavContext'
import { useRemixPageParams } from 'pages/remixes-page/hooks'
import { useUpdateSearchParams } from 'pages/search-page/hooks'
import { push as pushRoute } from 'utils/navigation'
import { fullTrackRemixesPage } from 'utils/route'

import styles from './RemixesPage.module.css'

const { profilePage } = route
const { getTrackId } = remixesPageSelectors
const { fetchTrackSucceeded, reset } = remixesPageActions

type RemixesPageProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

const RemixesPage = ({ containerRef }: RemixesPageProps) => {
  const dispatch = useDispatch()
  const { handle, slug } = useParams<{ handle: string; slug: string }>()
  const originalTrackId = useSelector(getTrackId)
  const { data: originalTrack } = useTrack(originalTrackId)
  const { data: remixContest } = useRemixContest(originalTrackId)
  useRemixersCount({ trackId: originalTrackId })

  const { data: originalTrackByPermalink } = useTrackByPermalink(
    handle && slug ? `/${handle}/${slug}` : null
  )
  const track = originalTrackByPermalink ?? originalTrack
  const { data: user } = useUser(track?.owner_id)
  const trackId = track?.track_id

  useEffect(() => {
    if (trackId) {
      dispatch(fetchTrackSucceeded({ trackId }))
    }
  }, [dispatch, trackId])

  useEffect(() => {
    return function cleanup() {
      dispatch(reset())
      dispatch(remixesPageLineupActions.reset())
    }
  }, [dispatch])

  const goToTrackPage = useCallback(() => {
    if (user && track) {
      dispatch(pushRoute(track.permalink))
    }
  }, [dispatch, track, user])

  const goToArtistPage = useCallback(() => {
    if (user) {
      dispatch(pushRoute(profilePage(user?.handle)))
    }
  }, [dispatch, user])

  useSubPageHeader()

  const updateSortParam = useUpdateSearchParams('sortMethod')
  const updateIsCosignParam = useUpdateSearchParams('isCosign')
  const updateIsContestEntryParam = useUpdateSearchParams('isContestEntry')
  const { sortMethod, isCosign, isContestEntry } = useRemixPageParams()

  const {
    data,
    count: lineupCount,
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
    trackId: track?.track_id,
    includeOriginal: true,
    includeWinners: true,
    sortMethod,
    isCosign,
    isContestEntry
  })

  const { data: contest } = useRemixContest(track?.track_id)
  const { setHeader } = useContext(HeaderContext)

  const isRemixContest = !!remixContest
  const title = isRemixContest
    ? messages.submissionsTitle
    : messages.remixesTitle
  const winnerCount = contest?.eventData?.winners?.length ?? 0

  useEffect(() => {
    if (track && user) {
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
    }
  }, [
    setHeader,
    title,
    track,
    user,
    goToArtistPage,
    goToTrackPage,
    isRemixContest
  ])

  if (!track || !user) {
    return null
  }

  const winnersDelineator = (
    <Flex justifyContent='space-between' gap='l' mb='xl'>
      <Text variant='title'>{messages.winners}</Text>
    </Flex>
  )

  const remixesDelineator = (
    <Flex justifyContent='space-between' gap='l' mb='xl' direction='column'>
      <Text variant='title'>
        {messages.remixesTitle}
        {lineupCount ? ` (${lineupCount})` : ''}
      </Text>
      <Flex gap='s' css={{ flexWrap: 'wrap' }}>
        <FilterButton
          label={messages.coSigned}
          value={isCosign ? 'true' : null}
          onClick={() => updateIsCosignParam(isCosign ? '' : 'true')}
        />
        {isRemixContest ? (
          <FilterButton
            label={messages.contestEntries}
            value={isContestEntry ? 'true' : null}
            onClick={() =>
              updateIsContestEntryParam(isContestEntry ? '' : 'true')
            }
          />
        ) : null}
        <FilterButton
          value={sortMethod ?? 'recent'}
          variant='replaceLabel'
          onChange={updateSortParam}
          options={[
            { label: 'Most Recent', value: 'recent' },
            { label: 'Most Plays', value: 'plays' },
            { label: 'Most Favorites', value: 'likes' }
          ]}
        />
      </Flex>
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
    lineupCount && winnerCount ? lineupCount + winnerCount + 1 : undefined

  return (
    <MobilePageContainer
      title={title}
      canonicalUrl={fullTrackRemixesPage(track.permalink)}
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

export default RemixesPage
