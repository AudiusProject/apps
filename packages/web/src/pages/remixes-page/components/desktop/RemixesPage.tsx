import { useCallback, useEffect } from 'react'

import {
  useUser,
  useTrack,
  useTrackByPermalink,
  useRemixContest,
  useRemixersCount,
  useRemixesLineup,
  useCurrentUserId,
  useRemixes
} from '@audius/common/api'
import { remixMessages as messages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import {
  remixesPageActions,
  remixesPageLineupActions,
  remixesPageSelectors
} from '@audius/common/store'
import { dayjs } from '@audius/common/utils'
import {
  IconRemix,
  Text,
  Flex,
  FilterButton,
  IconTrophy,
  Button
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useParams } from 'react-router'

import { MIN_PAGE_WIDTH_PX } from 'common/utils/layout'
import { Header } from 'components/header/desktop/Header'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import Page from 'components/page/Page'
import { useRemixPageParams } from 'pages/remixes-page/hooks'
import { useUpdateSearchParams } from 'pages/search-page/hooks'
import { track as trackEvent, make } from 'services/analytics'
import { fullTrackRemixesPage, pickWinnersPage } from 'utils/route'

import styles from './RemixesPage.module.css'

const { getTrackId } = remixesPageSelectors
const { fetchTrackSucceeded, reset } = remixesPageActions

export const REMIXES_PAGE_SIZE = 10

type RemixesPageProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

const RemixesPage = ({ containerRef }: RemixesPageProps) => {
  const dispatch = useDispatch()
  const { handle, slug } = useParams<{ handle: string; slug: string }>()
  const originalTrackId = useSelector(getTrackId)
  const { data: originalTrack } = useTrack(originalTrackId)
  useRemixersCount({ trackId: originalTrackId })

  const { data: originalTrackByPermalink } = useTrackByPermalink(
    handle && slug ? `/${handle}/${slug}` : null
  )
  const track = originalTrackByPermalink ?? originalTrack
  const { data: user } = useUser(track?.owner_id)
  const trackId = track?.track_id

  const updateSortParam = useUpdateSearchParams('sortMethod')
  const updateIsCosignParam = useUpdateSearchParams('isCosign')
  const updateIsContestEntryParam = useUpdateSearchParams('isContestEntry')
  const { data: currentUserId } = useCurrentUserId()
  const { data: contest } = useRemixContest(trackId)
  const winnerCount = contest?.eventData?.winners?.length ?? 0
  const { data: remixes } = useRemixes({
    trackId: trackId ?? undefined,
    isContestEntry: true
  })
  const remixCount = remixes?.pages[0]?.count ?? 0

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
    lineup
  } = useRemixesLineup({
    trackId: trackId ?? undefined,
    includeOriginal: true,
    includeWinners: true,
    sortMethod,
    isCosign,
    isContestEntry
  })

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

  const pickWinnersRoute = track ? pickWinnersPage(track.permalink) : ''
  const handlePickWinnersClick = useCallback(() => {
    if (contest?.eventId && track) {
      trackEvent(
        make({
          eventName: Name.REMIX_CONTEST_PICK_WINNERS_OPEN,
          remixContestId: contest?.eventId,
          trackId: track.track_id
        })
      )
    }
  }, [contest?.eventId, track])

  if (!track || !user) {
    return null
  }

  const isRemixContest = !!contest
  const isTrackOwner = currentUserId === track.owner_id
  const isRemixContestEnded =
    isRemixContest && dayjs(contest.endDate).isBefore(dayjs())
  const showPickWinnersButton =
    isTrackOwner && isRemixContestEnded && remixCount > 0

  const title = isRemixContest
    ? messages.submissionsTitle
    : messages.remixesTitle

  const renderHeader = () => (
    <Header
      icon={isRemixContest ? IconTrophy : IconRemix}
      primary={title}
      containerStyles={styles.header}
      rightDecorator={
        showPickWinnersButton ? (
          <Button size='small' asChild onClick={handlePickWinnersClick}>
            <Link to={pickWinnersRoute}>
              {winnerCount > 0 ? messages.editWinners : messages.pickWinners}
            </Link>
          </Button>
        ) : null
      }
    />
  )

  const winnersDelineator = (
    <Flex justifyContent='space-between' mb='xl'>
      <Text variant='heading'>{messages.winners}</Text>
    </Flex>
  )

  const remixesDelineator = (
    <Flex justifyContent='space-between' mb='xl'>
      <Text variant='heading'>
        {messages.remixesTitle}
        {lineupCount !== undefined ? ` (${lineupCount})` : ''}
      </Text>
      <Flex gap='s'>
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
    lineupCount !== undefined && winnerCount
      ? lineupCount + winnerCount + 1
      : undefined

  return (
    <Page
      title={title}
      canonicalUrl={fullTrackRemixesPage(track.permalink)}
      header={renderHeader()}
    >
      <Flex direction='column' gap='xl' css={{ minWidth: MIN_PAGE_WIDTH_PX }}>
        <Text variant='heading'>{messages.originalTrack}</Text>
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
          pageSize={REMIXES_PAGE_SIZE}
          actions={remixesPageLineupActions}
          delineatorMap={delineatorMap}
          maxEntries={maxEntries}
        />
      </Flex>
    </Page>
  )
}

export default RemixesPage
