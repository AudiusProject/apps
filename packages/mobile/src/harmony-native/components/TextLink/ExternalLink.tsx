import { useCallback } from 'react'

import { useLeavingAudiusModal } from '@audius/common/store'
import { isAllowedExternalLink } from '@audius/common/utils'
import type {
  GestureResponderEvent,
  TouchableWithoutFeedbackProps
} from 'react-native'
import { Linking } from 'react-native'

import { useToast } from 'app/hooks/useToast'
import type { GestureResponderHandler } from 'app/types/gesture'

import { TextPressable } from './TextPressable'
import type { Source } from './types'

const messages = {
  error: 'Unable to open this URL'
}

export type ExternalLinkProps = TouchableWithoutFeedbackProps & {
  url: string
  source?: Source
}

export const useExternalLinkHandlePress = ({
  url,
  onPress
}: {
  url: string
  onPress?: GestureResponderHandler
}) => {
  const { toast } = useToast()
  const { onOpen: openLeavingAudiusModal } = useLeavingAudiusModal()
  return useCallback(
    async (e: GestureResponderEvent) => {
      const errorToastConfig = {
        content: messages.error,
        type: 'error' as const
      }

      onPress?.(e)

      try {
        // Ensure URL has a protocol for Linking.openURL
        const urlWithProtocol =
          url.startsWith('http://') || url.startsWith('https://')
            ? url
            : `https://${url}`

        const supported = await Linking.canOpenURL(urlWithProtocol)
        if (supported) {
          if (isAllowedExternalLink(url)) {
            await Linking.openURL(urlWithProtocol)
          } else {
            openLeavingAudiusModal({ link: url })
          }
        } else {
          toast(errorToastConfig)
        }
      } catch (error) {
        toast(errorToastConfig)
      }
    },
    [onPress, openLeavingAudiusModal, toast, url]
  )
}

export const ExternalLink = (props: ExternalLinkProps) => {
  const { url, children, onPress, ...other } = props
  const handlePress = useExternalLinkHandlePress({ url, onPress })

  return (
    <TextPressable onPress={handlePress} {...other}>
      {children}
    </TextPressable>
  )
}
