import crossFetch from 'cross-fetch'

const fetch = (input: RequestInfo | URL, init?: RequestInit) =>
  crossFetch(input, {
    ...(init ?? {}),
    credentials:
      'credentials' in Request.prototype ? init?.credentials : undefined
  })

// Export Headers, Request, Response from global for browser compatibility
// cross-fetch doesn't export these in browser environments
export const Headers = globalThis.Headers
export const Request = globalThis.Request
export const Response = globalThis.Response
export default fetch
