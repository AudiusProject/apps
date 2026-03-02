/**
 * Build the Audius OAuth URL for the WebView.
 * Upload requires write scope.
 */
const OAUTH_URL = 'https://audius.co/oauth/auth'

function randomState(): string {
  const arr = new Uint8Array(20)
  if (typeof global !== 'undefined' && global.crypto && 'getRandomValues' in global.crypto) {
    global.crypto.getRandomValues(arr)
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

export type BuildOAuthUrlParams = {
  scope?: 'read' | 'write'
  redirectUri: string
  state: string
  appName?: string
  apiKey?: string
  responseMode?: 'query' | 'fragment'
  display?: 'popup' | 'fullScreen'
}

export function buildOAuthUrl(params: BuildOAuthUrlParams): string {
  const {
    scope = 'write',
    redirectUri,
    state,
    appName = 'AudiusUploadExample',
    apiKey,
    responseMode = 'query',
    display = 'fullScreen'
  } = params

  const appIdParam = apiKey ? `api_key=${encodeURIComponent(apiKey)}` : `app_name=${encodeURIComponent(appName)}`
  const origin = (() => {
    try {
      const u = redirectUri.replace(/\/$/, '')
      const match = u.match(/^(https?):\/\/([^/]+)/)
      return match ? `${match[1]}://${match[2]}` : 'http://localhost'
    } catch {
      return 'http://localhost'
    }
  })()
  return `${OAUTH_URL}?scope=${scope}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}&origin=${encodeURIComponent(origin)}&response_mode=${responseMode}&${appIdParam}&display=${display}`
}

export { randomState, OAUTH_URL }
