import { useCallback } from 'react'

import type { GestureResponderEvent, PressableProps } from 'react-native'
import { Linking, Pressable } from 'react-native'

import { useToast } from 'app/hooks/useToast'
import type { make } from 'app/services/analytics'
import { track } from 'app/services/analytics'

const messages = {
  error: 'Unable to open this URL'
}

export const useOnOpenLink = () => {
  const { toast } = useToast()

  const handlePress = useCallback(
    async (url: string) => {
      const errorToastConfig = {
        content: messages.error,
        type: 'error' as const
      }

      try {
        const urlWithPrefix = url.startsWith('http') ? url : `https://${url}`
        const supported = await Linking.canOpenURL(urlWithPrefix)
        if (supported) {
          await Linking.openURL(urlWithPrefix)
        } else {
          toast(errorToastConfig)
        }
      } catch (error) {
        toast(errorToastConfig)
      }
    },
    [toast]
  )

  return handlePress
}

export const useLink = (url: string) => {
  const onPressLink = useOnOpenLink()

  const handlePress = useCallback(() => {
    return onPressLink(url)
  }, [url, onPressLink])

  return { onPress: handlePress }
}

export type LinkProps = PressableProps & {
  url: string
  analytics?: ReturnType<typeof make>
}

export const Link = (props: LinkProps) => {
  const { url, onPress, analytics, ...other } = props
  const { onPress: onPressLink } = useLink(url)

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      onPress?.(event)
      onPressLink()
      if (analytics) {
        track(analytics)
      }
    },
    [onPress, onPressLink, analytics]
  )

  return <Pressable onPress={handlePress} {...other} />
}
