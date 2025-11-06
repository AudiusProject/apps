import { useRemixContest, useRemixesLineup } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { Box, Flex, Text, IconTrophy } from '@audius/harmony'

import useTabs from 'hooks/useTabs/useTabs'

import { RemixContestSubmissionsTab } from '../../shared/RemixContestSubmissionsTab'
import { RemixContestWinnersTab } from '../../shared/RemixContestWinnersTab'

import { RemixContestDetailsTab } from './RemixContestDetailsTab'
import { RemixContestPrizesTab } from './RemixContestPrizesTab'

const messages = {
  title: 'Remix Contest',
  details: 'Details',
  prizes: 'Prizes',
  winners: 'Winners',
  submissions: 'Submissions',
  uploadRemixButtonText: 'Upload Your Remix'
}

type RemixContestSectionProps = {
  trackId: ID
  isOwner: boolean
}

export const RemixContestSection = ({
  trackId,
  isOwner
}: RemixContestSectionProps) => {
  const { data: remixContest } = useRemixContest(trackId)
  const { data: remixes, count: remixCount } = useRemixesLineup({
    trackId,
    isContestEntry: true
  })
  const hasPrizeInfo = !!remixContest?.eventData?.prizeInfo
  const hasWinners = (remixContest?.eventData?.winners?.length ?? 0) > 0

  const tabs = [
    {
      text: messages.details,
      label: 'details'
    },
    ...(hasPrizeInfo
      ? [
          {
            text: messages.prizes,
            label: 'prizes'
          }
        ]
      : []),
    ...(hasWinners
      ? [
          {
            text: messages.winners,
            label: 'winners'
          }
        ]
      : [
          {
            text: messages.submissions,
            label: 'submissions'
          }
        ])
  ]

  const elements = [
    <RemixContestDetailsTab
      key='details'
      trackId={trackId}
      isOwner={isOwner}
    />,
    ...(hasPrizeInfo
      ? [<RemixContestPrizesTab key='prizes' trackId={trackId} />]
      : []),
    ...(hasWinners
      ? [
          <RemixContestWinnersTab
            key='winners'
            trackId={trackId}
            winnerIds={remixContest?.eventData?.winners ?? []}
            size='mobile'
            count={remixCount}
          />
        ]
      : [
          <RemixContestSubmissionsTab
            key='submissions'
            trackId={trackId}
            submissions={remixes.slice(0, 6)}
            size='mobile'
            count={remixCount}
          />
        ])
  ]

  const { tabs: TabBar, body: TabBody } = useTabs({
    tabs,
    initialTab: hasWinners ? 'winners' : undefined,
    elements,
    isMobile: false,
    isMobileV2: true
  })

  if (!trackId || !remixContest) return null

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
        css={{ overflow: 'hidden' }}
      >
        <Flex column pv='m'>
          <Flex w='100%' alignItems='center' borderBottom='default' ph='xl'>
            {TabBar}
          </Flex>
          {TabBody}
        </Flex>
      </Box>
    </Flex>
  )
}
