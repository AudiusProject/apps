import type { ID } from '@audius/common/models'
import type { NavigationAction, ParamListBase } from '@react-navigation/native'
import type { GestureResponderEvent } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'

import type { TextProps } from '../Text/Text'

export type Source = 'profile page' | 'track page' | 'collection page'
export type LinkKind = 'track' | 'collection' | 'user' | 'mention' | 'other'

type NavigationTarget<ParamList extends ReactNavigation.RootParamList> = {
  screen: keyof ParamList
  params?: ParamList[keyof ParamList]
}

export type InternalLinkToProps<
  ParamList extends ReactNavigation.RootParamList
> = {
  to: NavigationTarget<ParamList>
  action?: NavigationAction
  onPress?: (
    e: GestureResponderEvent,
    linkKind?: LinkKind,
    linkEntityId?: ID
  ) => void
}

export type ExternalLinkProps = {
  url: string
  onPress?: (
    e: GestureResponderEvent,
    linkKind?: LinkKind,
    linkEntityId?: ID
  ) => void
  source?: Source
}

export type NonLinkProps = {
  onPress: (e: GestureResponderEvent) => void
}

export type TextLinkProps<
  ParamList extends ReactNavigation.RootParamList = ParamListBase
> = (InternalLinkToProps<ParamList> | ExternalLinkProps | NonLinkProps) &
  Omit<TextProps, 'variant' | 'onPress'> & {
    variant?: 'default' | 'subdued' | 'visible' | 'inverted' | 'active'

    textVariant?: TextProps['variant']

    showUnderline?: boolean

    isExternal?: boolean

    source?: Source

    animatedPressed?: SharedValue<number>
  }

export function isInternalLinkToProps<
  ParamList extends ReactNavigation.RootParamList
>(props: TextLinkProps<ParamList>): props is InternalLinkToProps<ParamList> {
  return 'to' in props
}

export function isExternalLinkProps<
  ParamList extends ReactNavigation.RootParamList
>(props: TextLinkProps<ParamList>): props is ExternalLinkProps {
  return 'url' in props
}

export function isNonLinkProps<ParamList extends ReactNavigation.RootParamList>(
  props: TextLinkProps<ParamList>
): props is NonLinkProps {
  return 'onPress' in props
}
