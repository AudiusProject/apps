import {
  Text,
  IconCaretRight,
  IconButton,
  Flex,
  Box
} from '@audius/harmony-native'

const messages = {
  nowPlaying: 'NOW PLAYING'
}

type TitleBarProps = {
  onClose: () => void
}

export const TitleBar = ({ onClose }: TitleBarProps) => {
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
      <Box w={24} />
    </Flex>
  )
}
