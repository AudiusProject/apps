import { useCallback } from 'react'

import type { ID, User } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { formatCount } from '@audius/common/utils'

import type { ImageProps } from '@audius/harmony-native'
import { Card } from 'app/components/card'
import type { ProfileCardProps as BaseProfileCardProps } from 'app/components/card'
import { UserImage } from 'app/components/image/UserImage'
import { useNavigation } from 'app/hooks/useNavigation'

const formatProfileCardSecondaryText = (followers: number) => {
  const followersText = followers === 1 ? 'Follower' : 'Followers'
  return `${formatCount(followers)} ${followersText}`
}

type ProfileCardProps = Partial<Omit<BaseProfileCardProps, 'onPress'>> & {
  profile: User
  preventNavigation?: boolean
  onPress?: (id: ID) => void
}

// @deprecated -- use UserCard instead
export const ProfileCard = (props: ProfileCardProps) => {
  const { profile, preventNavigation, onPress, ...other } = props
  const { user_id, handle } = profile
  const navigation = useNavigation()

  const handlePress = useCallback(() => {
    if (!preventNavigation) {
      navigation.push('Profile', { handle })
    }
    onPress?.(user_id)
  }, [navigation, handle, onPress, user_id, preventNavigation])

  const renderImage = useCallback(
    (props: ImageProps) => (
      <UserImage
        userId={user_id}
        size={SquareSizes.SIZE_480_BY_480}
        {...props}
      />
    ),
    [user_id]
  )

  return (
    <Card
      renderImage={renderImage}
      primaryText={profile.name}
      secondaryText={formatProfileCardSecondaryText(profile.follower_count)}
      onPress={handlePress}
      type='user'
      user={profile}
      {...other}
    />
  )
}
