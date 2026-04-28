import { ReactNode } from 'react'

import { Flex, Text, Tooltip } from '@audius/harmony'

import { getPercentageComplete } from './ProfileCompletionHeroCard'
import styles from './ProfileCompletionTooltip.module.css'
import { TaskCompletionList } from './TaskCompletionList'
import { CompletionStages } from './types'

const makeStrings = (completionPercentage: number) => ({
  title: `Profile ${completionPercentage}% Complete`,
  completeCount: (stepsComplete: number, numSteps: number) =>
    `${stepsComplete} of ${numSteps} tasks complete`
})

type TooltipContentProps = {
  completionStages: CompletionStages
}

const TooltipContent = ({ completionStages }: TooltipContentProps) => {
  const completionPercentage = getPercentageComplete(completionStages).toFixed()
  const strings = makeStrings(Number(completionPercentage))
  const stepsComplete = completionStages.filter(
    (stage) => stage.isCompleted
  ).length

  return (
    <Flex column gap='m' w={320} css={{ whiteSpace: 'normal' }}>
      <Flex column gap='xs' alignItems='flex-start'>
        <Text variant='title' size='l' color='default' textAlign='left'>
          {strings.title}
        </Text>
        <Text variant='body' size='s' color='subdued' textAlign='left'>
          {strings.completeCount(stepsComplete, completionStages.length)}
        </Text>
      </Flex>
      <Flex
        h={4}
        w='100%'
        backgroundColor='surface2'
        borderRadius='s'
        css={{ overflow: 'hidden' }}
      >
        <Flex
          h='100%'
          backgroundColor='primary'
          css={{ width: `${completionPercentage}%` }}
        />
      </Flex>
      <TaskCompletionList
        completionStages={completionStages}
        variant='surface'
      />
    </Flex>
  )
}

type ProfileCompletionTooltipProps = {
  completionStages: CompletionStages
  children: ReactNode
  isDisabled?: boolean
  shouldDismissOnClick?: boolean
}

/**
 * ProfileCompletionTooltip is a hovering tooltip that presents the
 * percentage of profile completion and the list of completion stages.
 */
export const ProfileCompletionTooltip = ({
  completionStages,
  children,
  isDisabled,
  shouldDismissOnClick = false
}: ProfileCompletionTooltipProps) => {
  return (
    <Tooltip
      className={styles.surfaceTooltip}
      color='white'
      mount='body'
      shouldWrapContent={false}
      disabled={isDisabled}
      mouseEnterDelay={0.1}
      shouldDismissOnClick={shouldDismissOnClick}
      text={<TooltipContent completionStages={completionStages} />}
      placement='rightBottom'
    >
      {children}
    </Tooltip>
  )
}
