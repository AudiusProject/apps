import { useCurrentUserId } from '@audius/common/api'
import { useDrawerProgress } from '@react-navigation/drawer'
import type { StyleProp, ViewStyle } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import Animated, {
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'

import { ProfilePicture } from 'app/components/core'
import { makeStyles } from 'app/styles'

const useStyles = makeStyles(({ spacing }) => ({
  root: {
    height: spacing(8) + 2,
    width: spacing(8) + 2
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
      </TouchableOpacity>
    </Animated.View>
  )
}
