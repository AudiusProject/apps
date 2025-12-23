import { ReactNode } from 'react'

import { Flex, Text, useTheme, Tooltip } from '@audius/harmony'

import { getPercentageComplete } from './ProfileCompletionHeroCard'
import styles from './ProfileCompletionTooltip.module.css'
import { TaskCompletionList } from './TaskCompletionList'
import { CompletionStages } from './types'

const makeStrings = (completionPercentage: number) => ({
  completionPercentage: `Profile ${completionPercentage}% Complete`
})

type TooltipContentProps = {
  completionStages: CompletionStages
}

const TooltipContent = ({ completionStages }: TooltipContentProps) => {
  const completionPercentage = getPercentageComplete(completionStages).toFixed()
  const strings = makeStrings(Number(completionPercentage))
  const { color } = useTheme()

  return (
    <Flex direction='column'>
      <Flex
        p='l'
        alignItems='center'
        justifyContent='center'
        css={{
          backgroundColor: color.secondary.s500
        }}
      >
        <Text variant='title' size='l' color='white'>
          {strings.completionPercentage}
        </Text>
      </Flex>
      <Flex p='l'>
        <TaskCompletionList completionStages={completionStages} />
      </Flex>
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
      color='secondary'
      shouldWrapContent={false}
      className={styles.tooltip}
      disabled={isDisabled}
      mouseEnterDelay={0.1}
      shouldDismissOnClick={shouldDismissOnClick}
      text={<TooltipContent completionStages={completionStages} />}
      placement='right'
    >
      {children}
    </Tooltip>
  )
}
