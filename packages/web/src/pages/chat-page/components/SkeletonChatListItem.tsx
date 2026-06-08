import cn from 'classnames'

import Skeleton from 'components/skeleton/Skeleton'

import styles from './SkeletonChatListItem.module.css'

export const SkeletonChatListItem = ({
  style,
  isCompact
}: {
  style?: React.CSSProperties
  isCompact?: boolean
}) => {
  return (
    <div
      className={cn(styles.root, { [styles.compact]: isCompact })}
      style={style}
    >
      <div className={styles.user}>
        <Skeleton className={styles.profilePic} />
        <div className={styles.profile}>
          <Skeleton className={styles.name} />
          <Skeleton className={styles.handle} />
        </div>
      </div>
      <Skeleton className={styles.message} />
    </div>
  )
}
