import { AUDIUS_ARTIST_COINS_HELP_LINK } from '@audius/common/src/utils/route'
import { Flex, IconCheck, Paper, Text, TextLink } from '@audius/harmony'

import { useLaunchpadAnalytics } from '../utils'

const messages = {
  title: 'How to Get Ready',
  subtitle: 'Go through this checklist to prepare for launch.',
  requirements: [
    {
      id: 'install-wallet',
      text: 'Install your wallet (Phantom, MetaMask, etc.) on this browser & device.'
    },
    {
      id: 'have-sol',
      text: 'Have a little SOL (~.03) ready to cover setup costs.'
    },
    {
      id: 'add-funds',
      text: 'Add funds to your wallet if you plan to buy your Artist Coin early.'
    }
  ],
  newtoWallets: 'New to wallets?',
  learnMore: 'Learn more'
}

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
        {messages.requirements.map((requirement) => (
          <Flex key={requirement.id} alignItems='center' gap='s'>
            <Flex w='l' h='l' alignItems='center' justifyContent='center'>
              <IconCheck size='s' color='default' />
            </Flex>
            <Text variant='body' color='default' size='m'>
              {requirement.text}
            </Text>
          </Flex>
        ))}
      </Flex>

      <Flex alignItems='center' gap='xs'>
        <Text size='m'>{messages.newtoWallets}</Text>
        <TextLink
          size='m'
          variant='active'
          href={AUDIUS_ARTIST_COINS_HELP_LINK}
          onClick={trackSplashLearnMoreClicked}
        >
          {messages.learnMore}
        </TextLink>
      </Flex>
    </Paper>
  )
}
