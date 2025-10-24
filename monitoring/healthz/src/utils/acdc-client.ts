import { Interface, ethers } from 'ethers'
import { useEnvironmentSelection } from '../components/EnvironmentSelector'
import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

export function emAddress(isProd: boolean, isStage: boolean) {
  if (isProd) {
    return '0x1cd8a543596d499b9b6e7a6ec15ecd2b7857fd64'
  }
  if (isStage) {
    return '0x1cd8a543596d499b9b6e7a6ec15ecd2b7857fd64'
  }
  return '0x254dffcd3277C0b1660F6d42EFbB754edaBAbC2B'
}

export function useEthersProvider() {
  const isStage = useLocation().pathname.indexOf('/stage') == 0
  const isDev = useLocation().pathname.indexOf('/dev') == 0

  let rpcEndpoint = 'https://discoveryprovider.audius.co/chain'
  if (isStage) {
    rpcEndpoint = 'https://discoveryprovider.staging.audius.co/chain'
  }
  if (isDev) {
    rpcEndpoint = 'http://audius-discovery-provider-1/chain'
  }

  return useMemo(() => {
    return new ethers.JsonRpcProvider(rpcEndpoint, undefined, {
      // lua script doesn't handle multiple RPCs in one request atm
      batchMaxSize: 1,
    })
  }, [rpcEndpoint])
}

export function useSomeDiscoveryEndpoint() {
  const isProd = useLocation().pathname.indexOf('/prod') == 0
  const isStage = useLocation().pathname.indexOf('/stage') == 0

  if (isProd) {
    return 'https://discoveryprovider.audius.co'
  }
  if (isStage) {
    ;('https://discoveryprovider.staging.audius.co')
  }
  return 'http://audius-discovery-provider-1'
}

export function useSomeContentEndpoint() {
  const isProd = useLocation().pathname.indexOf('/prod') == 0
  const isStage = useLocation().pathname.indexOf('/stage') == 0

  if (isProd) {
    return 'https://creatornode2.audius.co'
  }
  if (isStage) {
    return 'https://creatornode12.staging.audius.co'
  }
  return 'http://audius-creator-node-1'
}

const iface = new Interface([
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: '_userId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: '_signer',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: '_entityType',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_entityId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: '_metadata',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: '_action',
        type: 'string',
      },
    ],
    name: 'ManageEntity',
    type: 'event',
  },
])

export function decodeEmLog(data: string) {
  return iface.decodeEventLog('ManageEntity', data)
}
