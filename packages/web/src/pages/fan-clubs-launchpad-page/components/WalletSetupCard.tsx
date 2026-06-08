import { launchpadMessages } from '@audius/common/messages'
import { AUDIUS_FAN_CLUB_HELP_LINK } from '@audius/common/src/utils/route'
import { route } from '@audius/common/utils'
import { Flex, IconCheck, Paper, Text, TextLink } from '@audius/harmony'

import { TextLink as AppTextLink } from 'components/link'

import { useLaunchpadAnalytics } from '../utils'

const { walletSetup: messages } = launchpadMessages

export const WalletSetupCard = () => {
  const { trackSplashLearnMoreClicked } = useLaunchpadAnalytics()
  return (
    <Paper p='2xl' gap='xl' direction='column' w='100%'>
      <Flex direction='column' gap='s'>
        <Text variant='heading' color='default'>
          {messages.title}
        </Text>
        <Text variant='body' color='subdued'>
          {messages.subtitle}
        </Text>
      </Flex>

      <Flex
        p='l'
        gap='l'
        direction='column'
        w='100%'
        border='default'
        borderRadius='m'
      >
        <Flex alignItems='center' gap='s'>
          <Flex w='l' h='l' alignItems='center' justifyContent='center'>
            <IconCheck size='s' color='default' />
          </Flex>
          <Text variant='body' color='default' size='m'>
            {messages.installWallet}
          </Text>
        </Flex>
        <Flex alignItems='center' gap='s'>
          <Flex w='l' h='l' alignItems='center' justifyContent='center'>
            <IconCheck size='s' color='default' />
          </Flex>
          <Text variant='body' color='default' size='m'>
            {messages.haveSol}
          </Text>
        </Flex>
        <Flex alignItems='flex-start' gap='s'>
          <Flex w='l' h='l' alignItems='center' justifyContent='center'>
            <IconCheck size='s' color='default' />
          </Flex>
          <Text variant='body' color='default' size='m'>
            {messages.addAudioPrefix}
            <AppTextLink variant='visible' to={route.WALLET_AUDIO_PAGE}>
              {messages.addAudioSend}
            </AppTextLink>
            {messages.addAudioSuffix}
          </Text>
        </Flex>
      </Flex>

      <Flex alignItems='center' gap='xs'>
        <Text size='m'>{messages.newToWallets}</Text>
        <TextLink
          size='m'
          variant='active'
          href={AUDIUS_FAN_CLUB_HELP_LINK}
          onClick={trackSplashLearnMoreClicked}
        >
          {messages.learnMore}
        </TextLink>
      </Flex>
    </Paper>
  )
}
