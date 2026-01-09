import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

import type { IconComponent } from '@audius/harmony-native'
import {
  Flex,
  Text,
  IconCloudUpload,
  IconHeadphones,
  IconMessage,
  useTheme
} from '@audius/harmony-native'

import { PANEL_EXPAND_DURATION } from '../constants'

const AnimatedFlex = Animated.createAnimatedComponent(Flex)

const messages = {
  heading: 'Your Music, Your Way',
  unlimitedStreaming: 'Unlimited Streaming & Uploads',
  directMessages: 'Message & Connect With Fans',
  adFree: 'Ad-Free, Offline Listening'
}

type AudiusValueProps = { icon: IconComponent; text: string }

/**
 * Each individual audius value text + icon row
 */
const AudiusValue = (props: AudiusValueProps) => {
  const { icon: Icon, text } = props
  const theme = useTheme()
  return (
    <Flex alignItems='center' justifyContent='center' gap='m' direction='row'>
      <Icon color='inverse' size='l' shadow='emphasis' />
      <Text
        variant='title'
        size='l'
        strength='weak'
        color={theme.type === 'dark' ? 'inverse' : 'white'}
        shadow='emphasis'
      >
        {text}
      </Text>
    </Flex>
  )
}

type AudiusValuesProps = {
  isPanelExpanded?: boolean
}

/**
 * Renders all the audius values
 */
export const AudiusValues = (props: AudiusValuesProps) => {
  const { isPanelExpanded } = props

  return (
    <AnimatedFlex
      direction='column'
      gap='l'
      alignItems='center'
      justifyContent='center'
      style={{ flexGrow: 1 }}
      entering={FadeIn.delay(isPanelExpanded ? 0 : PANEL_EXPAND_DURATION)}
      exiting={FadeOut}
    >
      <AudiusValue icon={IconCloudUpload} text={messages.unlimitedStreaming} />
      <AudiusValue icon={IconMessage} text={messages.directMessages} />
      <AudiusValue icon={IconHeadphones} text={messages.adFree} />
    </AnimatedFlex>
  )
}
