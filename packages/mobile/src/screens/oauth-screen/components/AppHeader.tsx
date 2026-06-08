import { Image } from 'react-native'

import {
  Flex,
  IconEmbed,
  IconTransaction,
  Text,
  useTheme
} from '@audius/harmony-native'

import { messages } from '../messages'

type AppHeaderProps = {
  appName: string | undefined
  appImageUri?: string
}

export const AppHeader = ({ appName, appImageUri }: AppHeaderProps) => {
  const { spacing } = useTheme()

  return (
    <Flex alignItems='center' direction='column' gap='l'>
      <Flex
        direction='row'
        gap='l'
        alignItems='center'
        justifyContent='center'
        w='100%'
      >
        <Flex w={64} h={64} borderRadius='m' style={{ overflow: 'hidden' }}>
          <Image
            source={require('../../../assets/images/appIcon.png')}
            style={{ width: 64, height: 64 }}
            resizeMode='cover'
          />
        </Flex>
        <IconTransaction color='default' />
        {appImageUri ? (
          <Image
            source={{ uri: appImageUri }}
            style={{ width: 64, height: 64, borderRadius: spacing.m }}
          />
        ) : (
          <Flex
            w={64}
            h={64}
            borderRadius='m'
            backgroundColor='surface2'
            alignItems='center'
            justifyContent='center'
          >
            <IconEmbed color='subdued' width={32} height={32} />
          </Flex>
        )}
      </Flex>
      <Flex direction='column' gap='s' alignItems='center'>
        <Text variant='body' size='l' color='default'>
          {messages.allow}:
        </Text>
        <Text variant='heading' size='s' color='default'>
          {appName}
        </Text>
      </Flex>
    </Flex>
  )
}
