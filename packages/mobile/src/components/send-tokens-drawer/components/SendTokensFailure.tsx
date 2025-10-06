import {
  useArtistCoin,
  transformArtistCoinToTokenInfo
} from '@audius/common/api'
import { useFormattedTokenBalance } from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import { css } from '@emotion/native'

import {
  Button,
  Flex,
  Text,
  Divider,
  IconClose,
  useTheme,
  TextLink
} from '@audius/harmony-native'
import { BalanceSection } from 'app/components/core'

type SendTokensFailureProps = {
  mint: string
  amount: bigint
  destinationAddress: string
  error: string
  onTryAgain: () => void
  onClose: () => void
}

export const SendTokensFailure = ({
  mint,
  amount,
  destinationAddress,
  error,
  onTryAgain,
  onClose
}: SendTokensFailureProps) => {
  const { color } = useTheme()
  const { data: coin } = useArtistCoin(mint)
  const tokenInfo = coin ? transformArtistCoinToTokenInfo(coin) : undefined
  const { tokenBalanceFormatted } = useFormattedTokenBalance(mint)

  return (
    <Flex gap='xl' ph='xl' pb='xl'>
      <BalanceSection mint={mint} />
      <Divider />
      <Flex gap='l' flex={1}>
        <Text variant='heading' size='s' color='subdued'>
          {walletMessages.sendTokensAmountToSend}
        </Text>
        <Text variant='heading' size='m'>
          {walletMessages.minus}
          {tokenBalanceFormatted} ${tokenInfo?.symbol}
        </Text>
      </Flex>

      <Divider />

      <Text variant='heading' size='s' color='subdued'>
        {walletMessages.sendTokensDestinationAddress}
      </Text>
      <Text variant='body' numberOfLines={1} ellipsizeMode='middle'>
        {destinationAddress}
      </Text>

      {error ? (
        <Flex row gap='s' alignItems='center'>
          <Flex
            borderRadius='circle'
            style={css({ backgroundColor: color.status.error })}
            w='unit4'
            h='unit4'
            alignItems='center'
            justifyContent='center'
          >
            <IconClose size='2xs' color='white' />
          </Flex>
          <Text variant='body' size='l'>
            {walletMessages.error}
          </Text>
          <TextLink onPress={onTryAgain}>
            <Text variant='body' color='accent' size='l'>
              {walletMessages.tryAgain}
            </Text>
          </TextLink>
        </Flex>
      ) : null}

      <Button variant='secondary' fullWidth onPress={onClose}>
        {walletMessages.close}
      </Button>
    </Flex>
  )
}
