import { useState, useCallback } from 'react'

import { useRemixContest, useRemixesLineup, useTrack } from '@audius/common/api'
import { ID, Name } from '@audius/common/models'
import { dayjs } from '@audius/common/utils'
import {
  Box,
  Button,
  Flex,
  IconCloudUpload,
  IconTrophy,
  motion,
  spacing,
  Text
} from '@audius/harmony'
import { Link, useSearchParams } from 'react-router'

import { Tab, TabList } from 'components/tabs'
import { useEnterContest } from 'pages/contest-page/hooks/useEnterContest'
import { useUpdateSearchParams } from 'pages/search-page/hooks'
import { track, make } from 'services/analytics'
import { pickWinnersPage } from 'utils/route'

import { RemixContestSubmissionsTab } from '../shared/RemixContestSubmissionsTab'
import { RemixContestWinnersTab } from '../shared/RemixContestWinnersTab'

import { RemixContestDetailsTab } from './RemixContestDetailsTab'
import { RemixContestPrizesTab } from './RemixContestPrizesTab'
import { TabBody } from './TabBody'

const messages = {
  title: 'Remix Contest',
  details: 'Details',
  prizes: 'Prizes',
  winners: 'Winners',
  submissions: 'Submissions',
  uploadRemixButtonText: 'Upload Your Remix',
  pickWinners: 'Pick Winners',
  editWinners: 'Edit Winners'
}

const TAB_BAR_HEIGHT = 56
const TAB_PARAM = 'contest-tab'

type RemixContestSectionProps = {
  trackId: ID
  isOwner: boolean
}

/**
 * In-line remix contest (details, prizes, submissions, winners) for the track
 * page when the CONTESTS feature flag is off. When the flag is on, the track
 * page uses {@link RemixContestTeaser} and the dedicated contest page instead.
 */
export const RemixContestSection = ({
  trackId,
  isOwner
}: RemixContestSectionProps) => {
  const goToUploadWithRemix = useEnterContest(trackId)
  const { data: originalTrack } = useTrack(trackId)
  const { data: remixContest } = useRemixContest(trackId)
  const { data: remixes, count: remixCount = 0 } = useRemixesLineup({
    trackId,
    isContestEntry: true
  })
  const remixesList = remixes ?? []

  const [contentHeight, setContentHeight] = useState(0)
  const hasPrizeInfo = !!remixContest?.eventData?.prizeInfo
  const isContestEnded = dayjs(remixContest?.endDate).isBefore(dayjs())
  const hasWinners = (remixContest?.eventData?.winners?.length ?? 0) > 0

  const handleHeightChange = useCallback((height: number) => {
    setContentHeight(height)
  }, [])

  const [urlSearchParams] = useSearchParams()
  const updateTabSearchParam = useUpdateSearchParams(TAB_PARAM)
  const activeTab =
    urlSearchParams.get(TAB_PARAM) ?? (hasWinners ? 'winners' : 'details')

  const TabBar = (
    <TabList value={activeTab} onChange={updateTabSearchParam}>
      <Tab value='details'>{messages.details}</Tab>
      {hasPrizeInfo ? <Tab value='prizes'>{messages.prizes}</Tab> : null}
      {hasWinners ? (
        <Tab value='winners'>{messages.winners}</Tab>
      ) : (
        <Tab value='submissions'>
          {remixCount
            ? `${messages.submissions} (${remixCount})`
            : messages.submissions}
        </Tab>
      )}
    </TabList>
  )

  const ContentBody = (
    <TabBody onHeightChange={handleHeightChange}>
      {activeTab === 'details' ? (
        <RemixContestDetailsTab trackId={trackId} />
      ) : activeTab === 'prizes' && hasPrizeInfo ? (
        <RemixContestPrizesTab trackId={trackId} />
      ) : activeTab === 'winners' && hasWinners ? (
        <RemixContestWinnersTab
          trackId={trackId}
          winnerIds={remixContest?.eventData?.winners ?? []}
          count={remixCount}
        />
      ) : (
        <RemixContestSubmissionsTab
          trackId={trackId}
          submissions={remixesList.slice(0, 10)}
          count={remixCount}
        />
      )}
    </TabBody>
  )

  const pickWinnersRoute = pickWinnersPage(originalTrack?.permalink ?? '')

  const handlePickWinnersClick = useCallback(() => {
    if (remixContest?.eventId) {
      track(
        make({
          eventName: Name.REMIX_CONTEST_PICK_WINNERS_OPEN,
          remixContestId: remixContest.eventId,
          trackId
        })
      ).catch(() => {})
    }
  }, [remixContest?.eventId, trackId])

  if (!trackId || !remixContest) return null

  const totalBoxHeight = TAB_BAR_HEIGHT + contentHeight

  return (
    <Flex column gap='l'>
      <Flex alignItems='center' gap='s'>
        <IconTrophy color='default' />
        <Text variant='title' size='l'>
          {messages.title}
        </Text>
      </Flex>
      <Box
        backgroundColor='white'
        shadow='mid'
        borderRadius='l'
        border='default'
        css={{
          transition: motion.quick,
          overflow: 'hidden',
          height: totalBoxHeight
        }}
      >
        <Flex column pv='m'>
          <Flex justifyContent='space-between' borderBottom='default' ph='xl'>
            <Flex alignItems='center'>{TabBar}</Flex>
            {!isOwner && !isContestEnded ? (
              <Flex mb='m'>
                <Button
                  variant='secondary'
                  size='small'
                  onClick={goToUploadWithRemix}
                  iconLeft={IconCloudUpload}
                >
                  {messages.uploadRemixButtonText}
                </Button>
              </Flex>
            ) : isOwner && isContestEnded && remixCount > 0 ? (
              <Flex mb='m'>
                <Button
                  variant={hasWinners ? 'secondary' : 'primary'}
                  size='small'
                  onClick={handlePickWinnersClick}
                >
                  <Link to={pickWinnersRoute}>
                    {hasWinners ? messages.editWinners : messages.pickWinners}
                  </Link>
                </Button>
              </Flex>
            ) : (
              <Flex h={spacing.m + spacing['2xl']} />
            )}
          </Flex>
          {ContentBody}
        </Flex>
      </Box>
    </Flex>
  )
}
