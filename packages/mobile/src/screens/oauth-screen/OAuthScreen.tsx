import { useRoute } from '@react-navigation/native'

import { Flex, Text } from '@audius/harmony-native'

import { ImplicitFlowScreen } from './ImplicitFlowScreen'
import { PaymentFlowScreen } from './PaymentFlowScreen'
import { PkceFlowScreen } from './PkceFlowScreen'
import { WriteOnceFlowScreen } from './WriteOnceFlowScreen'
import { useParsedParams } from './hooks/useParsedParams'

export const OAuthScreen = () => {
  const route = useRoute<any>()
  const { search = '' } = route.params ?? {}
  const params = useParsedParams(search)

  if (params.error) {
    return (
      <Flex
        flex={1}
        alignItems='center'
        justifyContent='center'
        p='xl'
        backgroundColor='surface1'
      >
        <Text variant='body' size='m' color='danger' textAlign='center'>
          {params.error}
        </Text>
      </Flex>
    )
  }

  switch (params.flow) {
    case 'payment':
      return <PaymentFlowScreen params={params} />
    case 'pkce':
      return <PkceFlowScreen params={params} />
    case 'write_once':
      return <WriteOnceFlowScreen params={params} />
    case 'implicit':
    default:
      return <ImplicitFlowScreen params={params} />
  }
}
