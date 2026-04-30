import { useRemixContest, useRemixesLineup } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { Box, Flex, Text, IconTrophy } from '@audius/harmony'
import { useSearchParams } from 'react-router'

import { Tab, TabList } from 'components/tabs'
import { useUpdateSearchParams } from 'pages/search-page/hooks'

import { RemixContestSubmissionsTab } from '../../shared/RemixContestSubmissionsTab'
import { RemixContestWinnersTab } from '../../shared/RemixContestWinnersTab'

import { RemixContestDetailsTab } from './RemixContestDetailsTab'
import { RemixContestPrizesTab } from './RemixContestPrizesTab'

const TAB_PARAM = 'contest-tab'

const messages = {
  title: 'Remix Contest',
  details: 'Details',
  prizes: 'Prizes',
  winners: 'Winners',
  submissions: 'Submissions'
}

type RemixContestSectionProps = {
  trackId: ID
  isOwner: boolean
}

/**
 * In-line remix contest section for mobile track page when CONTESTS is off.
 */
export const RemixContestSection = ({
  trackId,
  isOwner
}: RemixContestSectionProps) => {
  const { data: remixContest } = useRemixContest(trackId)
  const { data: remixes, count: remixCount } = useRemixesLineup({
    trackId,
    isContestEntry: true
  })
  const remixesList = remixes ?? []
  const hasPrizeInfo = !!remixContest?.eventData?.prizeInfo
  const hasWinners = (remixContest?.eventData?.winners?.length ?? 0) > 0

  const [urlSearchParams] = useSearchParams()
  const updateTabSearchParam = useUpdateSearchParams(TAB_PARAM)
  const activeTab =
    urlSearchParams.get(TAB_PARAM) ?? (hasWinners ? 'winners' : 'details')

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
            <TabList
              variant='mobileV2'
              value={activeTab}
              onChange={updateTabSearchParam}
            >
              <Tab value='details'>{messages.details}</Tab>
              {hasPrizeInfo ? (
                <Tab value='prizes'>{messages.prizes}</Tab>
              ) : null}
              {hasWinners ? (
                <Tab value='winners'>{messages.winners}</Tab>
              ) : (
                <Tab value='submissions'>{messages.submissions}</Tab>
              )}
            </TabList>
          </Flex>
          {activeTab === 'details' ? (
            <RemixContestDetailsTab trackId={trackId} isOwner={isOwner} />
          ) : activeTab === 'prizes' && hasPrizeInfo ? (
            <RemixContestPrizesTab trackId={trackId} />
          ) : activeTab === 'winners' && hasWinners ? (
            <RemixContestWinnersTab
              trackId={trackId}
              winnerIds={remixContest?.eventData?.winners ?? []}
              size='mobile'
              count={remixCount}
            />
          ) : (
            <RemixContestSubmissionsTab
              trackId={trackId}
              submissions={remixesList.slice(0, 6)}
              size='mobile'
              count={remixCount}
            />
          )}
        </Flex>
      </Box>
    </Flex>
  )
}
