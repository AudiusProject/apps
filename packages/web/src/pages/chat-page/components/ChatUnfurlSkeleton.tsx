import cn from 'classnames'

import Skeleton from 'components/skeleton/Skeleton'

import styles from './ChatUnfurlSkeleton.module.css'

type ChatUnfurlSkeletonProps = {
  className?: string
}

export const ChatUnfurlSkeleton = ({ className }: ChatUnfurlSkeletonProps) => {
  return (
    <div className={cn(styles.root, className)}>
      <div className={styles.metadata}>
        <Skeleton className={styles.artwork} />
        <div className={styles.text}>
          <Skeleton className={styles.title} />
          <Skeleton className={styles.subtitle} />
        </div>
      </div>
      <Skeleton className={styles.stats} />
    </div>
  )
}
