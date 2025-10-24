import useSWR from 'swr'
import { getRegisteredNodes } from './utils/contracts'

const prodEndpoint =
  'https://api.audius.co'

const stagingEndpoint =
  'https://api.staging.audius.co'

const devEndpoint = 'http://audius-discovery-provider-1/core/nodes'

export type SP = {
  delegateOwnerWallet: string
  endpoint: string
  isRegistered: boolean
  type: {
    id: string
  }

  health?: any
  apiJson?: any
  discoveryHealth?: any
}

export function apiGatewayFetcher(
  env: string,
  type: 'content' | 'discovery'
) {
  // abort initial ga request in 5 seconds
  const controller = new AbortController()
  const reqTimeout = setTimeout(() => controller.abort(), 5000)

  let endpoint = prodEndpoint
  if (env === 'staging') {
    endpoint = stagingEndpoint
  }
  if (env === 'dev') {
    endpoint = devEndpoint
  }

  return fetch(`${endpoint}/${type}/verbose?all=true`, { signal: controller.signal })
    .then(async (resp) => {
      const data = await resp.json()
      const sps = data.data as SP[]
      clearTimeout(reqTimeout)

      const hostSortKey = (sp: SP) =>
        new URL(sp.endpoint).hostname.split('.').reverse().join('.')

      // useful for finding duplicate wallets:
      // const hostSortKey = (sp: SP) => sp.delegateOwnerWallet

      sps.sort((a, b) => (hostSortKey(a) < hostSortKey(b) ? -1 : 1))
      // console.log(sps)
      return sps
    })
    .catch(async (e) => {
      // fallback to chain if GA is down
      console.warn("falling back to chain rpc to gather SPs", e)
      const sps = getRegisteredNodes(env, type)
      return sps
    })
}

export function useServiceProviders(
  env: string,
  type: 'content' | 'discovery' | 'core',
  excludeUnregistered = false
) {
  const { data: sps, error } = useSWR<SP[]>([env, type, excludeUnregistered], async () => {
    let sps
    if (type === 'core') {
      sps = [...(await apiGatewayFetcher(env, 'content')), ...(await apiGatewayFetcher(env, 'discovery'))]
    } else {
      sps = await apiGatewayFetcher(env, type)
    }
    hostSort(sps)
    return excludeUnregistered || type === 'content' ? sps : [...sps, ...unregisteredNodes(env)]
  })
  return { data: sps, error }
}

export function useDiscoveryProviders() {
  return useServiceProviders('prod', 'discovery')
}

export function useContentProviders() {
  return useServiceProviders('prod', 'content')
}

export function hostSort(sps: SP[]) {
  const hostSortKey = (sp: SP) =>
    new URL(sp.endpoint).hostname.split('.').reverse().join('.')
  sps.sort((a, b) => (hostSortKey(a) < hostSortKey(b) ? -1 : 1))
}

function unregisteredNodes(env: string) {
  if (env === 'prod') {
    return [
      {
        delegateOwnerWallet: '0x32bF5092890bb03A45bd03AaeFAd11d4afC9a851',
        endpoint: 'https://discoveryprovider4.audius.co',
        isRegistered: false,
        type: { id: 'discovery-node' },
      },
      {
        delegateOwnerWallet: 'Metabase (no wallet)',
        endpoint: 'https://insights.audius.co',
        isRegistered: false,
        type: { id: 'discovery-node' },
      },
    ]
  } else if (env === 'staging') {
    return [
      {
        delegateOwnerWallet: '0xb1C931A9ac123866372CEbb6bbAF50FfD18dd5DF',
        endpoint: 'https://discoveryprovider4.staging.audius.co',
        isRegistered: false,
        type: { id: 'discovery-node' },
      },
      {
        delegateOwnerWallet: 'DDEX (no wallet)',
        endpoint: 'https://audius-stage.ddex.audius.co',
        isRegistered: false,
        type: { id: 'discovery-node' },
      },
    ]
  }
  return []
}
