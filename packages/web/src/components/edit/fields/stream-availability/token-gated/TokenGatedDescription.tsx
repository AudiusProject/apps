import { priceAndAudienceMessages as messages } from '@audius/common/messages'
import { Flex, IconQuestionCircle, Hint, Text } from '@audius/harmony'

type TokenGatedDescriptionProps = {
  tokenName: string
  hasTokens: boolean
  isUpload: boolean
}

export const TokenGatedDescription = (props: TokenGatedDescriptionProps) => {
  const { hasTokens, isUpload, tokenName } = props

  const helpContent = !hasTokens ? messages.tokenGatedRadio.noCoins : null

  return (
    <Flex gap='m' direction='column'>
      <Text variant='body'>
        {messages.tokenGatedRadio.description(tokenName)}
      </Text>
      {!hasTokens && isUpload ? (
        <Hint icon={IconQuestionCircle}>{helpContent}</Hint>
      ) : null}
    </Flex>
  )
}
