import type { ReactNode } from 'react'
import { useCallback } from 'react'

import { getPathFromAudiusUrl } from '@audius/common/utils'
import type { NavigationAction } from '@react-navigation/native'
import { useLinkProps, useLinkTo, StackActions } from '@react-navigation/native'
import type { GestureResponderEvent } from 'react-native'

import type { GestureResponderHandler } from 'app/types/gesture'

import { TextPressable } from './TextPressable'

type NavigationTarget<ParamList extends ReactNavigation.RootParamList> = {
  screen: keyof ParamList
  params?: ParamList[keyof ParamList]
}

export type InternalLinkToProps<
  ParamList extends ReactNavigation.RootParamList
> = {
  to: NavigationTarget<ParamList>
  action?: NavigationAction
  target?: string
  onPress?: (e: GestureResponderEvent) => void
  children?: ReactNode
}

export const InternalLinkTo = <ParamList extends ReactNavigation.RootParamList>(
  props: InternalLinkToProps<ParamList>
) => {
  const { to, action, onPress, children, ...other } = props

  // Always use push action for internal navigation since we always have screen and params
  const finalAction =
    action ||
    (to && 'screen' in to
      ? StackActions.push(to.screen as string, to.params as any)
      : undefined)

  const linkPropsConfig = finalAction
    ? ({ action: finalAction } as const)
    : ({
        screen: to.screen as string,
        params: to.params
      } as const)
  const { onPress: onPressLink, ...linkProps } = useLinkProps<ParamList>(
    linkPropsConfig as any
  )

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      onPress?.(e)
      onPressLink(e)
    },
    [onPress, onPressLink]
  )

  return (
    <TextPressable onPress={handlePress} {...other} {...linkProps}>
      {children}
    </TextPressable>
  )
}

type InternalLinkProps = {
  url: string
  onPress?: (e: GestureResponderEvent) => void
  children?: ReactNode
}

export const useInternalLinkHandlePress = ({
  url,
  onPress
}: {
  url: string
  onPress?: GestureResponderHandler
}) => {
  const linkTo = useLinkTo()

  return useCallback(
    (e: GestureResponderEvent) => {
      onPress?.(e)
      const internalLink = getPathFromAudiusUrl(url)
      if (internalLink) {
        linkTo(internalLink)
      }
    },
    [onPress, url, linkTo]
  )
}

export const InternalLink = (props: InternalLinkProps) => {
  const { url, onPress, children, ...other } = props
  const handlePress = useInternalLinkHandlePress({ url, onPress })
  return (
    <TextPressable onPress={handlePress} accessibilityRole='link' {...other}>
      {children}
    </TextPressable>
  )
}
