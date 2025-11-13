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

export function apiGatewayFetcher(env: string) {
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

  return fetch(`${endpoint}/content/verbose?all=true`, { signal: controller.signal })
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
      const sps = getRegisteredNodes(env)
      return sps
    })
}

export function useServiceProviders(env: string) {
  const { data: sps, error } = useSWR<SP[]>([env], async () => {
    const sps = await apiGatewayFetcher(env)
    hostSort(sps)
    return sps
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
