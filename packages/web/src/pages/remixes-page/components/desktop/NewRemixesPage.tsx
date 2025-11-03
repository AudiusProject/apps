import { useCallback } from 'react'

import {
  useRemixesLineup,
  useRemixContest,
  useCurrentUserId,
  useRemixes
} from '@audius/common/api'
import { remixMessages as messages } from '@audius/common/messages'
import { Name, Track, User } from '@audius/common/models'
import { remixesPageLineupActions } from '@audius/common/store'
import { dayjs } from '@audius/common/utils'
import {
  IconRemix,
  Text,
  Flex,
  FilterButton,
  IconTrophy,
  Button
} from '@audius/harmony'
import { Link } from 'react-router-dom'

import { MIN_PAGE_WIDTH_PX } from 'common/utils/layout'
import { Header } from 'components/header/desktop/Header'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import Page from 'components/page/Page'
import { useRemixPageParams } from 'pages/remixes-page/hooks'
import { useUpdateSearchParams } from 'pages/search-page/hooks'
import { track, make } from 'services/analytics'
import { fullTrackRemixesPage, pickWinnersPage } from 'utils/route'
import { withNullGuard } from 'utils/withNullGuard'

import styles from './RemixesPage.module.css'

export const REMIXES_PAGE_SIZE = 10

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

const RemixesPage = nullGuard(({ title, originalTrack }) => {
  const updateSortParam = useUpdateSearchParams('sortMethod')
  const updateIsCosignParam = useUpdateSearchParams('isCosign')
  const updateIsContestEntryParam = useUpdateSearchParams('isContestEntry')
  const { data: currentUserId } = useCurrentUserId()
  const { data: contest } = useRemixContest(originalTrack?.track_id)
  const winnerCount = contest?.eventData?.winners?.length ?? 0
  const { data: remixes } = useRemixes({
    trackId: originalTrack?.track_id,
    isContestEntry: true
  })
  const remixCount = remixes?.pages[0]?.count ?? 0

  const isRemixContest = !!contest
  const isTrackOwner = currentUserId === originalTrack.owner_id
  const isRemixContestEnded =
    isRemixContest && dayjs(contest.endDate).isBefore(dayjs())
  const showPickWinnersButton =
    isTrackOwner && isRemixContestEnded && remixCount > 0

  const { sortMethod, isCosign, isContestEntry } = useRemixPageParams()
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
    lineup
  } = useRemixesLineup({
    trackId: originalTrack?.track_id,
    includeOriginal: true,
    includeWinners: true,
    sortMethod,
    isCosign,
    isContestEntry
  })

  const pickWinnersRoute = pickWinnersPage(originalTrack?.permalink)

  const handlePickWinnersClick = useCallback(() => {
    if (contest?.eventId) {
      track(
        make({
          eventName: Name.REMIX_CONTEST_PICK_WINNERS_OPEN,
          remixContestId: contest?.eventId,
          trackId: originalTrack?.track_id
        })
      )
    }
  }, [contest?.eventId, originalTrack?.track_id])

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
        {count !== undefined ? ` (${count})` : ''}
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

  const maxEntries = count && winnerCount ? count + winnerCount + 1 : undefined

  return (
    <Page
      title={title}
      canonicalUrl={fullTrackRemixesPage(originalTrack.permalink)}
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
})

export default RemixesPage
