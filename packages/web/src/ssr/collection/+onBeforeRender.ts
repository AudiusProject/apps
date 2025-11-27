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
  const { handle, slug } = pageContext.routeParams

  try {
    const requestPath = `v1/full/playlists/by_permalink/${handle}/${slug}`
    const requestUrl = `${getApiUrl()}/${requestPath}`

    const res = await fetch(requestUrl)
    if (res.status !== 200) {
      throw new Error(requestUrl)
    }

    const json = await res.json()
    if (!json.data || json.data.length === 0) {
      throw new Error(`No playlist found for handle: ${handle}, slug: ${slug}`)
    }
    const apiCollection = json.data[0]

    const { user, ...collection } = apiCollection

    return {
      pageContext: {
        pageProps: {
          collection,
          user
        }
      }
    }
  } catch (e) {
    console.error(
      'Error fetching collection for collection page SSR',
      'handle',
      handle,
      'slug',
      slug,
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
