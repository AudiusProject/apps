import { useCallback } from 'react'

import Clipboard from '@react-native-clipboard/clipboard'
import { TouchableOpacity } from 'react-native'

import {
  Text,
  IconCopy,
  Flex,
  spacing,
  IconButton
} from '@audius/harmony-native'
import { useToast } from 'app/hooks/useToast'
import { make, track as trackEvent } from 'app/services/analytics'
import type { AllEvents } from 'app/types/analytics'

const messages = {
  copied: 'Copied to Clipboard!'
}

type AddressTileProps = {
  address?: string
  analytics?: AllEvents
}

export const AddressTile = ({ address, analytics }: AddressTileProps) => {
  const { toast } = useToast()

  const handleCopyPress = useCallback(() => {
    if (address) {
      Clipboard.setString(address)
      toast({ content: messages.copied, type: 'info' })
      if (analytics) trackEvent(make(analytics))
    }
  }, [address, analytics, toast])

  return (
    <Flex row border='default' borderRadius='s' backgroundColor='surface1'>
      <Flex pv='l' ph='xl' flex={1}>
        <Text variant='body' numberOfLines={1} ellipsizeMode='middle'>
          {address}
        </Text>
      </Flex>
      <Flex
        alignItems='center'
        justifyContent='center'
        ph='xl'
        pv='l'
        borderLeft='default'
      >
        <IconButton
          onPress={handleCopyPress}
          size='s'
          color='subdued'
          icon={IconCopy}
        />
      </Flex>
    </Flex>
  )
}
