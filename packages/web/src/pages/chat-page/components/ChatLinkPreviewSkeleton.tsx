import cn from 'classnames'

import Skeleton from 'components/skeleton/Skeleton'

import styles from './ChatLinkPreviewSkeleton.module.css'

type ChatLinkPreviewSkeletonProps = {
  className?: string
}

export const ChatLinkPreviewSkeleton = ({
  className
}: ChatLinkPreviewSkeletonProps) => {
  return (
    <div className={cn(styles.root, className)}>
      <Skeleton className={styles.thumbnail} />
      <Skeleton className={styles.domain} />
      <div className={styles.text}>
        <Skeleton className={styles.title} />
        <Skeleton className={styles.description} />
      </div>
    </div>
  )
}
