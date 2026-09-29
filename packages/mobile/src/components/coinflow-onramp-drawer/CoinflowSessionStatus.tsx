import { Button, Flex, LoadingSpinner, Text } from '@audius/harmony-native'

export const CoinflowSessionStatus = ({
  isError,
  isFetching,
  onRetry
}: {
  isError: boolean
  isFetching: boolean
  onRetry: () => void
}) => (
  <Flex alignItems='center' gap='l' p='xl'>
    {isError ? (
      <>
        <Text>Unable to connect to Coinflow. Please try again.</Text>
        <Button onPress={onRetry} disabled={isFetching}>
          Try Again
        </Button>
      </>
    ) : (
      <>
        <LoadingSpinner />
        <Text>Connecting to Coinflow...</Text>
      </>
    )}
  </Flex>
)
