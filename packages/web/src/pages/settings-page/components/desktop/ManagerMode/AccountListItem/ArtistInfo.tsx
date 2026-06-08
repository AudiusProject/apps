import { SquareSizes, UserMetadata } from '@audius/common/models'
import { Flex, Text, Image } from '@audius/harmony'
import cn from 'classnames'

import UserBadges from 'components/user-badges/UserBadges'
import { useProfilePicture } from 'hooks/useProfilePicture'

import styles from './ArtistInfo.module.css'

export const ArtistInfo = ({ user }: { user: UserMetadata }) => {
  const profilePicture = useProfilePicture({
    userId: user.user_id,
    size: SquareSizes.SIZE_150_BY_150
  })
  return (
    <Flex gap='m' alignItems='center' justifyContent='flex-start'>
      <Image
        className={cn(styles.profilePictureWrapper, styles.profilePicture)}
        src={profilePicture}
      />
      <Flex direction='column' gap='xs'>
        <Flex gap='xs' alignItems='center' justifyContent='flex-start'>
          <Text variant='body' size='m' strength='strong'>
            {user.name}
          </Text>
          <UserBadges userId={user.user_id} size='m' inline />
        </Flex>
        <Text variant='body' size='m'>{`@${user.handle}`}</Text>
      </Flex>
    </Flex>
  )
}
