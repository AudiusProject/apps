import useSWR from 'swr'
import { getRegisteredNodes } from './utils/contracts'

const prodEndpoint = 'https://api.audius.co'

const stagingEndpoint = 'https://api.staging.audius.co'

export type SP = {
  id: string
  owner: string
  endpoint: string
  blockNumber: string
  delegateWallet: string
  serviceType: string
}

function ethServiceFetcher(env: string) {
  // abort initial ga request in 5 seconds
  const controller = new AbortController()
  const reqTimeout = setTimeout(() => controller.abort(), 5000)

  let endpoint = prodEndpoint
  if (env === 'staging') {
    endpoint = stagingEndpoint
  }

  return fetch(`${endpoint}/validators`, { signal: controller.signal })
    .then(async (resp) => {
      const data = await resp.json()
      const sps = data.data as SP[]
      clearTimeout(reqTimeout)
      return sps
    })
    .catch(async (e) => {
      console.error(`failed to fetch sps from ${endpoint}`, e)
    })
}

export function useServiceProviders(env: string) {
  const { data: sps, error } = useSWR<SP[]>([env], async () => {
    const sps = await ethServiceFetcher(env)
    hostSort(sps)
    return sps
  })
  return { data: sps, error }
}

function hostSort(sps: SP[]) {
  const hostSortKey = (sp: SP) =>
    new URL(sp.endpoint).hostname.split('.').reverse().join('.')
  sps.sort((a, b) => (hostSortKey(a) < hostSortKey(b) ? -1 : 1))
}
