import { SquareSizes, User } from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import { Image } from '@audius/harmony'
import cn from 'classnames'

import UserBadges from 'components/user-badges/UserBadges'
import { useProfilePicture } from 'hooks/useProfilePicture'

import styles from './ProfileInfo.module.css'

type ProfileInfoProps = {
  user: Nullable<User> | undefined
  className?: string
  imgClassName?: string
  centered?: boolean
  displayNameClassName?: string
  handleClassName?: string
}
export const ProfileInfo = ({
  user,
  className = '',
  imgClassName = '',
  centered = true,
  displayNameClassName,
  handleClassName
}: ProfileInfoProps) => {
  const image = useProfilePicture({
    userId: user?.user_id,
    size: SquareSizes.SIZE_150_BY_150
  })

  return user ? (
    <div className={cn(styles.receiver, className)}>
      <div
        className={cn(styles.accountWrapper, {
          [styles.accountWrapperLeftAlign]: !centered
        })}
      >
        <Image
          h='78px'
          w='78px'
          className={cn(styles.dynamicPhoto, imgClassName)}
          src={image}
          alt={user.name}
        />
        <div className={styles.userInfoWrapper}>
          <div className={cn(styles.name, displayNameClassName)}>
            {user.name}
            <UserBadges userId={user?.user_id} className={styles.badge} />
          </div>
          <div className={styles.handleContainer}>
            <span
              className={cn(styles.handle, handleClassName)}
            >{`@${user.handle}`}</span>
          </div>
        </div>
      </div>
    </div>
  ) : null
}
