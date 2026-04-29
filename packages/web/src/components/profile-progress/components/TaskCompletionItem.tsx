import { Flex, IconValidationCheck, Text } from '@audius/harmony'

import styles from './TaskCompletionItem.module.css'
import { CompletionStage } from './types'

type CompletionIconProps = {
  isCompleted: boolean
  variant: 'inverted' | 'surface'
}

const CompletionIcon = ({ isCompleted, variant }: CompletionIconProps) => {
  const isSurface = variant === 'surface'

  return (
    <div className={styles.iconWrapper}>
      {isCompleted ? (
        <IconValidationCheck
          className={
            isSurface
              ? `${styles.checkMark} ${styles.surfaceCheckMark}`
              : styles.checkMark
          }
          color={isSurface ? 'success' : undefined}
          size={isSurface ? 's' : undefined}
        />
      ) : (
        <div
          className={
            isSurface ? styles.surfaceIncompleteCircle : styles.incompleteCircle
          }
        />
      )}
    </div>
  )
}

/**
 * `TaskCompletionItem` represents a single item in a `TaskCompletionList`
 */
export const TaskCompletionItem = ({
  title,
  isCompleted,
  variant = 'inverted'
}: CompletionStage & { variant?: 'inverted' | 'surface' }) => (
  <Flex
    alignItems='center'
    gap='s'
    backgroundColor={variant === 'surface' ? 'surface2' : undefined}
    borderRadius={variant === 'surface' ? 's' : undefined}
    pv={variant === 'surface' ? 's' : undefined}
    ph={variant === 'surface' ? 'm' : undefined}
  >
    <CompletionIcon isCompleted={isCompleted} variant={variant} />
    <Text
      variant='body'
      size={variant === 'surface' ? 's' : 'm'}
      color={variant === 'surface' ? 'default' : 'staticWhite'}
      css={{
        textDecoration: isCompleted ? 'line-through' : 'none',
        opacity: isCompleted ? 0.6 : 1,
        textAlign: 'left'
      }}
    >
      {title}
    </Text>
  </Flex>
)
