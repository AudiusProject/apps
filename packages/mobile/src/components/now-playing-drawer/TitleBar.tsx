import { useCallback } from 'react'

import {
  Text,
  IconCaretRight,
  IconButton,
  IconIndent,
  Flex
} from '@audius/harmony-native'
import { useDrawer } from 'app/hooks/useDrawer'

const messages = {
  nowPlaying: 'NOW PLAYING',
  queue: 'Queue'
}

type TitleBarProps = {
  onClose: () => void
}

export const TitleBar = ({ onClose }: TitleBarProps) => {
  const { onOpen: openQueue } = useDrawer('Queue')

  const handleOpenQueue = useCallback(() => {
    openQueue()
  }, [openQueue])

  return (
    <Flex row alignItems='center' justifyContent='space-between' ph='l' pt='l'>
      <IconButton
        icon={IconCaretRight}
        onPress={onClose}
        iconStyle={{ transform: [{ rotate: '90deg' }] }}
      />
      <Text variant='label' size='xl' strength='strong' color='subdued'>
        {messages.nowPlaying}
      </Text>
      <IconButton
        icon={IconIndent}
        onPress={handleOpenQueue}
        aria-label={messages.queue}
      />
    </Flex>
  )
}
