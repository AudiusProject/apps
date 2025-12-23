import { ComponentPropsWithoutRef } from 'react'

import { useUser } from '@audius/common/api'
import { SquareSizes, ID } from '@audius/common/models'
import cn from 'classnames'
import { pick } from 'lodash'

import { ArtistPopover } from 'components/artist/ArtistPopover'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import Skeleton from 'components/skeleton/Skeleton'
import { MountPlacement } from 'components/types'
import UserBadges from 'components/user-badges/UserBadges'
import { useProfilePicture } from 'hooks/useProfilePicture'

import styles from './ArtistChip.module.css'
import { ArtistChipFollowers } from './ArtistChipFollowers'
import { ArtistChipSupportFor } from './ArtistChipSupportFor'
import { ArtistChipSupportFrom } from './ArtistChipSupportFrom'

type ArtistIdentifierProps = {
  userId: ID
  name: string
  handle: string
  showPopover: boolean
  popoverMount?: MountPlacement
  onNavigateAway?: () => void
} & ComponentPropsWithoutRef<'div'>
const ArtistIdentifier = ({
  userId,
  name,
  handle,
  showPopover,
  popoverMount,
  onNavigateAway
}: ArtistIdentifierProps) => {
  return showPopover ? (
    <div css={{ overflow: 'hidden' }}>
      <div className={styles.name}>
        <ArtistPopover
          handle={handle}
          mouseEnterDelay={0.3}
          onNavigateAway={onNavigateAway}
        >
          <p>{name}</p>
        </ArtistPopover>
        <span>
          <UserBadges userId={userId} className={cn(styles.badge)} inline />
        </span>
      </div>
      <ArtistPopover
        handle={handle}
        mouseEnterDelay={0.3}
        onNavigateAway={onNavigateAway}
      >
        <div className={styles.handle}>@{handle}</div>
      </ArtistPopover>
    </div>
  ) : (
    <div css={{ overflow: 'hidden' }}>
      <div className={styles.name}>
        <p>{name}</p>
        <UserBadges userId={userId} className={cn(styles.badge)} inline />
      </div>
      <div className={styles.handle}>@{handle}</div>
    </div>
  )
}

export type ArtistChipProps = {
  userId: ID
  onClickArtistName?: () => void
  showPopover?: boolean
  showFollowsYou?: boolean
  showSupportFor?: ID
  showSupportFrom?: ID
  className?: string
  popoverMount?: MountPlacement
  customChips?: React.ReactNode
  onNavigateAway?: () => void
}

const ArtistChip = ({
  userId,
  onClickArtistName,
  showPopover = true,
  showFollowsYou = true,
  showSupportFor,
  showSupportFrom,
  className = '',
  popoverMount = MountPlacement.PAGE,
  customChips = null,
  onNavigateAway
}: ArtistChipProps) => {
  const { data: user, isPending } = useUser(userId, {
    select: (user) => pick(user, ['name', 'handle', 'follower_count'])
  })

  const profilePicture = useProfilePicture({
    userId,
    size: SquareSizes.SIZE_150_BY_150
  })

  // Show skeleton while user data is loading
  if (isPending || !user) {
    return (
      <div
        className={cn(styles.artistChip, {
          [className]: !!className
        })}
      >
        <Skeleton
          className={cn(styles.profilePicture, styles.profilePictureSkeleton)}
          width='72px'
          height='72px'
        />
        <div className={styles.text}>
          <div className={styles.identity}>
            <Skeleton width='120px' height='20px' className={styles.name} />
            <Skeleton width='80px' height='16px' className={styles.handle} />
          </div>
          {customChips || <Skeleton width='100px' height='16px' />}
        </div>
      </div>
    )
  }

  const { name, handle, follower_count } = user

  return (
    <div
      className={cn(styles.artistChip, {
        [className]: !!className
      })}
      onClick={onClickArtistName}
    >
      {showPopover ? (
        <ArtistPopover
          handle={handle}
          mouseEnterDelay={0.3}
          onNavigateAway={onNavigateAway}
        >
          <DynamicImage
            wrapperClassName={styles.profilePictureWrapper}
            skeletonClassName={styles.profilePictureSkeleton}
            className={cn(styles.profilePicture, {
              [styles.clickable]: onClickArtistName != null
            })}
            image={profilePicture}
          />
        </ArtistPopover>
      ) : (
        <DynamicImage
          wrapperClassName={styles.profilePictureWrapper}
          skeletonClassName={styles.profilePictureSkeleton}
          className={cn(styles.profilePicture, {
            [styles.clickable]: onClickArtistName != null
          })}
          image={profilePicture}
        />
      )}
      <div className={styles.text}>
        <div
          className={cn(styles.identity, 'name', {
            [styles.clickable]: onClickArtistName != null
          })}
        >
          <ArtistIdentifier
            userId={userId}
            name={name}
            handle={handle}
            showPopover={showPopover}
            popoverMount={popoverMount}
            onNavigateAway={onNavigateAway}
          />
        </div>
        {customChips || (
          <>
            <ArtistChipFollowers
              showFollowsYou={showFollowsYou}
              userId={userId}
              followerCount={follower_count}
            />
            {showSupportFor ? (
              <ArtistChipSupportFor artistId={userId} userId={showSupportFor} />
            ) : null}
            {showSupportFrom ? (
              <ArtistChipSupportFrom
                artistId={userId}
                userId={showSupportFrom}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export default ArtistChip
