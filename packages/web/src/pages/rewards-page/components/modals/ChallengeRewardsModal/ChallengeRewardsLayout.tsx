import { ReactNode } from 'react'

import { Flex, Paper } from '@audius/harmony'

import { useIsMobile } from 'hooks/useIsMobile'

import { DefaultProgress } from './DefaultProgress'
import { DefaultReward } from './ProgressReward'

export type ChallengeRewardsLayoutProps = {
  header?: ReactNode
  description?: ReactNode
  progress?: ReactNode
  reward?: ReactNode
  actions?: ReactNode
  additionalContent?: ReactNode
  errorContent?: ReactNode
  amount?: number
  rewardSubtext?: string
  progressStatusLabel?: ReactNode
  progressValue?: number
  progressMax?: number
}

export const ChallengeRewardsLayout = ({
  header,
  description,
  progress,
  reward,
  actions,
  additionalContent,
  errorContent,
  amount,
  rewardSubtext = '$AUDIO',
  progressStatusLabel,
  progressValue,
  progressMax
}: ChallengeRewardsLayoutProps) => {
  const isMobile = useIsMobile()

  const rewardContent = reward ?? (
    <DefaultReward amount={amount} subtext={rewardSubtext} />
  )

  const progressContent = progress ?? (
    <DefaultProgress
      statusLabel={progressStatusLabel}
      value={progressValue}
      max={progressMax}
    />
  )

  return (
    <Flex column gap='2xl'>
      {header}
      {isMobile ? (
        <>
          {description}
          <Paper column shadow='flat' w='100%' borderRadius='s'>
            <Flex justifyContent='center'>{rewardContent}</Flex>
            {progressContent}
          </Paper>
          {additionalContent}
        </>
      ) : (
        <>
          <Paper
            shadow='flat'
            w='100%'
            direction='column'
            borderRadius='s'
            gap='s'
          >
            <Flex justifyContent='space-between' w='100%'>
              {description}
              {rewardContent}
            </Flex>
            {progressContent}
          </Paper>
          {additionalContent}
        </>
      )}
      {actions}
      {errorContent}
    </Flex>
  )
}
