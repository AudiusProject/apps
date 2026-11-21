import React, { ReactNode } from 'react'

import { Flex, Text } from '@audius/harmony'

import DisplayAudio from 'components/DisplayAudio'
import Loading from 'components/Loading'
import {
  useUserAnnualRewardRate,
  useUserWeeklyRewards
} from 'store/cache/rewards/hooks'
import { Address, Status } from 'types'
import { TICKER } from 'utils/consts'

const messages = {
  staked: `Staked ${TICKER}`,
  estAnnualRewards: 'Est. Annual Reward',
  estWeeklyRewards: 'Est. Weekly Reward'
}

type RowStatProps = {
  label: string
  value: ReactNode
}
const RowStat: React.FC<RowStatProps> = ({ label, value }) => {
  return (
    <Flex gap='s' alignItems='center'>
      <Text variant='heading' size='s'>
        {value}
      </Text>

      <Text variant='body' size='l' strength='strong' color='subdued'>
        {label}
      </Text>
    </Flex>
  )
}

type OwnProps = {
  wallet: Address
}

type MyEstimatedRewardsProps = OwnProps

const MyEstimatedRewards: React.FC<MyEstimatedRewardsProps> = ({ wallet }) => {
  const weeklyRewards = useUserWeeklyRewards({ wallet })
  const annualRewards = useUserAnnualRewardRate({ wallet })
  const isLoading =
    weeklyRewards.status === Status.Loading ||
    annualRewards.status === Status.Loading
  const annual = annualRewards.reward ? (
    <DisplayAudio amount={annualRewards.reward} />
  ) : null

  const weekly =
    'reward' in weeklyRewards ? (
      <DisplayAudio amount={weeklyRewards.reward} />
    ) : null

  return (
    <Flex direction='column'>
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <RowStat label={messages.estAnnualRewards} value={annual} />
          <RowStat label={messages.estWeeklyRewards} value={weekly} />
        </>
      )}
    </Flex>
  )
}

export default MyEstimatedRewards
