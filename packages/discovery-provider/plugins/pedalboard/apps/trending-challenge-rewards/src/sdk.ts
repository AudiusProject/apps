import {
  AntiAbuseOracleSelector,
  Configuration,
  SolanaRelayWalletAdapter,
  SolanaClient,
  SolanaRelay,
  sdk
} from '@audius/sdk'

const makeAAOSelector = () =>
  new AntiAbuseOracleSelector({
    endpoints: ['https://discoveryprovider.audius.co'],
    registeredAddresses: ['0x9811BA3eAB1F2Cd9A2dFeDB19e8c2a69729DC8b6']
  })

const makeSolanaRelay = (relayNode: string) =>
  new SolanaRelay(
    new Configuration({
      basePath: '/solana',
      headers: {
        'Content-Type': 'application/json'
      },
      middleware: [
        {
          pre: async (context) => {
            const endpoint = relayNode
            const url = `${endpoint}${context.url}`
            return { url, init: context.init }
          }
        }
      ]
    })
  )

const makeSolanaClient = (
  solanaRelay: SolanaRelay,
  solanaRpcEndpoint: string
) => {
  const solanaWalletAdapter = new SolanaRelayWalletAdapter({
    solanaRelay
  })
  return new SolanaClient({
    solanaWalletAdapter,
    rpcEndpoints: [solanaRpcEndpoint]
  })
}

export const audiusSdk = ({
  apiKey,
  apiSecret,
  environment,
  solanaRpcEndpoint,
  solanaRelayNode
}: {
  apiKey: string
  apiSecret: string
  environment: 'development' | 'staging' | 'production'
  solanaRpcEndpoint?: string
  solanaRelayNode: string
}) => {
  const solanaRelay = makeSolanaRelay(solanaRelayNode)
  const solanaClient = solanaRpcEndpoint
    ? makeSolanaClient(solanaRelay, solanaRpcEndpoint)
    : undefined
  return sdk({
    appName: 'trending-challenge-rewards',
    apiKey,
    apiSecret,
    environment,
    services: {
      solanaRelay,
      solanaClient,
      antiAbuseOracleSelector: makeAAOSelector()
    }
  })
}
