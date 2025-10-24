import { useUser } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import type { StyleProp, TextStyle } from 'react-native'
import { Pressable } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'

import type { IconSize, TextLinkProps } from '@audius/harmony-native'
import { Flex, TextLink, useTheme } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import type { AppTabScreenParamList } from 'app/screens/app-screen'

import { UserBadges } from '../user-badges'

const AnimatedFlex = Animated.createAnimatedComponent(Flex)

type ParamList = Pick<AppTabScreenParamList, 'Profile'>

type UserLinkProps = Omit<TextLinkProps<ParamList>, 'to' | 'children'> & {
  userId: ID
  badgeSize?: IconSize
  textLinkStyle?: StyleProp<TextStyle>
  disabled?: boolean
  hideArtistCoinBadge?: boolean
}

export const UserLink = (props: UserLinkProps) => {
  const {
    userId,
    badgeSize = 's',
    style,
    textLinkStyle,
    disabled,
    hideArtistCoinBadge,
    ...other
  } = props
  const navigation = useNavigation()
  const { data: userName } = useUser(userId, {
    select: (user) => user?.name
  })

  const { motion } = useTheme()
  const animatedPressed = useSharedValue(0)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(animatedPressed.value, [0, 1], [1, 0.5])
    }
  })

  return (
    <Pressable
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) {
          animatedPressed.value = withTiming(1, motion.press)
        }
      }}
      onPressOut={() => {
        if (!disabled) {
          animatedPressed.value = withTiming(0, motion.press)
        }
      }}
      onPress={() => {
        if (disabled) return
        navigation.push('Profile', { id: userId })
      }}
    >
      <AnimatedFlex
        row
        gap='xs'
        alignItems='center'
        style={[animatedStyle, style]}
      >
        <TextLink
          to={{ screen: 'Profile', params: { id: userId } }}
          numberOfLines={1}
          flexShrink={1}
          animatedPressed={animatedPressed}
          style={textLinkStyle}
          disabled={disabled}
          {...other}
        >
          {userName}
        </TextLink>
        <UserBadges
          userId={userId}
          badgeSize={badgeSize}
          hideArtistCoinBadge={hideArtistCoinBadge}
        />
      </AnimatedFlex>
    </Pressable>
  )
}
