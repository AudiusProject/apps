import type { NavigationAction } from '@react-navigation/native'
import { Link as NavigationLink } from '@react-navigation/native'
import type { GestureResponderEvent } from 'react-native'

import type { TextProps } from 'app/components/core'
import { Text } from 'app/components/core'
import type { AppTabScreenParamList } from 'app/screens/app-screen'

type NavigationTarget<ParamList extends ReactNavigation.RootParamList> = {
  screen: keyof ParamList
  params?: ParamList[keyof ParamList]
}

type LinkProps<ParamList extends ReactNavigation.RootParamList> = {
  to: NavigationTarget<ParamList>
  action?: NavigationAction
  target?: string
  onPress?: (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent> | GestureResponderEvent
  ) => void
} & TextProps

export const Link = <
  ParamList extends ReactNavigation.RootParamList = AppTabScreenParamList
>(
  props: LinkProps<ParamList>
) => {
  const { to, action, target, onPress, ...textProps } = props
  const linkProps = action
    ? { action, screen: undefined, params: undefined }
    : { screen: to.screen as string, params: to.params, action: undefined }
  return (
    <NavigationLink<ParamList>
      {...(linkProps as any)}
      target={target}
      onPress={onPress}
      role='link'
    >
      <Text {...textProps} />
    </NavigationLink>
  )
}
