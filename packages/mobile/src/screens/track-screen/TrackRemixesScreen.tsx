import {
  useCurrentUserId,
  useRemixContest,
  useRemixes,
  useRemixesLineup,
  useTrackByParams
} from '@audius/common/api'
import { remixMessages as messages } from '@audius/common/messages'
import { remixesPageLineupActions as tracksActions } from '@audius/common/store'
import { pluralize, dayjs } from '@audius/common/utils'
import { Text as RNText, View } from 'react-native'

import {
  Button,
  Flex,
  IconRemix,
  IconTrophy,
  Text
} from '@audius/harmony-native'
import {
  Screen,
  ScreenContent,
  ScreenHeader,
  ScrollView
} from 'app/components/core'
import { ScreenPrimaryContent } from 'app/components/core/Screen/ScreenPrimaryContent'
import { Lineup } from 'app/components/lineup'
import { TanQueryLineup } from 'app/components/lineup/TanQueryLineup'
import { TrackLink } from 'app/components/track/TrackLink'
import { UserLink } from 'app/components/user-link'
import { useDrawer } from 'app/hooks/useDrawer'
import { useRoute } from 'app/hooks/useRoute'
import { flexRowCentered, makeStyles } from 'app/styles'

const legacyMessages = {
  remix: 'Remix',
  of: 'of',
  by: 'by',
  header: 'Remixes'
}

const useStyles = makeStyles(({ spacing, palette, typography }) => ({
  header: {
    alignItems: 'center',
    margin: spacing(4),
    marginTop: spacing(6)
  },
  track: {
    ...flexRowCentered()
  },
  text: {
    ...typography.body,
    color: palette.neutral,
    textAlign: 'center',
    lineHeight: 20
  }
}))

export const TrackRemixesScreen = () => {
  const { onOpen: openPickWinnersDrawer } = useDrawer('PickWinners')
  const { data: currentUserId } = useCurrentUserId()
  const { params } = useRoute<'TrackRemixes'>()
  const { data: track } = useTrackByParams(params)
  const trackId = track?.track_id
  const { data, count, isFetching, isPending, loadNextPage, lineup, pageSize } =
    useRemixesLineup({
      trackId: track?.track_id,
      includeOriginal: true,
      includeWinners: true
    })
  const { data: contest } = useRemixContest(trackId)
  const isRemixContest = !!contest
  const isRemixContestEnded =
    isRemixContest && dayjs(contest.endDate).isBefore(dayjs())
  const isTrackOwner = currentUserId === track?.owner_id
  const { data: remixes } = useRemixes({
    trackId: track?.track_id,
    isContestEntry: true
  })
  const remixCount = remixes?.pages[0]?.count ?? 0
  const showPickWinnersButton =
    isTrackOwner && isRemixContestEnded && remixCount > 0
  const winnerCount = contest?.eventData?.winners?.length ?? 0

  const styles = useStyles()

  const remixesText = pluralize(legacyMessages.remix, count, 'es', !count)
  const remixesCountText = `${count || ''} ${remixesText} ${legacyMessages.of}`

  const winnersDelineator = (
    <Flex ph='l' pt='xl'>
      <Text variant='title'>{messages.winners}</Text>
    </Flex>
  )

  const remixesDelineator = (
    <Flex justifyContent='space-between' ph='l' pt='xl'>
      {count ? (
        <Text variant='title'>
          {messages.remixesTitle}
          {count !== undefined ? ` (${count})` : ''}
        </Text>
      ) : null}
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
    <Screen>
      <ScreenHeader
        text={
          isRemixContest ? messages.submissionsTitle : messages.remixesTitle
        }
        icon={isRemixContest ? IconTrophy : IconRemix}
      />
      <ScreenContent>
        {isRemixContest ? (
          <ScreenPrimaryContent>
            <ScrollView>
              <Flex
                row
                ph='l'
                mt='l'
                alignItems='center'
                justifyContent='space-between'
              >
                <Text variant='title'>{messages.originalTrack}</Text>
                {showPickWinnersButton ? (
                  <Button size='xs' onPress={openPickWinnersDrawer}>
                    {winnerCount > 0
                      ? messages.editWinners
                      : messages.pickWinners}
                  </Button>
                ) : null}
              </Flex>

              <TanQueryLineup
                queryData={data}
                isFetching={isFetching}
                isPending={isPending}
                loadNextPage={loadNextPage}
                lineup={lineup}
                actions={tracksActions}
                pageSize={pageSize}
                hasMore={false}
                delineatorMap={delineatorMap}
                maxEntries={maxEntries}
              />
            </ScrollView>
          </ScreenPrimaryContent>
        ) : (
          <Lineup
            tanQuery
            lineup={lineup}
            loadMore={loadNextPage}
            header={
              track ? (
                <View style={styles.header}>
                  <Text style={styles.text}>{remixesCountText}</Text>
                  <Text style={styles.text}>
                    <TrackLink trackId={track.track_id} variant='visible' />
                    <RNText>{legacyMessages.by}</RNText>{' '}
                    <UserLink userId={track.owner_id} variant='visible' />
                  </Text>
                </View>
              ) : null
            }
            actions={tracksActions}
          />
        )}
      </ScreenContent>
    </Screen>
  )
}
