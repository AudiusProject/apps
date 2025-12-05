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
    /**
     * Which variant to display. 'active' is temporary until this pattern is removed
     */
    variant?: 'default' | 'subdued' | 'visible' | 'inverted' | 'active'

    /**
     * Which text variant to display.
     */
    textVariant?: TextProps['variant']

    /**
     * When true, always show the link underline. This can help emphasize that
     * a text-link is present when next to other text.
     */
    showUnderline?: boolean

    /**
     * Force the link to be treated as external, opening in the device's browser.
     * Useful for internal URLs that should still open externally (e.g., terms of use).
     */
    isExternal?: boolean

    source?: Source

    /**
     * Optional shared value to animate the pressed state of the text link
     */
    animatedPressed?: SharedValue<number>
  }

// Type guard for InternalLinkToProps
export function isInternalLinkToProps<
  ParamList extends ReactNavigation.RootParamList
>(props: TextLinkProps<ParamList>): props is InternalLinkToProps<ParamList> {
  return 'to' in props
}

// Type guard for ExternalLinkProps
export function isExternalLinkProps<
  ParamList extends ReactNavigation.RootParamList
>(props: TextLinkProps<ParamList>): props is ExternalLinkProps {
  return 'url' in props
}

// Type guard for NonLinkProps
export function isNonLinkProps<ParamList extends ReactNavigation.RootParamList>(
  props: TextLinkProps<ParamList>
): props is NonLinkProps {
  return 'onPress' in props
}
