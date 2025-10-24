import type { User } from '@audius/common/models'
import type { StyleProp, ViewStyle } from 'react-native'
import { View } from 'react-native'

import { makeStyles } from 'app/styles'

import { NotificationProfilePicture } from './NotificationProfilePicture'

const USER_LENGTH_LIMIT = 9
const BASE_ZINDEX = 1

const useStyles = makeStyles(({ spacing }) => ({
  root: {
    flexDirection: 'row'
  },
  image: {
    marginRight: spacing(-2)
  }
}))

type ProfilePictureListProps = {
  users: User[]
  totalUserCount?: number
  limit?: number
  showOverflowCount?: boolean
  style?: StyleProp<ViewStyle>
  navigationType?: 'push' | 'navigate'
  interactive?: boolean
  imageStyles?: {
    width?: number
    height?: number
  }
}

export const ProfilePictureList = (props: ProfilePictureListProps) => {
  const {
    users,
    totalUserCount = users.length,
    limit = USER_LENGTH_LIMIT,
    showOverflowCount = true,
    style,
    navigationType,
    interactive,
    imageStyles
  } = props

  const styles = useStyles()
  const showUserListDrawer = showOverflowCount && totalUserCount > limit

  return (
    <View style={[styles.root, style]}>
      {users
        .filter((u) => !u.is_deactivated)
        .slice(0, limit)
        .map((user, idx) => (
          <NotificationProfilePicture
            profile={user}
            key={user.user_id}
            style={[
              styles.image,
              imageStyles,
              !showUserListDrawer && {
                zIndex: BASE_ZINDEX + users.length - idx
              }
            ]}
            navigationType={navigationType}
            interactive={interactive}
          />
        ))}
    </View>
  )
}
