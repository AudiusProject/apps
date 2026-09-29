import { Button, Flex, LoadingSpinner, Text } from '@audius/harmony'

export const CoinflowSessionStatus = ({
  isError,
  isFetching,
  onRetry
}: {
  isError: boolean
  isFetching: boolean
  onRetry: () => void
}) => (
  <Flex direction='column' alignItems='center' gap='l' p='xl'>
    {isError ? (
      <>
        <Text>Unable to connect to Coinflow. Please try again.</Text>
        <Button onClick={onRetry} disabled={isFetching}>
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
