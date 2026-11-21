import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  CancelTokenSource
} from 'axios'
import semver from 'semver'

import { promiseFight } from './promiseFight'
import type { Nullable } from './types'
import { Utils } from './utils'

export type ServiceName = string
export interface ServiceWithEndpoint {
  endpoint: string
  spID?: string
  owner: string
  delegateOwnerWallet: string
}
export type Service = ServiceName | ServiceWithEndpoint

interface Request {
  id?: string
  url: string
}

interface AxiosConfig {
  timeout?: number
  headers?: object
}

export interface Timing {
  request: Request
  response: AxiosResponse | null
  millis: number | null
}

async function timeRequest(
  request: Request,
  timeout?: number | null,
  headers?: object | null
): Promise<Timing> {
  const startTime = new Date().getTime()
  const config: AxiosConfig = {}
  if (timeout !== null && timeout !== undefined) {
    config.timeout = timeout
  }
  if (headers) config.headers = headers
  let response
  try {
    response = await axios.get(request.url, config)
  } catch (e) {
    console.debug(`Error with request for ${request.url}: ${e}`)
    return { request, response: null, millis: null }
  }
  const millis = new Date().getTime() - startTime
  return { request, response, millis }
}

interface SortServiceTimingsConfig {
  serviceTimings: Timing[]
  sortByVersion: boolean
  currentVersion?: string | null
  equivalencyDelta?: number | null
}

function sortServiceTimings({
  serviceTimings,
  sortByVersion,
  currentVersion = null, // only required if `sortByVersion` = false
  equivalencyDelta = null
}: SortServiceTimingsConfig) {
  return serviceTimings.sort((a, b) => {
    if (a.response == null) return 1
    if (b.response == null) return -1

    const aVersion = a.response.data.data.version
    const bVersion = b.response.data.data.version

    if (sortByVersion) {
      if (semver.gt(aVersion, bVersion)) return -1
      if (semver.lt(aVersion, bVersion)) return 1
    } else if (!sortByVersion && currentVersion) {
      if (
        semver.gt(currentVersion, aVersion) &&
        semver.gt(currentVersion, bVersion)
      ) {
        if (semver.gt(aVersion, bVersion)) return -1
        if (semver.lt(aVersion, bVersion)) return 1
      } else if (semver.gt(currentVersion, aVersion)) {
        return 1
      } else if (semver.gt(currentVersion, bVersion)) {
        return -1
      }
    }

    const delta = (a.millis ?? 0) - (b.millis ?? 0)
    if (equivalencyDelta !== null && delta < equivalencyDelta) {
      return 1 - 2 * Math.random()
    }
    return delta
  })
}

interface TimeRequestsConfig {
  requests: Request[]
  sortByVersion?: boolean
  filterNonResponsive?: boolean
  currentVersion?: string | null
  timeout?: number | null
  equivalencyDelta?: number | null
  headers?: object | null
}

async function timeRequests({
  requests,
  sortByVersion = false,
  currentVersion = null, // only required if `sortByVersion` = false
  filterNonResponsive = false,
  timeout = null,
  equivalencyDelta = null,
  headers = null
}: TimeRequestsConfig) {
  let serviceTimings = await Promise.all(
    requests.map(
      async (request) => await timeRequest(request, timeout, headers)
    )
  )

  if (filterNonResponsive) {
    serviceTimings = serviceTimings.filter((timing) => timing.response !== null)
  }

  return sortServiceTimings({
    serviceTimings,
    currentVersion,
    sortByVersion,
    equivalencyDelta
  })
}

type RequestResponses =
  | { blob: AxiosResponse; url: string }
  | AxiosResponse
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- this is a return type
  | void

async function raceRequests(
  urls: string[],
  callback: (url: string) => void,
  axiosConfig: AxiosRequestConfig,
  timeout: Nullable<number> = 3000,
  timeBetweenRequests = 100,
  validationCheck = (_: AxiosResponse) => true
) {
  const CancelToken = axios.CancelToken

  const sources: CancelTokenSource[] = []
  let hasFinished = false
  const requests = urls.map(async (url, i) => {
    const source = CancelToken.source()
    sources.push(source)

    await Utils.wait(timeBetweenRequests * i)
    if (hasFinished) return
    return await new Promise<RequestResponses>((resolve, reject) => {
      axios({
        method: 'get',
        url,
        cancelToken: source.token,
        ...axiosConfig
      })
        .then((response) => {
          const isValid = validationCheck(response)
          if (isValid) {
            hasFinished = true
            resolve({
              blob: response,
              url
            })
          } else {
            reject(response)
          }
        })
        .catch((thrown) => {
          reject(thrown)
          // no-op.
          // If debugging `axios.isCancel(thrown)`
          // can be used to check if the throw was from a cancel.
        })
    })
  })
  if (timeout !== null) {
    requests.push(Utils.wait(timeout))
  }
  let response
  let errored: AxiosResponse[]
  try {
    const { val, errored: e } = await promiseFight<
      RequestResponses,
      AxiosResponse
    >(requests, true)
    response = val
    errored = e
  } catch (e: any) {
    response = null
    errored = e
  }
  sources.forEach((source) => {
    source.cancel('Fetch already succeeded')
  })

  if (response && 'url' in response && 'blob' in response) {
    callback(response.url)
    return { response: response.blob, errored }
  }

  return { response: null, errored }
}

interface AllRequestsConfig {
  urlMap: Record<string, Service>
  timeout: number
  validationCheck: (_: AxiosResponse) => boolean
}

async function allRequests({
  urlMap,
  timeout,
  validationCheck
}: AllRequestsConfig) {
  const urls = Object.keys(urlMap)
  const requests = urls.map(async (url) => {
    return await new Promise<Service | null>((resolve) => {
      axios({
        method: 'get',
        timeout,
        url
      })
        .then((response) => {
          const isValid = validationCheck(response)
          if (isValid) {
            if (typeof urlMap[url] === 'string') {
              resolve(urlMap[url] as Service)
            } else {
              const serviceWithResponse: Service = {
                ...(urlMap[url] as ServiceWithEndpoint),
                ...response.data.data
              }
              resolve(serviceWithResponse)
            }
          } else {
            resolve(null)
          }
        })
        .catch(() => {
          resolve(null)
        })
    })
  })
  const responses = (await Promise.all(requests)).filter(Boolean)
  return responses
}

export {
  timeRequest,
  timeRequests,
  raceRequests,
  allRequests,
  sortServiceTimings
}
