import type { FlexProps } from '@audius/harmony-native'
import { Flex, IconQuestionCircle, TextLink } from '@audius/harmony-native'

export const WALLET_GUIDE_URL = 'https://help.audius.co/product/wallet-guide'

const messages = {
  needHelp: 'Need help?'
}

export const WalletHelpLink = (props: FlexProps) => (
  <Flex row justifyContent='center' alignItems='center' gap='xs' {...props}>
    <IconQuestionCircle size='s' color='subdued' />
    <TextLink url={WALLET_GUIDE_URL} variant='subdued' size='s'>
      {messages.needHelp}
    </TextLink>
  </Flex>
)
