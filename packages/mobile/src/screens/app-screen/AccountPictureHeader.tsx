import { useCurrentUserId } from '@audius/common/api'
import {
  useAccountHasClaimableRewards,
  useRemoteVar
} from '@audius/common/hooks'
import { StringKeys } from '@audius/common/services'
import { chatSelectors } from '@audius/common/store'
import { useDrawerProgress } from '@react-navigation/drawer'
import type { StyleProp, ViewStyle } from 'react-native'
import { View } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import Animated, {
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import { useSelector } from 'react-redux'

import { ProfilePicture } from 'app/components/core'
import { makeStyles } from 'app/styles'

const { getHasUnreadMessages } = chatSelectors

const useStyles = makeStyles(({ spacing, palette }) => ({
  root: {
    height: spacing(8) + 2,
    width: spacing(8) + 2
  },
  notificationBubbleRoot: {
    height: spacing(4),
    width: spacing(4),
    borderColor: palette.white,
    borderWidth: 2,
    borderRadius: 10,
    position: 'absolute',
    top: 0,
    right: 0
  },
  notificationBubble: {
    flex: 1,
    backgroundColor: palette.secondary,
    overflow: 'hidden',
    borderRadius: 10
  }
}))

type AccountPictureHeaderProps = {
  onPress: () => void
  style?: StyleProp<ViewStyle>
}

export const AccountPictureHeader = (props: AccountPictureHeaderProps) => {
  const { onPress, style } = props
  const drawerProgress = useDrawerProgress() as SharedValue<number>
  const styles = useStyles()
  const { data: accountId } = useCurrentUserId()
  const challengeRewardIds = useRemoteVar(StringKeys.CHALLENGE_REWARD_IDS)
  const hasClaimableRewards = useAccountHasClaimableRewards(challengeRewardIds)
  const hasUnreadMessages = useSelector(getHasUnreadMessages)
  const showNotificationBubble = hasClaimableRewards || hasUnreadMessages

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drawerProgress.value, [0, 1], [1, 0])
  }))

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity onPress={onPress}>
        <ProfilePicture
          userId={accountId}
          style={styles.root}
          borderWidth='thin'
        />
        {showNotificationBubble ? (
          <View style={styles.notificationBubbleRoot}>
            <View style={styles.notificationBubble} />
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  )
}
