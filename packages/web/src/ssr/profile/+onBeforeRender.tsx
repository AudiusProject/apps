import type { PageContextServer } from 'vike/types'

// Simple helper to get API URL without importing services/env which pulls in SDK dependencies
const getApiUrl = () => {
  const env = process.env.VITE_ENVIRONMENT || 'development'
  switch (env) {
    case 'production':
      return 'https://api.audius.co'
    case 'staging':
      return 'https://api.staging.audius.co'
    case 'development':
    default:
      return process.env.VITE_API_URL || 'http://audius-api'
  }
}

export async function onBeforeRender(pageContext: PageContextServer) {
  const { handle } = pageContext.routeParams

  try {
    const requestPath = `v1/full/users/handle/${handle}`
    const requestUrl = `${getApiUrl()}/${requestPath}`

    const res = await fetch(requestUrl)
    if (res.status !== 200) {
      throw new Error(requestUrl)
    }

    const json = await res.json()
    if (!json.data || json.data.length === 0) {
      throw new Error(`No user found for handle: ${handle}`)
    }
    const user = json.data[0]

    return {
      pageContext: {
        pageProps: { user }
      }
    }
  } catch (e) {
    console.error(
      'Error fetching user for profile page SSR',
      'handle',
      handle,
      'error',
      e
    )
    return {
      pageContext: {
        pageProps: {}
      }
    }
  }
}
