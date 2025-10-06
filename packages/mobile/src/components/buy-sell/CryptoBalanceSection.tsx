import { type TokenInfo } from '@audius/common/store'
import { Image } from 'react-native'

import { Flex, HexagonalIcon, Text, useTheme } from '@audius/harmony-native'

type CryptoBalanceSectionProps = {
  title: string
  tokenInfo: TokenInfo
  name?: string
  amount: string
}

export const CryptoBalanceSection = ({
  title,
  tokenInfo,
  name,
  amount
}: CryptoBalanceSectionProps) => {
  const { logoURI } = tokenInfo
  const { iconSizes } = useTheme()
  const iconSize = iconSizes['4xl']

  return (
    <Flex gap='m'>
      {/* Header */}
      <Text variant='title' size='l'>
        {title}
      </Text>

      {/* Amount and token info */}
      <Flex row alignItems='center' gap='s'>
        <HexagonalIcon size={iconSize}>
          <Image
            source={{ uri: logoURI }}
            style={{ width: iconSize, height: iconSize }}
          />
        </HexagonalIcon>
        <Flex gap='xs'>
          {name && (
            <Text variant='heading' size='s'>
              {name}
            </Text>
          )}
          <Flex>
            <Flex row gap='xs' alignItems='center'>
              <Text variant='title' size='l'>
                {amount}
              </Text>
              <Text variant='title' size='l' color='subdued'>
                ${tokenInfo.symbol}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}
