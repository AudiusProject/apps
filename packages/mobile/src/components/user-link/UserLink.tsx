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
import type { AppTabScreenParamList } from 'app/screens/app-screen'

import { UserBadges } from '../user-badges'

const AnimatedFlex = Animated.createAnimatedComponent(Flex)

type ParamList = Pick<AppTabScreenParamList, 'Profile'>

type UserLinkProps = Omit<TextLinkProps<ParamList>, 'to' | 'children'> & {
  userId: ID
  badgeSize?: IconSize
  textLinkStyle?: StyleProp<TextStyle>
  disabled?: boolean
  hideBadges?: boolean
  hideFanClubBadge?: boolean
  mint?: string
}

export const UserLink = (props: UserLinkProps) => {
  const {
    userId,
    badgeSize = 's',
    style,
    textLinkStyle,
    disabled,
    hideBadges,
    hideFanClubBadge,
    mint,
    ...other
  } = props
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

  // The outer Pressable used to also dispatch `navigation.push('Profile')`,
  // which fired in addition to the inner TextLink's own push. On iOS the
  // tap reached both responders, so a single tap in the contest "Hosted by"
  // row would push two Profile screens — the second one landing back over
  // the contest as the user backed out. Drop the duplicate navigation here
  // and let TextLink (which has proper Link semantics + a11y) own the push.
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) {
          animatedPressed.value = withTiming(1, motion.press)
        }
      }}
      onPressOut={() => {
        if (!disabled) {
          animatedPressed.value = withTiming(0, motion.press)
        }
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
        {hideBadges ? null : (
          <UserBadges
            userId={userId}
            badgeSize={badgeSize}
            mint={mint}
            hideFanClubBadge={hideFanClubBadge}
          />
        )}
      </AnimatedFlex>
    </Pressable>
  )
}
