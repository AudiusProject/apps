import { CoinInfo } from '@audius/common/store'
import { Divider, Flex, Text } from '@audius/harmony'

import { TokenIcon } from './TokenIcon'

const messages = {
  symbol: (symbol: string) => `$${symbol}`
}

type CryptoBalanceSectionProps = {
  title?: string
  tokenInfo: CoinInfo
  name?: string
  amount: string
  priceLabel?: string
}

export const CryptoBalanceSection = ({
  title,
  tokenInfo,
  name,
  amount,
  priceLabel
}: CryptoBalanceSectionProps) => {
  return (
    <Flex direction='column' gap='l'>
      {title ? (
        <Flex alignItems='center' gap='m'>
          <Text variant='title' size='l'>
            {title}
          </Text>
          <Divider css={{ flexGrow: 1 }} />
        </Flex>
      ) : null}
      <Flex alignItems='center' gap='s'>
        <TokenIcon
          logoURI={tokenInfo.logoURI}
          icon={tokenInfo.icon}
          w='4xl'
          h='4xl'
          hex
        />
        <Flex direction='column' gap='xs'>
          {name ? (
            <Text variant='heading' size='s'>
              {name}
            </Text>
          ) : null}
          <Flex direction='column'>
            <Flex gap='xs' alignItems='center'>
              <Text variant='title' size='l'>
                {amount}
              </Text>
              <Text variant='title' size='l' color='subdued'>
                {messages.symbol(tokenInfo.symbol)}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}
