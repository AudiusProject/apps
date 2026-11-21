import {
  Flex,
  IconCloudUpload,
  IconComponent,
  IconHeadphones,
  IconMessage,
  Text
} from '@audius/harmony'
import { useMedia as useMediaQuery } from 'react-use'

const messages = {
  heading: 'Your Music, Your Way',
  unlimitedStreaming: 'Unlimited Streaming & Uploads',
  directMessages: 'Message & Connect With Fans',
  adFree: 'Ad-Free, Offline Listening'
}

type AudiusValueProps = { icon: IconComponent; text: string; dynamic?: boolean }

const AudiusValue = (props: AudiusValueProps) => {
  const { icon: Icon, text } = props
  const isMedium = useMediaQuery(
    '(max-width: 1363px) and (min-width: 1094px), (max-width: 860px) and (min-width: 645px)'
  )
  const isSmall = useMediaQuery(
    '(max-width: 1094px) and (min-width: 860px), (max-width: 645px)'
  )

  return (
    <Flex alignItems='center' justifyContent='center' gap='m'>
      <Icon
        color='white'
        size={isSmall ? 'l' : isMedium ? 'l' : '2xl'}
        shadow='drop'
      />
      <Text
        variant={isSmall ? 'title' : 'heading'}
        tag='h2'
        size={isSmall ? 'l' : isMedium ? 'm' : 'xl'}
        strength={isSmall ? 'weak' : 'default'}
        color='white'
        shadow='emphasis'
      >
        {text}
      </Text>
    </Flex>
  )
}

type AudiusValuesProps = {
  className?: string
}

export const AudiusValues = (props: AudiusValuesProps) => {
  const isMobile = useMediaQuery('(max-width: 860px)')

  const isMedium = useMediaQuery(
    '(max-width: 1363px) and (min-width: 1094px), (max-width: 860px) and (min-width: 645px)'
  )
  const isSmall = useMediaQuery(
    '(max-width: 1094px) and (min-width: 860px), (max-width: 645px)'
  )

  return (
    <Flex
      direction='column'
      gap={isSmall || isMedium ? 'l' : 'xl'}
      alignItems='center'
      p={isSmall || isMedium ? 'xl' : '2xl'}
      {...props}
    >
      {isMobile ? null : (
        <Text
          variant={isSmall || isMedium ? 'heading' : 'display'}
          size={isMedium ? 'xl' : 's'}
          strength='strong'
          color='white'
          shadow='emphasis'
        >
          {messages.heading}
        </Text>
      )}
      <AudiusValue icon={IconCloudUpload} text={messages.unlimitedStreaming} />
      <AudiusValue icon={IconMessage} text={messages.directMessages} />
      <AudiusValue icon={IconHeadphones} text={messages.adFree} />
    </Flex>
  )
}
