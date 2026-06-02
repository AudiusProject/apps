import { Text } from '@audius/harmony'
import { instanceOfPurchaseGate } from '@audius/sdk'

const messages = {
  more: 'Looking for more like this?',
  buy: (isTrack) => `Buy The Full ${isTrack ? 'Song' : 'Album'} On Audius`
}

const PrimaryLabel = ({ streamConditions, isTrack }) => {
  const isPurchaseable =
    streamConditions && instanceOfPurchaseGate(streamConditions)

  return (
    <Text color='default' variant='heading' size='s'>
      {isPurchaseable ? messages.buy(isTrack) : messages.more}
    </Text>
  )
}

export default PrimaryLabel
