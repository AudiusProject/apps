import { HTTPQuery, querystring } from '@audius/sdk'

const DEFAULT_TIMEOUT_MS = 3000
export const TIMED_OUT_ERROR = 'Request Timed Out'

const API = import.meta.env.VITE_API

type ApiFetchOptions = RequestInit & {
  queryParams?: HTTPQuery
}

export const apiFetch = async (
  endpoint: string,
  options: ApiFetchOptions = {}
) => {
  let url = `${API}/${endpoint}`
  if (options.queryParams) {
    url += `?${querystring(options.queryParams)}`
  }
  const res = await fetch(url, options)
  return res.json()
}

export const fetchWithTimeout = async (
  url: string,
  timeout: number = DEFAULT_TIMEOUT_MS
) => {
  const timeoutPromise = new Promise((_resolve, reject) => {
    setTimeout(() => reject(new Error(`${TIMED_OUT_ERROR}:${url}`)), timeout)
  })

  const res = (await Promise.race([fetch(url), timeoutPromise])) as Response
  if (!res.ok) {
    throw new Error(res.statusText)
  }
  return res.json()
}

export const withTimeout = async (
  asyncCall: () => Promise<any>,
  timeout: number = DEFAULT_TIMEOUT_MS
) => {
  const timeoutPromise = new Promise((_resolve, reject) => {
    setTimeout(() => reject(new Error(`${TIMED_OUT_ERROR}`)), timeout)
  })

  const res = await Promise.race([asyncCall, timeoutPromise])
  return res
}
