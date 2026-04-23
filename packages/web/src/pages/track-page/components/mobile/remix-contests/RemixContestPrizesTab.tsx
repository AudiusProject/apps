import { useRemixContest } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { Flex } from '@audius/harmony'

import { UserGeneratedText } from 'components/user-generated-text'

type RemixContestPrizesTabProps = {
  trackId: ID
}

export const RemixContestPrizesTab = ({
  trackId
}: RemixContestPrizesTabProps) => {
  const { data: remixContest } = useRemixContest(trackId)

  return (
    <Flex column gap='s' p='l' pb='s'>
      <UserGeneratedText variant='body'>
        {remixContest?.eventData?.prizeInfo}
      </UserGeneratedText>
    </Flex>
  )
}
