import { USDC } from '@audius/fixed-decimal'
import { Button, Text } from '@audius/harmony'
import { instanceOfPurchaseGate } from '@audius/sdk'

import { getCopyableLink } from '../../util/shareUtil'

const messages = {
  listen: 'Listen on Audius',
  buy: 'Buy'
}

const ListenOnAudiusCTA = ({ audiusURL, streamConditions }) => {
  const onClick = () => {
    window.open(getCopyableLink(audiusURL), '_blank')
  }
  const isPurchaseable =
    streamConditions && instanceOfPurchaseGate(streamConditions)

  return (
    <Button
      color={isPurchaseable ? 'lightGreen' : undefined}
      fullWidth
      onClick={onClick}
    >
      <Text variant='title' size='l'>
        {isPurchaseable
          ? `${messages.buy} $${USDC(
              streamConditions.usdcPurchase.price / 100
            ).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`
          : messages.listen}
      </Text>
    </Button>
  )
}

export default ListenOnAudiusCTA
