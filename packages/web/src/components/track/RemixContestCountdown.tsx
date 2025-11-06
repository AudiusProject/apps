import { useRemixContest } from '@audius/common/src/api/tan-query/events/useRemixContest'
import { useRemixCountdown } from '@audius/common/src/hooks/useRemixCountdown'
import { ID } from '@audius/common/src/models/Identifiers'
import { formatDoubleDigit } from '@audius/common/src/utils/formatUtil'
import { Text, Flex, spacing, Divider, Paper } from '@audius/harmony'
import { CSSObject } from '@emotion/styled'

import { useIsMobile } from 'hooks/useIsMobile'
import { zIndex } from 'utils/zIndex'

const messages = {
  days: 'days',
  hours: 'hours',
  minutes: 'minutes',
  seconds: 'seconds'
}

type TimeUnitProps = {
  label: string
  value?: number
  isSubdued?: boolean
}

const TimeUnit = ({ value = 0, label, isSubdued = true }: TimeUnitProps) => {
  return (
    <Flex column alignItems='center' justifyContent='center'>
      <Text variant='heading' color={isSubdued ? 'subdued' : 'inverse'}>
        {formatDoubleDigit(value)}
      </Text>
      <Text variant='label' color={isSubdued ? 'subdued' : 'inverse'} size='xs'>
        {label}
      </Text>
    </Flex>
  )
}

type RemixContestCountdownProps = {
  trackId: ID
}

export const RemixContestCountdown = ({
  trackId
}: RemixContestCountdownProps) => {
  const { data: remixContest } = useRemixContest(trackId)
  const timeLeft = useRemixCountdown(remixContest?.endDate)
  const isMobile = useIsMobile()
  const styles: CSSObject = isMobile
    ? {}
    : {
        position: 'absolute',
        top: spacing['2xl'],
        right: 0,
        zIndex: zIndex.REMIX_CONTEST_COUNT_DOWN
      }

  if (!remixContest) return null

  return (
    <Paper
      gap='xl'
      pv='s'
      ph='xl'
      justifyContent='center'
      alignItems='center'
      borderRadius='l'
      css={{ ...styles, opacity: 0.8 } as CSSObject}
    >
      <TimeUnit
        value={timeLeft?.days?.value}
        label={messages.days}
        isSubdued={timeLeft?.days?.isSubdued}
      />
      <Divider color='default' orientation='vertical' />
      <TimeUnit
        value={timeLeft?.hours?.value}
        label={messages.hours}
        isSubdued={timeLeft?.hours?.isSubdued}
      />
      <Divider color='default' orientation='vertical' />
      <TimeUnit
        value={timeLeft?.minutes?.value}
        label={messages.minutes}
        isSubdued={timeLeft?.minutes?.isSubdued}
      />
      <Divider color='default' orientation='vertical' />
      <TimeUnit
        value={timeLeft?.seconds?.value}
        label={messages.seconds}
        isSubdued={timeLeft?.seconds?.isSubdued}
      />
    </Paper>
  )
}
