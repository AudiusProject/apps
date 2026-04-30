import { Flex, useTheme } from '@audius/harmony'

import { TaskCompletionItem } from './TaskCompletionItem'
import { CompletionStages } from './types'

const sortIncompleteFirst = (list: CompletionStages) => {
  const incomplete = list.filter((e) => !e.isCompleted)
  const complete = list.filter((e) => e.isCompleted)
  return incomplete.concat(complete)
}

type TaskCompletionListProps = {
  completionStages: CompletionStages
  variant?: 'inverted' | 'surface'
}

/**
 * `TaskCompletionList` renders a list of `TaskCompletionItems`.
 * It's used to power the lists inside of `ProfileCompletionTooltip`
 * and `ProfileCompletionHeroCard`.
 */
export const TaskCompletionList = ({
  completionStages,
  variant = 'inverted'
}: TaskCompletionListProps) => {
  const { color } = useTheme()

  return (
    <Flex
      column
      gap='s'
      wrap='wrap'
      css={{
        backgroundColor:
          variant === 'surface' ? 'transparent' : color.secondary.s300,
        width: '100%'
      }}
    >
      {sortIncompleteFirst(completionStages).map((e) => (
        <TaskCompletionItem
          title={e.title}
          isCompleted={e.isCompleted}
          variant={variant}
          key={e.title}
        />
      ))}
    </Flex>
  )
}
