export type OAuthFlow = 'pkce' | 'implicit' | 'write_once' | 'payment'

export type ParsedParams = {
  flow: OAuthFlow
  // Auth flows (pkce / implicit / write_once)
  scope: string | null
  apiKey: string | null
  appName: string | null
  responseType: string | null
  codeChallenge: string | null
  codeChallengeMethod: string | null
  tx: string | null
  wallet: string | null
  // Payment flow
  recipient: string | null
  amount: string | null
  mint: string | null
  // Shared
  state: string | null
  redirectUri: string | null
  responseMode: string | null
  error: string | null
}
