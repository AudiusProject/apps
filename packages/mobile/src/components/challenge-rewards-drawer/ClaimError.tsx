import { Text } from '@audius/harmony-native'

const messages = {
  claimErrorMessage:
    'Something went wrong while claiming your rewards. Please try again and contact support@audius.co.'
}

/** Renders a generic error message for failed challenge claims */
export const ClaimError = () => {
  return (
    <Text size='s' color='danger'>
      {messages.claimErrorMessage}
    </Text>
  )
}
