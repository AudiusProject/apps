export type InstagramCredentials = {
  code: string
}

export type TwitterCredentials = {
  oauthVerifier: string
  oauthToken: string
}

export type Credentials = (InstagramCredentials | TwitterCredentials) & {
  error?: string
}

export const AUTH_RESPONSE_MESSAGE_TYPE = 'auth-response' as const
