import { useCurrentUserId } from '@audius/common/api'
import { useIsManagedAccount } from '@audius/common/hooks'
import { useDrawerProgress } from '@react-navigation/drawer'
import type { StyleProp, ViewStyle } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import Animated, {
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'

import { useTheme } from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import { makeStyles } from 'app/styles'

const useStyles = makeStyles(({ spacing }) => ({
  root: {
    height: spacing(8) + 2,
    width: spacing(8) + 2
  },
  managedRing: {
    borderWidth: 2,
    borderRadius: spacing(8),
    padding: 1
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
  const isManagedAccount = useIsManagedAccount()
  const { color } = useTheme()

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drawerProgress.value, [0, 1], [1, 0])
  }))

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        onPress={onPress}
        style={
          isManagedAccount
            ? [styles.managedRing, { borderColor: color.background.accent }]
            : undefined
        }
      >
        <ProfilePicture
          userId={accountId}
          style={styles.root}
          borderWidth='thin'
        />
      </TouchableOpacity>
    </Animated.View>
  )
}
